---
title: How to Run a Minecraft Bedrock Server with Docker
description: Run a Minecraft Bedrock Dedicated Server with Docker Compose and itzg/minecraft-bedrock-server - UDP ports, allowlist, operators by XUID, console commands, addons and updates.
head:
  - - meta
    - name: keywords
      content: bedrock server docker, minecraft bedrock docker, bedrock dedicated server docker compose, itzg minecraft-bedrock-server, bedrock server linux, minecraft bedrock server setup, bedrock allowlist, bedrock xuid
---

# How to Run a Minecraft Bedrock Server with Docker

Bedrock Edition (Windows, consoles, phones and tablets) uses a different server from Java:
the official Bedrock Dedicated Server. This guide runs it with Docker Compose using
[`itzg/minecraft-bedrock-server`](https://github.com/itzg/docker-minecraft-bedrock-server),
which downloads the server, keeps it updated and turns its config into environment variables.

**You need:** a machine with Docker and the Compose plugin, and around 1–2 GB of free RAM.

## 1. Create the compose file

```bash
mkdir bedrock && cd bedrock
```

```yaml
# compose.yaml
services:
  bds:
    image: itzg/minecraft-bedrock-server
    container_name: bds
    tty: true
    stdin_open: true
    restart: unless-stopped
    ports:
      - "19132:19132/udp"
    environment:
      EULA: "TRUE"
      VERSION: LATEST
      SERVER_NAME: "My Bedrock Server"
      GAMEMODE: survival
      DIFFICULTY: normal
      MAX_PLAYERS: 10
    volumes:
      - ./data:/data
```

::: warning The port is UDP
Bedrock speaks UDP, not TCP. The `/udp` suffix in `19132:19132/udp` is required; without it
Docker publishes a TCP port and nobody can connect.
:::

## 2. Start it

```bash
docker compose up -d
docker compose logs -f bds
```

When the log shows `Server started.`, open Minecraft → **Play** → **Servers** → **Add
Server**, and enter the host's IP with port `19132`.

## 3. Configure the server

The image writes `server.properties` from environment variables. The useful ones:

| Variable | Example | Notes |
| --- | --- | --- |
| `SERVER_NAME` | `"My Bedrock Server"` | Shown in the server list |
| `GAMEMODE` | `survival`, `creative`, `adventure` | |
| `DIFFICULTY` | `peaceful`, `easy`, `normal`, `hard` | |
| `LEVEL_NAME` | `Bedrock level` | World folder name under `data/worlds/` |
| `LEVEL_SEED` | `"123456"` | Only used when the world is first created |
| `MAX_PLAYERS` | `10` | |
| `ALLOW_CHEATS` | `"true"` | Enables commands for operators |
| `ONLINE_MODE` | `"true"` | Requires Xbox Live sign-in (keep it on) |
| `VIEW_DISTANCE` / `TICK_DISTANCE` | `32` / `4` | Lower them on small machines |

Apply changes with `docker compose up -d`.

## 4. Allowlist and operators

Restrict who can join with the allowlist, using gamertags:

```yaml
      ALLOW_LIST: "true"
      ALLOW_LIST_USERS: "PlayerOne,PlayerTwo"
```

Permissions (`OPS`, `MEMBERS`, `VISITORS`) take **XUIDs**, the numeric Xbox account ID,
not gamertags. The easiest way to get one is to have the player join once and read it from
the log:

```bash
docker compose logs bds | grep "Player connected"
# Player connected: PlayerOne, xuid: 2535400000000000
```

```yaml
      OPS: "2535400000000000"
```

## 5. Run console commands

Bedrock has no RCON. The image includes `send-command`, which writes to the server console:

```bash
docker exec bds send-command gamerule dofiretick false
docker exec bds send-command say Restarting in 5 minutes
```

Or attach to the console with `docker attach bds` and leave with `Ctrl-p` `Ctrl-q`.

## 6. Addons (behavior and resource packs)

Copy the extracted packs into the data folder:

```txt
data/
├─ behavior_packs/<pack>/
├─ resource_packs/<pack>/
└─ worlds/<level-name>/
   ├─ world_behavior_packs.json
   └─ world_resource_packs.json
```

Each `world_*_packs.json` lists the packs to enable by the `uuid` and `version` from the
pack's `manifest.json`:

```json
[{ "pack_id": "5a1b...-uuid-from-manifest", "version": [1, 0, 0] }]
```

Restart the container after adding packs.

## 7. Updates

With `VERSION: LATEST` (the default), the image checks for a new Bedrock release on every
start, so updating is a restart:

```bash
docker compose restart bds
```

Bedrock clients can only join a server on the same version, so keep it on `LATEST` unless
you control every client. Back up `./data` before updating.

## Let Java players in too

A Bedrock server only accepts Bedrock clients. To mix both, run a
[Java server](/guides/minecraft-server-docker-compose) with the
[Geyser](https://geysermc.org/) and Floodgate plugins instead: Bedrock players connect to
it over UDP `19132`, Java players over TCP `25565`.

## Common problems

**The server doesn't show up / can't connect.** Confirm the port is published as UDP
(`docker compose ps` shows `19132/udp`), the firewall allows `19132/udp`, and your router
forwards UDP, not only TCP.

**Two Bedrock servers on one machine.** Each needs its own UDP port, e.g. `19133:19132/udp`
for the second one. Unlike Java, Bedrock can't be routed by hostname on a shared port.

## Manage Bedrock and Java servers from one panel

[Minepanel](/) is a free, open-source web panel that runs this same Bedrock image, next to
Java servers, from one UI: create the server from a form, edit permissions and the
allowlist, import `.mcaddon` / `.mcpack` files, and use the console in the browser.

→ [Install Minepanel](/installation) · [Bedrock in Minepanel](/server-types#bedrock-edition)

## Related guides

- [Run a Java server with Docker Compose](/guides/minecraft-server-docker-compose)
- [Host several Java servers on one port with mc-router](/guides/mc-router-setup)
