---
title: Server Types - Minepanel
description: Supported Minecraft server types in Minepanel. Java Edition (Vanilla, Paper, Spigot, Forge, Fabric, Purpur, Folia, CurseForge) and Bedrock Edition configuration.
head:
  - - meta
    - property: og:title
      content: Minecraft Server Types - Minepanel
  - - meta
    - property: og:description
      content: Configure Java Edition (Vanilla, Paper, Forge, Fabric, Purpur) and Bedrock Edition servers with Minepanel.
---

# Server Types

Minepanel supports both **Java Edition** and **Bedrock Edition** servers.

![Server Types](/img/server-types.png)

## Server Editions

| Edition | Image | Default Port | Protocol | Proxy Support |
| ------- | ----- | ------------ | -------- | ------------- |
| Java    | `itzg/minecraft-server` | 25565 | TCP | Yes (mc-router) |
| Bedrock | `itzg/minecraft-bedrock-server` | 19132 | UDP | No |

## How It Works

Minepanel uses Docker images from itzg. When you create a server, it generates the appropriate Docker configuration automatically.

```mermaid
flowchart LR
    A["🎮 Minepanel UI"] -->|"generates"| B["📄 docker-compose.yml"]
    B -->|"runs"| C["🐳 Docker Image"]
    C -->|"creates"| D["⛏️ Minecraft Server"]

    style A fill:#065f46,stroke:#22c55e,color:#fff
    style B fill:#1f2937,stroke:#6b7280,color:#fff
    style C fill:#1e40af,stroke:#3b82f6,color:#fff
    style D fill:#7c2d12,stroke:#f97316,color:#fff
```

