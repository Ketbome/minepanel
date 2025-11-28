# Minepanel

![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)
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
      - FRONTEND_URL=${FRONTEND_URL:-http://localhost:3000}
      - JWT_SECRET=${JWT_SECRET} # Generate with: openssl rand -base64 32
      - CLIENT_PASSWORD=${CLIENT_PASSWORD:-admin}
      - CLIENT_USERNAME=${CLIENT_USERNAME:-admin}
      - BASE_DIR=${BASE_DIR:-$PWD}
      # - HOST_LAN_IP=${HOST_LAN_IP} # Optional: Your LAN IP for local network play

      # Frontend Configuration
      - NEXT_PUBLIC_FILEBROWSER_URL=${NEXT_PUBLIC_FILEBROWSER_URL:-http://localhost:8080}
      - NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL:-http://localhost:8091}
      - NEXT_PUBLIC_DEFAULT_LANGUAGE=${NEXT_PUBLIC_DEFAULT_LANGUAGE:-en}
    volumes:
      - ${BASE_DIR:-$PWD}/servers:/app/servers
      - /var/run/docker.sock:/var/run/docker.sock
      - ${BASE_DIR:-$PWD}/data:/app/data
    restart: always

  filebrowser:
    image: filebrowser/filebrowser:latest
    ports:
      - "${FILEBROWSER_PORT:-8080}:80"
    volumes:
      - ${BASE_DIR:-$PWD}/servers:/srv
      - filebrowser-db:/database
    restart: always

volumes:
  filebrowser-db:
```

Then:

```bash
# Start the panel (Docker will create everything automatically)
docker compose up -d
```

### Option 2: Clone the repo

```bash
git clone https://github.com/Ketbome/minepanel.git
cd minepanel
docker compose up -d
```

### Option 3: Split services (for nginx-proxy / Traefik)

If you're using **nginx-proxy** or **Traefik** with automatic SSL, there's a split version that separates frontend and backend:

```bash
git clone https://github.com/Ketbome/minepanel.git
cd minepanel
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
    image: filebrowser/filebrowser:latest
    expose:
      - 80
    environment:
      - VIRTUAL_HOST=files.yourdomain.com
      - VIRTUAL_PORT=80
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

#### LAN Play - Showing Local Network IP

By default, the panel shows your public IP for server connections. If you want players on your local network to see your LAN IP (e.g., `192.168.1.100:25565`) instead, you can configure it manually:

**1. Get your LAN IP:**

```bash
# On Mac
ipconfig getifaddr en0

# On Linux
hostname -I | awk '{print $1}'

# On Windows (PowerShell)
(Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Ethernet").IPAddress
```

**2. Add it to your `docker-compose.yml`:**

Uncomment and set the `HOST_LAN_IP` environment variable:

```yaml
environment:
  - HOST_LAN_IP=192.168.1.100 # Replace with your actual LAN IP
```

**3. Restart the services:**

```bash
docker compose down
docker compose up -d
```

Now when a Minecraft server is running, the panel will show both:

- **Public IP**: For external players (obtained automatically via ipify.org)
- **LAN IP**: For local network players (the IP you configured)

### Filebrowser setup

Default credentials:

- Username: `admin`
- Password: `admin`

**Important:** Change the password after first login!

1. Login to http://localhost:8080
2. Go to Settings (gear icon) → User Management
3. Click on admin user and change the password

**Reset password:** If you forget it, delete the database and restart:

```bash
docker compose down
docker volume rm minepanel_filebrowser-db  # Remove filebrowser volume
docker compose up -d
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

**Creative Commons BY-NC-SA 4.0** - You can use, modify, and share freely, but **NOT for commercial use** without authorization.

For commercial use (sales, paid services, commercial hosting), contact: pablo.moraga.san@gmail.com

## Contact

Made by [@Ketbome](https://github.com/Ketbome)

Questions? Open an issue.

---

Made this because I was tired of managing servers through SSH. Hope it helps you too.
