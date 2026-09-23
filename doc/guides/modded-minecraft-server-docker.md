---
title: Modded Minecraft Server with Docker - Forge, Fabric, Modpacks
description: Run Forge, NeoForge and Fabric servers with Docker Compose, install mods from Modrinth automatically, and deploy CurseForge or Modrinth modpacks with itzg/minecraft-server.
head:
  - - meta
    - name: keywords
      content: modded minecraft server docker, forge server docker, fabric server docker, neoforge server docker, modpack server docker, curseforge server docker, modrinth modpack server, AUTO_CURSEFORGE, CF_API_KEY, itzg minecraft modpack
---

# How to Run a Modded Minecraft Server with Docker

[`itzg/minecraft-server`](https://github.com/itzg/docker-minecraft-server) installs the mod
loader for you (Forge, NeoForge or Fabric), can download mods from Modrinth, and can deploy a
full CurseForge or Modrinth modpack from its name alone. This guide covers all three.

If you have never run the image before, start with the
[Docker Compose basics](/guides/minecraft-server-docker-compose): the file layout, `EULA` and
`./data` volume below are the same.

## Pick your loader

| Loader | `TYPE` | Version variable | Good for |
| --- | --- | --- | --- |
| Fabric | `FABRIC` | `FABRIC_LOADER_VERSION` (optional) | Lightweight mods, performance mods, fast updates |
| Forge | `FORGE` | `FORGE_VERSION` (optional) | Classic big modpacks, older versions |
| NeoForge | `NEOFORGE` | `NEOFORGE_VERSION` (optional) | Modern Forge-style packs (1.20.1+) |

`VERSION` is always the Minecraft version. Leave the loader version out to get the latest
loader for that Minecraft version.

::: warning Match the client
Players need the same Minecraft version, the same loader and the same mods as the server.
Pin `VERSION` so a restart never upgrades the server away from your players' clients.
:::

## Fabric with mods from Modrinth

```yaml
# compose.yaml
services:
  mc:
    image: itzg/minecraft-server:latest
    container_name: mc
    tty: true
    stdin_open: true
    restart: unless-stopped
    ports:
      - "25565:25565"
    environment:
      EULA: "TRUE"
      TYPE: FABRIC
      VERSION: "1.21.4"
      MEMORY: 6G
      MODRINTH_PROJECTS: |
        fabric-api
        lithium
        ferrite-core
        chunky
      MODRINTH_DOWNLOAD_DEPENDENCIES: required
    volumes:
      - ./data:/data
```

`MODRINTH_PROJECTS` takes Modrinth slugs (the last part of the project URL). On every start
the image downloads the newest version of each mod that matches your Minecraft version and
loader; `MODRINTH_DOWNLOAD_DEPENDENCIES: required` also pulls in the mods they depend on.
You can pin a mod or pick a channel:

```yaml
      MODRINTH_PROJECTS: |
        fabric-api:0.119.2+1.21.4
        lithium:beta
        datapack:terralith
```

## Forge and NeoForge

```yaml
    environment:
      EULA: "TRUE"
      TYPE: FORGE
      VERSION: "1.20.1"
      MEMORY: 8G
```

```yaml
    environment:
      EULA: "TRUE"
      TYPE: NEOFORGE
      VERSION: "1.21.1"
      MEMORY: 8G
```

Mods that aren't on Modrinth go in `./data/mods/` as `.jar` files; restart the container to
load them.

## Deploy a CurseForge modpack

`TYPE: AUTO_CURSEFORGE` downloads a modpack, installs the right loader, and fetches every
mod. It needs a free CurseForge API key from the
[CurseForge for Studios console](https://console.curseforge.com/).

```yaml
    environment:
      EULA: "TRUE"
      TYPE: AUTO_CURSEFORGE
      CF_API_KEY: ${CF_API_KEY}
      CF_SLUG: all-the-mods-9
      MEMORY: 10G
```

Put the key in a `.env` file next to `compose.yaml`:

```bash
# .env
CF_API_KEY='$2a$10$yourkeyhere...'
```

::: warning Dollar signs in the key
CurseForge keys start with `$2a$10$`. Compose treats `$` as a variable. Keep the key in
`.env` inside single quotes as shown, or, if you write it directly in `compose.yaml`,
double every `$` (`$$2a$$10$$...`).
:::

`CF_SLUG` is the last part of the modpack's URL on curseforge.com. You can use the full page
URL instead with `CF_PAGE_URL`. Without a version, the newest modpack release is installed and
upgraded on each start; pin it with `CF_FILE_ID` or `CF_FILENAME_MATCHER` (part of the file
name, e.g. `1.0.7`) to stay on one release.

## Deploy a Modrinth modpack

Modrinth modpacks need no API key:

```yaml
    environment:
      EULA: "TRUE"
      TYPE: MODRINTH
      MODRINTH_MODPACK: cobblemon-fabric
      MODRINTH_LOADER: fabric
      MEMORY: 8G
```

`MODRINTH_MODPACK` accepts the slug, the project URL, or a local `.mrpack` path. Pin a release
with `MODRINTH_VERSION`. Client-only mods that would crash a server are skipped by a built-in
list; add your own with `MODRINTH_EXCLUDE_FILES`:

```yaml
      MODRINTH_EXCLUDE_FILES: |
        notenoughanimations
        lambdynamiclights
```

## How much memory?

| Server | `MEMORY` |
| --- | --- |
| Fabric + a few performance mods | 3–4G |
| Mid-size modpack (100–200 mods) | 6–8G |
| Kitchen-sink packs (All The Mods, etc.) | 10–12G |

Check the modpack page too: most list a recommended server RAM.

## Java version problems

Mod loaders are sensitive to the Java version. The `latest` image tag follows the newest
Minecraft release, which can be too new for an older pack:

| Minecraft | Image tag |
| --- | --- |
| before 1.18 (Forge) | `itzg/minecraft-server:java8` |
| 1.18 – 1.20.4 | `itzg/minecraft-server:java17` |
| 1.20.5 – 1.21.x | `itzg/minecraft-server:java21` |

Some 1.21 mods still need Java 17 and crash on 21. If the log mentions
`UnsupportedClassVersionError`, `class file version`, or crashes inside a mixin right at
startup, try the tag for the pack's Minecraft version first.

## Common problems

**"Mod X requires Y" and the server stops.** A dependency is missing. Set
`MODRINTH_DOWNLOAD_DEPENDENCIES: required`; if the dependency only exists on CurseForge,
download it into `./data/mods/`.

**Crash mentioning a client-side class (rendering, `net.minecraft.client`).** A client-only
mod got installed. Remove it from `./data/mods/` and add it to the exclude list.

**First start takes forever.** Large modpacks download hundreds of files and generate the
world. Follow `docker compose logs -f mc`; 5–10 minutes is normal the first time.

## Install mods from a search box instead

[Minepanel](/) is a free, open-source web panel built on this same image. Pick Forge, NeoForge
or Fabric from a form, search CurseForge and Modrinth from the **Mods** tab, deploy modpacks,
and upload your own jars, all from the browser.

→ [Install Minepanel](/installation) · [Mods & modpacks in Minepanel](/mods-plugins)

## Related guides

- [Run a Java server with Docker Compose](/guides/minecraft-server-docker-compose)
- [Automatic backups with mc-backup](/guides/minecraft-server-backup-docker)
- [Host several servers on one port with mc-router](/guides/mc-router-setup)