::: tip Documentation
- **Java:** [docker-minecraft-server docs](https://docker-minecraft-server.readthedocs.io/)
- **Bedrock:** [minecraft-bedrock-server docs](https://github.com/itzg/docker-minecraft-bedrock-server)
:::

---

## Bedrock Edition

Minecraft Bedrock Edition server for cross-platform play (Windows 10/11, Xbox, PlayStation, Switch, iOS, Android).

### Basic Setup

1. Select **Bedrock** as server edition
2. Choose version (LATEST, PREVIEW, or specific)
3. Configure settings

### Configuration Options

| Option | Variable | Description | Default |
|--------|----------|-------------|---------|
| Version | `VERSION` | Server version | `LATEST` |
| Server Name | `SERVER_NAME` | Server display name | `Dedicated Server` |
| Gamemode | `GAMEMODE` | survival, creative, adventure | `survival` |
| Difficulty | `DIFFICULTY` | peaceful, easy, normal, hard | `easy` |
| Allow Cheats | `ALLOW_CHEATS` | Enable cheats | `false` |
| Max Players | `MAX_PLAYERS` | Maximum players | `10` |
| View Distance | `VIEW_DISTANCE` | Render distance | `32` |
| Tick Distance | `TICK_DISTANCE` | Simulation distance | `4` |
| Online Mode | `ONLINE_MODE` | Xbox Live auth required | `true` |
| White List | `WHITE_LIST` | Enable whitelist | `false` |

### Example Configuration

```yaml
environment:
  EULA: "TRUE"
  VERSION: LATEST
  SERVER_NAME: "My Bedrock Server"
  GAMEMODE: survival
  DIFFICULTY: normal
  MAX_PLAYERS: 20
  ALLOW_CHEATS: "false"
```

### Permissions (XUIDs)

Bedrock uses Xbox User IDs (XUIDs) for permissions:

```bash
# Operators
-e OPS="1234567890,0987654321"

# Members
-e MEMBERS="1234567890"

# Visitors
-e VISITORS="1234567890"
```

::: tip Finding XUIDs
Player XUIDs are logged when they join the server. You can also use online XUID lookup tools.
:::

### Allowlist

```bash
# Enable allowlist with specific players
-e ALLOW_LIST=true
-e ALLOW_LIST_USERS="player1:1234567890,player2:0987654321"
```

### Commands

Bedrock doesn't support RCON. Commands are executed via `send-command`:

```bash
docker exec CONTAINER_NAME send-command gamerule dofiretick false
```

::: warning Command Output
Command output appears in server logs, not as a direct response. Check the Logs tab after executing commands.
:::

---

## Java Edition

### Vanilla

Basic Minecraft server without mods or plugins.

```yaml
environment:
  TYPE: VANILLA
  VERSION: 1.21.4
```

## Fabric

A lightweight modding platform alternative to Forge.

### Basic Setup

1. Select **Fabric** as server type
2. Choose your Minecraft version
3. Optionally specify loader/launcher versions

### Configuration Options

| Option | Variable | Description | Default |
|--------|----------|-------------|---------|
| Loader Version | `FABRIC_LOADER_VERSION` | Fabric loader version | Latest |
| Launcher Version | `FABRIC_LAUNCHER_VERSION` | Fabric launcher version | Latest |
| Custom Launcher | `FABRIC_LAUNCHER` | Path to custom launcher jar | - |
| Launcher URL | `FABRIC_LAUNCHER_URL` | URL to custom launcher | - |
| Force Reinstall | `FABRIC_FORCE_REINSTALL` | Re-install if corrupted | `false` |

### Example Configuration

```yaml
environment:
  TYPE: FABRIC
  VERSION: 1.21.4
  FABRIC_LOADER_VERSION: 0.13.1
  FABRIC_LAUNCHER_VERSION: 0.10.2
```

::: tip Fabric API
Most Fabric mods require the Fabric API mod. Install it easily using [Modrinth](/mods-plugins#modrinth).
:::

## Forge

The most popular mod loader with extensive mod compatibility.

### Configuration Options

| Option | Variable | Description | Default |
|--------|----------|-------------|---------|
| Forge Version | `FORGE_VERSION` | Forge build number | Latest for version |

### Example

```yaml
environment:
  TYPE: FORGE
  VERSION: 1.20.4
  FORGE_VERSION: 43.2.0
```

## Paper

High-performance Spigot fork with plugins support.

### Configuration Options

| Option | Variable | Description | Default |
|--------|----------|-------------|---------|
| Build | `PAPER_BUILD` | Specific Paper build | Latest |
| Channel | `PAPER_CHANNEL` | Release channel | `default` |
| Download URL | `PAPER_DOWNLOAD_URL` | Custom download URL | - |

### Example

```yaml
environment:
  TYPE: PAPER
  VERSION: 1.21.4
  PAPER_BUILD: 120
```

## Spigot

Popular plugin-based server.

### Configuration Options

| Option | Variable | Description | Default |
|--------|----------|-------------|---------|
| Download URL | `SPIGOT_DOWNLOAD_URL` | Custom download URL | - |
| Build from Source | `BUILD_FROM_SOURCE` | Compile from source | `false` |

### Example

```yaml
environment:
  TYPE: SPIGOT
  VERSION: 1.20.4
```

## Bukkit

The original plugin platform.

### Configuration Options

| Option | Variable | Description | Default |
|--------|----------|-------------|---------|
| Download URL | `BUKKIT_DOWNLOAD_URL` | Custom download URL | - |
| Build from Source | `BUILD_FROM_SOURCE` | Compile from source | `false` |

## Purpur

Fork of Paper with additional features.

### Configuration Options

| Option | Variable | Description | Default |
|--------|----------|-------------|---------|
| Build | `PURPUR_BUILD` | Specific Purpur build | Latest |
| Download URL | `PURPUR_DOWNLOAD_URL` | Custom download URL | - |
| Flare Flags | `USE_FLARE_FLAGS` | Use Flare performance flags | `false` |

## Pufferfish

Paper fork focused on performance.

### Configuration Options

| Option | Variable | Description | Default |
|--------|----------|-------------|---------|
| Build | `PUFFERFISH_BUILD` | Specific build | Latest |
| Flare Flags | `USE_FLARE_FLAGS` | Use Flare flags | `false` |

## Folia

Experimental multi-threaded Paper fork.

### Configuration Options

| Option | Variable | Description | Default |
|--------|----------|-------------|---------|
| Build | `FOLIA_BUILD` | Specific build | Latest |
| Channel | `FOLIA_CHANNEL` | Release channel | `default` |
| Download URL | `FOLIA_DOWNLOAD_URL` | Custom URL | - |

## Leaf

Another Paper fork with optimizations.

### Configuration Options

| Option | Variable | Description | Default |
|--------|----------|-------------|---------|
| Build | `LEAF_BUILD` | Specific build | Latest |

## CurseForge Modpacks

Install complete modpacks from CurseForge.

::: warning API Key Required
You need a CurseForge API key. Get one from [CurseForge for Studios](https://console.curseforge.com/).
:::

### Installation Methods

**1. URL Method (easiest):**

```yaml
environment:
  TYPE: AUTO_CURSEFORGE
  CF_API_KEY: your_key
  CF_PAGE_URL: https://www.curseforge.com/minecraft/modpacks/all-the-mods-9/download/5464988
```

**2. Slug + File ID:**

```yaml
environment:
  TYPE: AUTO_CURSEFORGE
  CF_API_KEY: your_key
  CF_SLUG: all-the-mods-9
  CF_FILE_ID: 5464988
```

**3. Auto-select latest:**

```yaml
environment:
  TYPE: AUTO_CURSEFORGE
  CF_API_KEY: your_key
  CF_SLUG: all-the-mods-9
```

### Advanced Options

| Option | Variable | Description | Default |
|--------|----------|-------------|---------|
| Force Sync | `CF_FORCE_SYNCHRONIZE` | Re-download even if exists | `false` |
| Parallel Downloads | `CF_PARALLEL_DOWNLOADS` | Concurrent downloads | `4` |
| Skip Existing | `CF_OVERRIDES_SKIP_EXISTING` | Don't overwrite files | `false` |
| Set Level From | `CF_SET_LEVEL_FROM` | World source: `WORLD_FILE`, `OVERRIDES` | - |
| Force Include | `CF_FORCE_INCLUDE_MODS` | Force download specific mods | - |
| Exclude Mods | `CF_EXCLUDE_MODS` | Exclude specific mods | - |

## Server Type Categories

```mermaid
flowchart LR
    B["🟡 Bedrock"] ~~~ V["🟢 Vanilla"]
    V ~~~ M["🔵 Mods<br/>Forge, Fabric"]
    M ~~~ P["🟣 Plugins<br/>Paper, Spigot"]
    P ~~~ MP["🟠 Modpacks<br/>CurseForge"]

    style B fill:#d97706,stroke:#fbbf24,color:#fff
    style V fill:#065f46,stroke:#22c55e,color:#fff
    style M fill:#1e40af,stroke:#3b82f6,color:#fff
    style P fill:#581c87,stroke:#a855f7,color:#fff
    style MP fill:#7c2d12,stroke:#f97316,color:#fff
```

| Category | Types | Use Case |
|----------|-------|----------|
| **🟡 Bedrock** | BEDROCK | Cross-platform (consoles, mobile, Windows 10/11) |
| **🟢 Vanilla** | VANILLA | Pure Minecraft Java, no modifications |
| **🔵 Mod Loaders** | Forge, Fabric | Client-side mods required |
| **🟣 Plugin Servers** | Paper, Spigot, Purpur, Pufferfish, Folia | Server-side plugins, vanilla clients |
| **🟠 Modpacks** | AUTO_CURSEFORGE | Pre-configured mod collections |

---

## Next Steps

- Learn about [Mods & Plugins Management](/mods-plugins)
- See all [Configuration Options](/configuration)

## External Resources

**Java Edition:**
- [docker-minecraft-server Docs](https://docker-minecraft-server.readthedocs.io/) - Full environment variables reference
- [Server Types Reference](https://docker-minecraft-server.readthedocs.io/en/latest/types-and-platforms/) - All supported server types
- [Mod Platforms](https://docker-minecraft-server.readthedocs.io/en/latest/mods-and-plugins/) - Modrinth, CurseForge, Spiget integration

**Bedrock Edition:**
- [minecraft-bedrock-server GitHub](https://github.com/itzg/docker-minecraft-bedrock-server) - Bedrock server image
- [Bedrock Server Properties](https://minecraft.wiki/w/Server.properties#Bedrock_Edition) - All configuration options

