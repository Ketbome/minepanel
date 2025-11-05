# Minepanel

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Made with NestJS](https://img.shields.io/badge/Backend-NestJS-red)
![Made with Next.js](https://img.shields.io/badge/Frontend-Next.js-black)
![Docker Hub](https://img.shields.io/docker/pulls/ketbom/minepanel?logo=docker)
![Docker Image Size](https://img.shields.io/docker/image-size/ketbom/minepanel/latest)

Web panel for managing Minecraft servers with Docker.

**Documentation:** [minepanel.ketbome.lat](https://minepanel.ketbome.lat)  
**Docker Hub:** [ketbom/minepanel](https://hub.docker.com/r/ketbom/minepanel)

Uses [itzg/docker-minecraft-server](https://github.com/itzg/docker-minecraft-server) and [itzg/docker-mc-backup](https://github.com/itzg/docker-mc-backup) under the hood.

![Dashboard View](./doc/public/img/Animation.gif)

## Why this exists

I got tired of managing Minecraft servers through terminal and tried several panels that were either too complex or didn't do what I needed. So I made this.

## What it does

- Simple deployment with one command
- Works on x86/ARM (Raspberry Pi, Apple Silicon, etc.)
- Handles multiple servers in separate containers
- Real-time logs with error detection
- Resource monitoring (CPU, RAM)
- Built-in file editor
- Automatic backups
- Supports all server types: Vanilla, Paper, Forge, Fabric, Spigot, Purpur, etc.
- CurseForge modpack installation
- Multi-language (English/Spanish/Dutch)

## Requirements

- Docker & Docker Compose (v2.0+)
- 2GB+ RAM
- Linux, macOS, or Windows with WSL2

## Quick Start

### Option 1: Direct install (recommended)

Create a `docker-compose.yml` file:

```yaml
services:
  minepanel:
    image: ketbom/minepanel:latest
    ports:
      - "${BACKEND_PORT:-8091}:8091"
      - "${FRONTEND_PORT:-3000}:3000"
    environment:
      # Backend Configuration
      - SERVERS_DIR=/app/servers
      - FRONTEND_URL=${FRONTEND_URL:-http://localhost:3000}
      - JWT_SECRET=${JWT_SECRET} # Generate with: openssl rand -base64 32
      - CLIENT_PASSWORD=${CLIENT_PASSWORD:-admin}
      - CLIENT_USERNAME=${CLIENT_USERNAME:-admin}

      # Frontend Configuration
      - NEXT_PUBLIC_FILEBROWSER_URL=${NEXT_PUBLIC_FILEBROWSER_URL:-http://localhost:8080}
      - NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL:-http://localhost:8091}
      - NEXT_PUBLIC_DEFAULT_LANGUAGE=${NEXT_PUBLIC_DEFAULT_LANGUAGE:-en}
    volumes:
      - ${SERVERS_DIR:-./servers}:/app/servers
      - /var/run/docker.sock:/var/run/docker.sock
      - ${DATA_DIR:-./data}:/app/data
    restart: always

  filebrowser:
    image: hurlenko/filebrowser
    ports:
      - "${FILEBROWSER_PORT:-8080}:8080"
    volumes:
      - ${SERVERS_DIR:-./servers}:/data
      - ${FILEBROWSER_DIR:-./filebrowser-data}:/config
    environment:
      - FB_BASEURL=/
    restart: always
```

Then:

```bash
mkdir -p servers filebrowser-data data
docker compose up -d
```

### Option 2: Clone the repo

```bash
git clone https://github.com/Ketbome/minepanel.git
cd minepanel
mkdir -p servers filebrowser-data data
docker compose up -d
```

### Option 3: Split services (for nginx-proxy / Traefik)

If you're using **nginx-proxy** or **Traefik** with automatic SSL, there's a split version that separates frontend and backend:

```bash
git clone https://github.com/Ketbome/minepanel.git
cd minepanel
mkdir -p servers filebrowser-data data
docker compose -f docker-compose.split.yml up -d
```

This setup exposes:

- Backend on `9090`
- Frontend on `3000`
- Filebrowser on `8080`

#### Example with nginx-proxy + Let's Encrypt

Add these to each service in `docker-compose.split.yml`:

```yaml
networks:
  default:
    name: ngnix
    external: true

services:
  frontend:
    image: ketbom/minepanel-frontend:latest
    expose:
      - 3000
    environment:
      - VIRTUAL_HOST=minepanel.yourdomain.com
      - VIRTUAL_PORT=3000
      - LETSENCRYPT_HOST=minepanel.yourdomain.com
      - LETSENCRYPT_EMAIL=your-email@example.com
    # ... rest of config

  backend:
    image: ketbom/minepanel-backend:latest
    expose:
      - 8091
    environment:
      - VIRTUAL_HOST=api.yourdomain.com
      - VIRTUAL_PORT=8091
      - LETSENCRYPT_HOST=api.yourdomain.com
      - LETSENCRYPT_EMAIL=your-email@example.com
    # ... rest of config

  filebrowser:
    image: hurlenko/filebrowser
    expose:
      - 8080
    environment:
      - VIRTUAL_HOST=files.yourdomain.com
      - VIRTUAL_PORT=8080
      - LETSENCRYPT_HOST=files.yourdomain.com
      - LETSENCRYPT_EMAIL=your-email@example.com
    # ... rest of config
```

Put all services on the same network as nginx-proxy.

### Access

- **Web Panel**: http://localhost:3000
- **Filebrowser**: http://localhost:8080

**Default login:** `admin` / `admin` (change this after first login)

#### Remote Access (from outside your network)

If you want to access the panel from outside your local network, you'll need to use your server's public IP address or DNS name. Always use the protocol prefix:

- **Web Panel**: `http://your-server-ip:3000` or `https://your-domain.com`
- **Filebrowser**: `http://your-server-ip:8080` or `https://files.your-domain.com`

**Important - Update environment variables:**

You MUST update these variables in your `docker-compose.yml` to match your server's address:

```yaml
environment:
  # Backend - CRITICAL: Controls CORS
  - FRONTEND_URL=http://your-server-ip:3000 # or https://your-domain.com

  # Frontend - Must point to your server's address
  - NEXT_PUBLIC_BACKEND_URL=http://your-server-ip:8091 # or https://api.your-domain.com
  - NEXT_PUBLIC_FILEBROWSER_URL=http://your-server-ip:8080 # or https://files.your-domain.com
```

**Notes:**

- Replace `your-server-ip` with your server's public IP address
- Replace `your-domain.com` with your domain name (if you have one)
- Always include `http://` or `https://` at the beginning
- `FRONTEND_URL` is critical - it controls CORS in the backend
- For production use, it's highly recommended to use HTTPS with a reverse proxy (nginx-proxy, Traefik, Caddy, etc.)
- Make sure the ports are open in your firewall/router
- After changing these variables, restart the containers: `docker compose restart`

### Filebrowser setup

First time running Filebrowser, check the logs for the auto-generated password:

```bash
docker compose logs filebrowser
```

Look for:

```
filebrowser  | 2024/10/24 12:34:56 Admin credentials: admin / <generated-password>
```

Steps:

1. Copy that password
2. Login to http://localhost:8080 with `admin` and that password
3. Change it to something secure

**Lost the logs?** Delete the filebrowser database and restart:

```bash
docker compose down
rm -rf filebrowser-data/filebrowser.db
docker compose up -d
docker compose logs filebrowser
```

## Database

Minepanel uses SQLite for data persistence. The database file is stored at `./data/minepanel.db`.

**Backup your data:**

```bash
# Backup
cp data/minepanel.db data/minepanel.db.backup

# Restore
cp data/minepanel.db.backup data/minepanel.db
docker compose restart minepanel
```

**Reset database:**

```bash
docker compose down
rm -rf data/minepanel.db
docker compose up -d
```

## How it works

Minepanel runs in a single container with:

- Backend (NestJS) on port 8091
- Frontend (Next.js) on port 3000
- SQLite database for data persistence
- Filebrowser for file management

The backend talks to Docker through the socket to create and manage server containers. Each Minecraft server runs in its own isolated container.

## Update

```bash
docker pull ketbom/minepanel:latest
docker compose up -d
```

## Useful commands

```bash
# Logs
docker compose logs -f minepanel

# Restart
docker compose restart minepanel

# Stop
docker compose down

# Shell access
docker compose exec minepanel sh
```

## Documentation

Full docs at: [minepanel.ketbome.lat](https://minepanel.ketbome.lat)

- [Getting Started](https://minepanel.ketbome.lat/getting-started)
- [Installation](https://minepanel.ketbome.lat/installation)
- [Configuration](https://minepanel.ketbome.lat/configuration)
- [Features](https://minepanel.ketbome.lat/features)
- [Architecture](https://minepanel.ketbome.lat/architecture)
- [API Reference](https://minepanel.ketbome.lat/api)
- [Development](https://minepanel.ketbome.lat/development)
- [FAQ](https://minepanel.ketbome.lat/faq)

### Run docs locally

```bash
cd doc
npm install
npm run docs:dev
```

Then visit http://localhost:5173

## Development

To modify or build from source:

```bash
# Run locally
cd backend && npm install && npm run start:dev
cd frontend && npm install && npm run dev

# Build custom image
docker build -t minepanel:custom .

# Build for multiple architectures
docker buildx create --name multiplatform --use --bootstrap
docker buildx build --platform linux/amd64,linux/arm64 -t username/minepanel:latest --push .
```

## Roadmap

### Coming soon

- Better log viewer with filtering and search
- Edit server.properties from the UI
- Reverse proxy config helper
- CurseForge modpack browser

### Planned

- User roles and permissions
- Server templates
- Better metrics/graphs
- Discord webhooks
- Scheduled tasks
- Plugin manager
- World uploader/switcher
- Whitelist/banlist editor

### Maybe

- Multi-server commands
- Resource limits config
- RCON console
- Server comparison
- Config export/import

## Contributing

If you want to help, cool! Bug fixes, features, docs, translations - all welcome.

Check [CONTRIBUTING.md](CONTRIBUTING.md) for details.

- [Report bugs](https://github.com/Ketbome/minepanel/issues/new?labels=bug)
- [Request features](https://github.com/Ketbome/minepanel/issues/new?labels=enhancement)
- Star if you like it
- Fork and PR

## License

MIT - do whatever you want with it.

## Contact

Made by [@Ketbome](https://github.com/Ketbome)

Questions? Open an issue.

---

Made this because I was tired of managing servers through SSH. Hope it helps you too.
