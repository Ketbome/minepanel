# Minepanel — Minecraft Server Manager for Java & Bedrock

**📖 Documentation: [minepanel.ketbome.com](https://minepanel.ketbome.com)** · [GitHub](https://github.com/Ketbome/minepanel) · [Report an issue](https://github.com/Ketbome/minepanel/issues)

Free, open source, self-hosted web panel to create and operate Minecraft servers (Java and Bedrock) with Docker. A lightweight alternative to Pterodactyl and Aternos: one `docker compose up -d` and you manage Paper, Forge, Fabric, Purpur, Spigot, NeoForge, Bedrock and modpack servers from a modern UI.

Built on top of [itzg/docker-minecraft-server](https://github.com/itzg/docker-minecraft-server).

![Minepanel dashboard](https://minepanel.ketbome.com/img/minepanel.webp)

## Images

| Image | Use |
|---|---|
| `ketbom/minepanel` | All-in-one (backend + frontend in one container) |
| `ketbom/minepanel-backend` + `ketbom/minepanel-frontend` | Split services (default `docker-compose.yml`, best for reverse proxies) |

Tags: `latest` and one tag per release (e.g. `1.12.0`). Multi-arch: `linux/amd64`, `linux/arm64` (Raspberry Pi, Apple Silicon).

## Quick Start

```bash
git clone https://github.com/Ketbome/minepanel.git
cd minepanel
export JWT_SECRET=$(openssl rand -base64 32)
docker compose up -d
```

Open http://localhost:3000 and create the admin account in the first-run setup.

Prefer a single container? Use `docker compose -f docker-compose.single.yml up -d`, or this standalone file:

```yaml
services:
  minepanel:
    image: ketbom/minepanel:latest
    ports:
      - "${BACKEND_PORT:-8091}:8091"
      - "${FRONTEND_PORT:-3000}:3000"
    environment:
      - JWT_SECRET=${JWT_SECRET}                # Required. openssl rand -base64 32
      - FRONTEND_URL=${FRONTEND_URL:-http://localhost:3000}
      - NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL:-http://localhost:8091}
      - NEXT_PUBLIC_DEFAULT_LANGUAGE=${NEXT_PUBLIC_DEFAULT_LANGUAGE:-en}
      - ALLOW_INSECURE_AUTH_COOKIES=${ALLOW_INSECURE_AUTH_COOKIES:-false}
      - BASE_DIR=${BASE_DIR:-$PWD}
    volumes:
      - ${BASE_DIR:-$PWD}/servers:/app/servers
      - ${BASE_DIR:-$PWD}/data:/app/data
      - /var/run/docker.sock:/var/run/docker.sock
    restart: always
```

`BASE_DIR` must be the absolute host path of the folder holding `servers/` and `data/`: the panel mounts the same paths into the Minecraft containers it creates through the Docker socket.

Accessing over plain HTTP by LAN IP and login gets stuck? Set `ALLOW_INSECURE_AUTH_COOKIES=true` (trusted networks only). Full list of variables: [Configuration](https://minepanel.ketbome.com/configuration).

## Features

- **Java & Bedrock** editions from one panel
- **All server types**: Vanilla, Paper, Purpur, Spigot, Forge, NeoForge, Fabric, Quilt, and more
- **Modpacks**: CurseForge, Modrinth and FTB, plus per-server mods, plugins and Bedrock addons
- **Real-time monitoring**: CPU, RAM, players, logs with error detection
- **Console & commands**, RCON, scheduled restarts
- **Backups**: scheduled with retention, local or S3-compatible cloud storage
- **World management**: upload, switch and download worlds
- **mc-router proxy**: many Java servers behind one port, optional sleep-when-idle / wake-on-join
- **Roles & access control**: admin and per-user permissions with invitations and audit log
- **SSO (OIDC)** and SMTP password recovery
- **Discord webhooks** for server events
- **In-panel updates**: release notes and one-click update for admins
- **Multi-language**: EN, ES, NL, DE, FR, PL, RU, PT

## Update

```bash
docker compose pull && docker compose up -d
```

Upgrading from 1.11 or older? Read [Upgrading to 1.12](https://minepanel.ketbome.com/upgrading-to-1-12).

## Requirements

- Docker Engine 20.10+ with Compose v2
- 2 GB RAM for the panel; add what each Minecraft server needs
- Linux, macOS, or Windows with WSL2

## Links

- [Getting Started](https://minepanel.ketbome.com/getting-started)
- [Installation](https://minepanel.ketbome.com/installation)
- [Server Types](https://minepanel.ketbome.com/server-types)
- [Networking & reverse proxy](https://minepanel.ketbome.com/networking)
- [Troubleshooting](https://minepanel.ketbome.com/troubleshooting)
- [FAQ](https://minepanel.ketbome.com/faq)

Created by [@Ketbome](https://github.com/Ketbome). Community license, see [LICENSE](https://github.com/Ketbome/minepanel/blob/main/LICENSE). If Minepanel helps you, a ⭐ on GitHub goes a long way.
