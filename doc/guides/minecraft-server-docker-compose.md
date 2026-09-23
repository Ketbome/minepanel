---
title: How to Run a Minecraft Server with Docker Compose (Java Edition)
description: Step-by-step guide to running a Minecraft Java server with Docker Compose and itzg/minecraft-server - compose.yaml, memory, Paper/Fabric/Forge, server.properties, RCON console, updates and Java versions.
head:
  - - meta
    - name: keywords
      content: minecraft server docker compose, minecraft docker compose, itzg minecraft-server, minecraft server docker, paper server docker, minecraft java server docker, docker minecraft server setup, rcon-cli
---

# How to Run a Minecraft Server with Docker Compose

This guide sets up a Minecraft Java Edition server with Docker Compose using
[`itzg/minecraft-server`](https://github.com/itzg/docker-minecraft-server), the most widely
used Minecraft image on Docker Hub. By the end you will have a server that survives reboots,
keeps its world on disk, and can be updated with one command.

**You need:** a Linux, macOS or Windows (WSL2) machine with Docker and the Compose plugin
(`docker compose version` should print v2+), and at least 2 GB of free RAM.

## 1. Create the compose file

Create a folder for the server and a `compose.yaml` inside it:

```bash
mkdir minecraft && cd minecraft
```

```yaml
# compose.yaml
services:
  mc:
    image: itzg/minecraft-server:latest
    pull_policy: daily
    container_name: mc
    tty: true
    stdin_open: true
    restart: unless-stopped
    ports:
      - "25565:25565"
    environment:
      EULA: "TRUE"
      TYPE: PAPER
      VERSION: LATEST
      MEMORY: 4G
      TZ: Europe/Madrid
    volumes:
      - ./data:/data
```

What each part does:

| Setting | Why |
| --- | --- |
| `EULA: "TRUE"` | Accepts the [Minecraft EULA](https://www.minecraft.net/eula). The server refuses to start without it. |
| `TYPE` | Server software: `VANILLA` (default), `PAPER`, `PURPUR`, `FABRIC`, `FORGE`, `NEOFORGE`, `SPIGOT`… |
| `VERSION` | Minecraft version. `LATEST` follows the newest release; pin it (e.g. `"1.21.4"`) to stop surprise upgrades. |
| `MEMORY` | Java heap size. Leave ~1 GB of the host for the OS and Docker. |
| `./data:/data` | World, configs, plugins and logs live in `./data` on the host, so they survive container rebuilds. |
| `tty` + `stdin_open` | Lets you attach to the server console. |
| `restart: unless-stopped` | Starts the server again after a crash or host reboot. |

## 2. Start it

```bash
docker compose up -d
docker compose logs -f mc
```

The first start downloads the server jar and generates the world. When the log shows
`Done (X.XXXs)! For help, type "help"`, connect from Minecraft to `localhost` (same machine)
or the host's LAN IP.

The image ships a healthcheck, so `docker compose ps` shows `healthy` once the server
accepts connections.

## 3. Configure server.properties with environment variables

You don't edit `server.properties` by hand: the image writes it from environment variables
on every start. The most common ones:

```yaml
    environment:
      EULA: "TRUE"
      TYPE: PAPER
      MEMORY: 4G
      MOTD: "My §aDocker§r server"
      DIFFICULTY: hard
      MODE: survival
      MAX_PLAYERS: 20
      VIEW_DISTANCE: 10
      SEED: "-4172144997902289642"
      OPS: |
        YourMinecraftName
      ENABLE_WHITELIST: "true"
      WHITELIST: |
        YourMinecraftName
        AFriend
```

Change a value, then apply it with:

```bash
docker compose up -d
```

::: tip
Compose recreates the container when the environment changes. The world in `./data` is
untouched.
:::

## 4. Memory and JVM flags

`MEMORY` sets both the initial and the maximum heap. To split them:

```yaml
      INIT_MEMORY: 1G
      MAX_MEMORY: 4G
```

For Paper and other servers with many players, enable
[Aikar's flags](https://docs.papermc.io/paper/aikars-flags), a tuned set of garbage
collector options:

```yaml
      USE_AIKAR_FLAGS: "true"
```

## 5. Use the server console (RCON)

RCON is enabled by default with a random password, and the image includes `rcon-cli`:

```bash
# one-off command
docker exec mc rcon-cli op YourMinecraftName

# interactive console
docker exec -i mc rcon-cli
```

Because the container runs with `tty` and `stdin_open`, you can also attach to the raw
console with `docker attach mc` and leave with `Ctrl-p` `Ctrl-q` (not `Ctrl-c`, which stops
the server).

## 6. Open the port to the internet

To let friends outside your network join:

1. Allow `25565/tcp` in the host firewall (`sudo ufw allow 25565/tcp` on Ubuntu).
2. Forward `25565/tcp` on your router to the host's LAN IP.
3. Share your public IP, or point a domain's `A` record at it.

Running several servers? Instead of one port per server, put
[mc-router](/guides/mc-router-setup) in front and route by hostname.

## 7. Update the server

With `VERSION: LATEST`, updating is pulling the newest image and restarting:

```bash
docker compose pull
docker compose up -d
```

If you pinned `VERSION`, change it in `compose.yaml` first. Always
[back up the world](/guides/minecraft-server-backup-docker) before a major version jump:
worlds can be upgraded but never downgraded.

## Choosing the right Java version

The `latest` tag ships the Java version the newest Minecraft release needs. Older versions
and some modpacks need an older Java, which you select with the image tag:

| Image tag | Java | Typical use |
| --- | --- | --- |
| `latest`, `java25` | 25 | Newest Minecraft releases |
| `java21` | 21 | Minecraft 1.20.5 – 1.21.x |
| `java17` | 17 | Minecraft 1.18 – 1.20.4, and some 1.21 mods |
| `java8` | 8 | Forge before 1.18 |

```yaml
    image: itzg/minecraft-server:java21
```

A log line like `has been compiled by a more recent version of the Java Runtime (class file
version 65.0)` means the server needs a newer Java: switch to a newer tag.

## Common problems

**The container exits right away.** Check `docker compose logs mc`. The usual cause is a
missing `EULA: "TRUE"` (quotes included).

**Players time out when joining.** The port isn't reachable: check the firewall and router
forward, and that nothing else on the host uses `25565`.

**The server is laggy or gets killed.** `MEMORY` is larger than what the host can spare,
or too small for the modpack. Check `docker stats mc`.

## Skip the YAML: do it from a web panel

Every setting in this guide is what [Minepanel](/) writes for you. It's a free, open-source
web panel that creates and runs `itzg/minecraft-server` containers: pick the server type,
version and memory in a form, and get the console, logs, file manager, backups and mod
installer in the browser.

```bash
git clone https://github.com/Ketbome/minepanel.git
cd minepanel
docker compose up -d
```

→ [Install Minepanel](/installation) · [Supported server types](/server-types)

## Related guides

- [Run a modded server (Forge, Fabric, NeoForge, modpacks)](/guides/modded-minecraft-server-docker)
- [Run a Bedrock server with Docker](/guides/bedrock-server-docker)
- [Host several servers on one port with mc-router](/guides/mc-router-setup)
- [Automatic backups with mc-backup](/guides/minecraft-server-backup-docker)
