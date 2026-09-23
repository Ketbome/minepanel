---
title: mc-router Setup - Multiple Minecraft Servers on One Port
description: Host several Minecraft Java servers behind port 25565 with itzg/mc-router - DNS records, Docker Compose with static mappings or label auto-discovery, default server and sleep-when-idle auto scaling.
head:
  - - meta
    - name: keywords
      content: mc-router, mc-router setup, multiple minecraft servers one port, minecraft hostname routing, minecraft reverse proxy, minecraft subdomain server, itzg mc-router docker compose, minecraft server same port
---

# mc-router Setup: Multiple Minecraft Servers on One Port

Minecraft Java clients connect to port `25565` by default. Running a second server usually
means a second port (`play.example.com:25566`) that players have to remember.
[`itzg/mc-router`](https://github.com/itzg/mc-router) fixes that: it listens on `25565`,
reads the hostname the player typed, and forwards the connection to the matching server.

```txt
survival.example.com ─┐
creative.example.com ─┼─▶ mc-router :25565 ─┬─▶ survival container
modded.example.com  ──┘                     ├─▶ creative container
                                            └─▶ modded container
```

::: warning Java Edition only
mc-router routes by the hostname in the Java handshake (TCP). Bedrock uses UDP and has no
equivalent, so each [Bedrock server](/guides/bedrock-server-docker) still needs its own port.
:::

## 1. Point the hostnames at your server

Create DNS records that resolve every hostname to the machine running mc-router:

| Type | Name | Value |
| --- | --- | --- |
| `A` | `survival.example.com` | your public IP |
| `A` | `creative.example.com` | your public IP |

Or one wildcard record for all of them: `A  *.mc.example.com → your public IP`.

::: tip Using Cloudflare?
Set these records to **DNS only** (grey cloud). Cloudflare's proxy only handles HTTP(S) and
breaks Minecraft connections.
:::

## 2. Compose with static mappings

The simplest setup lists the routes in the `MAPPING` variable. Only the router publishes a
port; the servers are reached through the Compose network by service name.

```yaml
# compose.yaml
services:
  survival:
    image: itzg/minecraft-server
    restart: unless-stopped
    environment:
      EULA: "TRUE"
      TYPE: PAPER
      MEMORY: 3G
    volumes:
      - ./survival:/data

  creative:
    image: itzg/minecraft-server
    restart: unless-stopped
    environment:
      EULA: "TRUE"
      MODE: creative
      MEMORY: 2G
    volumes:
      - ./creative:/data

  router:
    image: itzg/mc-router
    restart: unless-stopped
    depends_on:
      - survival
      - creative
    ports:
      - "25565:25565"
    environment:
      MAPPING: |
        survival.example.com=survival:25565
        creative.example.com=creative:25565
      DEFAULT: survival:25565
```

`DEFAULT` catches connections whose hostname matches no route, such as players joining by
raw IP. Leave it out to reject them instead.

```bash
docker compose up -d
docker compose logs -f router
```

Players now join `survival.example.com` and `creative.example.com`, both without a port.

## 3. Auto-discovery with Docker labels

Editing `MAPPING` for every new server gets old. With `IN_DOCKER`, mc-router watches the
Docker API and builds routes from container labels, even for containers in other Compose
projects:

```yaml
services:
  router:
    image: itzg/mc-router
    restart: unless-stopped
    ports:
      - "25565:25565"
    environment:
      IN_DOCKER: "true"
    # the image runs as non-root: give it the group that owns the Docker socket
    group_add:
      - "${DOCKER_GID:-999}"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro

  survival:
    image: itzg/minecraft-server
    environment:
      EULA: "TRUE"
    labels:
      mc-router.host: survival.example.com
      mc-router.default: "true"
    volumes:
      - ./survival:/data
```

Find the socket's group ID with `stat -c %g /var/run/docker.sock` and put it in `.env` as
`DOCKER_GID` if it isn't `999`. The router and the servers must share a Docker network; when
a container is attached to several, choose one with the `mc-router.network` label.

| Label | Meaning |
| --- | --- |
| `mc-router.host` | Hostname(s) to route, comma or newline separated |
| `mc-router.port` | Server port inside the container (default `25565`) |
| `mc-router.default` | Use this server for unmatched hostnames |
| `mc-router.network` | Docker network to reach the container on |

::: warning
Mounting the Docker socket gives the container control of Docker on the host, and `:ro`
does not change that. If that matters to you, put a socket proxy in between.
:::

## 4. Sleep idle servers and wake them on join

With label discovery on, mc-router can stop servers nobody is playing on and start them
again when someone connects, which frees RAM when you host many worlds:

```yaml
    environment:
      IN_DOCKER: "true"
      AUTO_SCALE_UP: "true"
      AUTO_SCALE_DOWN: "true"
      AUTO_SCALE_DOWN_AFTER: 10m
      AUTO_SCALE_ASLEEP_MOTD: "Server is asleep. Join to wake it up!"
```

The first player to join wakes the server; mc-router waits about 60 seconds for it to become
reachable. Heavy modpacks can take longer, so the first join may time out: reconnect and it
will be up.

## 5. Useful extras

- **Real player IPs:** set `USE_PROXY_PROTOCOL: "true"` on the router and enable PROXY
  protocol on the backends (e.g. `proxies.proxy-protocol: true` in Paper's
  `config/paper-global.yml`). Without it every player appears to come from the router.
- **Block or allow IP ranges:** `CLIENTS_TO_DENY` / `CLIENTS_TO_ALLOW` take IPs or CIDRs.
- **Metrics:** `METRICS_BACKEND: prometheus` exposes connection metrics.

## Common problems

**Players land on the default server or get disconnected.** The hostname they typed has
no route. Compare it with the routes in `docker compose logs router`; players joining by IP
or through a different domain only match `DEFAULT`.

**Can't connect at all.** Only the router should publish `25565`. If a server container
also maps `25565:25565`, one of them fails to start.

**Auto-discovery sees nothing.** The router can't read the socket (group ID) or isn't on the
same network as the servers.

## Hostname routing without writing compose

[Minepanel](/) runs mc-router for you: set a base domain in **Settings → Network**, turn the
proxy on, and every Java server gets `{server}.mc.example.com` automatically, with per-server
sleep-when-idle and custom hostnames from the UI.

→ [Install Minepanel](/installation) · [Proxy setup in Minepanel](/networking#mc-proxy-router-java-only)

## Related guides

- [Run a Java server with Docker Compose](/guides/minecraft-server-docker-compose)
- [Run a modded server with Docker](/guides/modded-minecraft-server-docker)
