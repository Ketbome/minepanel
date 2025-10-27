# Installation Guide

This guide covers different installation methods for Minepanel, from simple to advanced setups.

## Installation Methods

Choose the method that best fits your needs:

- **[Quick Install](#quick-install)** - Recommended for most users
- **[From Source](#install-from-source)** - Clone the repository
- **[Split Services](#split-services-installation)** - Separate frontend/backend for reverse proxies
- **[Development Setup](#development-setup)** - For contributors and developers

---

## Quick Install

The fastest way to get started. Perfect for trying out Minepanel or running on a local network.

::: warning Platform-Specific Configuration
The configuration differs slightly between operating systems:

**macOS / Linux:**

- Use `SERVERS_DIR=${PWD}/servers`
- Volume mount: `${PWD}/servers:${PWD}/servers`

**Windows:**

- Use `SERVERS_DIR=/app/servers`
- Volume mount: `./servers:/app/servers`

The examples below use the macOS/Linux configuration. If you're on Windows, adjust accordingly.
:::

### Step 1: Create docker-compose.yml

```yaml
services:
  minepanel:
    image: ketbom/minepanel:latest
    ports:
      - "${BACKEND_PORT:-8091}:8091"
      - "${FRONTEND_PORT:-3000}:3000"
    environment:
      # Backend environment variables
      # For Windows, use: /app/servers instead
      - SERVERS_DIR=${PWD}/servers
      - FRONTEND_URL=${FRONTEND_URL:-http://localhost:3000}
      - JWT_SECRET= # JWT_SECRET environment variable is required. Generate one with: openssl rand -base64 32
      - CLIENT_PASSWORD=${CLIENT_PASSWORD:-admin}
      - CLIENT_USERNAME=${CLIENT_USERNAME:-admin}
      # Database
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=${DB_NAME:-minepanel}
      - DB_USER=${DB_USER:-minepanel}
      - DB_PASSWORD=${DB_PASSWORD:-minepanel}
      # Frontend environment variables (loaded at runtime via @next/env)
      - NEXT_PUBLIC_FILEBROWSER_URL=${NEXT_PUBLIC_FILEBROWSER_URL:-http://localhost:8080}
      - NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL:-http://localhost:8091}
      - NEXT_PUBLIC_DEFAULT_LANGUAGE=${NEXT_PUBLIC_DEFAULT_LANGUAGE:-en}
    volumes:
      # For Windows, use: ./servers:/app/servers instead
      - ${PWD}/servers:${PWD}/servers
      - /var/run/docker.sock:/var/run/docker.sock
    depends_on:
      postgres:
        condition: service_healthy
    restart: always

  filebrowser:
    image: hurlenko/filebrowser
    ports:
      - "${FILEBROWSER_PORT:-8080}:8080"
    volumes:
      - ./servers:/data
      - ./filebrowser-data:/config
    environment:
      - FB_BASEURL=/
    restart: always

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=${DB_NAME:-minepanel}
      - POSTGRES_USER=${DB_USER:-minepanel}
      - POSTGRES_PASSWORD=${DB_PASSWORD:-minepanel}
    volumes:
      - ./postgres_data:/var/lib/postgresql/data
    restart: always
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-minepanel}"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### Step 2: Launch

```bash
mkdir -p servers filebrowser-data
docker compose up -d
```

::: tip
Use a `.env` file to customize ports and other settings without modifying docker-compose.yml
:::

---

## Install from Source

Clone the repository for the latest development version or to modify the code.

```bash
# Clone repository
git clone https://github.com/Ketbome/minepanel.git
cd minepanel

# Create required directories
mkdir -p servers filebrowser-data

# Start services
docker compose up -d
```

### Update to Latest

```bash
cd minepanel
git pull origin main
docker compose pull
docker compose up -d
```

---

## Split Services Installation

Use this method if you want to:

- Use a reverse proxy (nginx-proxy, Traefik, Caddy)
- Have separate domains for frontend/backend
- Add SSL certificates with Let's Encrypt
- Scale services independently

### Using docker-compose.split.yml

```bash
git clone https://github.com/Ketbome/minepanel.git
cd minepanel
mkdir -p servers filebrowser-data
docker compose -f docker-compose.split.yml up -d
```

This exposes:

- **Backend**: Port 9090
- **Frontend**: Port 3000
- **Filebrowser**: Port 8080

### With nginx-proxy + Let's Encrypt

Perfect for production deployments with SSL certificates.

#### Step 1: Setup nginx-proxy

First, set up [nginx-proxy](https://github.com/nginx-proxy/nginx-proxy) with Let's Encrypt companion:

```yaml
# nginx-proxy/docker-compose.yml
version: "3"

services:
  nginx-proxy:
    image: nginxproxy/nginx-proxy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/tmp/docker.sock:ro
      - ./certs:/etc/nginx/certs
      - ./vhost:/etc/nginx/vhost.d
      - ./html:/usr/share/nginx/html
    restart: always

  letsencrypt:
    image: nginxproxy/acme-companion
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./certs:/etc/nginx/certs
      - ./vhost:/etc/nginx/vhost.d
      - ./html:/usr/share/nginx/html
      - ./acme:/etc/acme.sh
    environment:
      - DEFAULT_EMAIL=your-email@example.com
    restart: always

networks:
  default:
    name: nginx-proxy
    external: false
```

```bash
cd nginx-proxy
docker compose up -d
```

#### Step 2: Configure Minepanel

Modify `docker-compose.split.yml`:

```yaml
networks:
  default:
    name: nginx-proxy
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
      - NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com
      - NEXT_PUBLIC_FILEBROWSER_URL=https://files.yourdomain.com
      - NEXT_PUBLIC_DEFAULT_LANGUAGE=en
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    restart: always

  backend:
    image: ketbom/minepanel-backend:latest
    expose:
      - 8091
    environment:
      - VIRTUAL_HOST=api.yourdomain.com
      - VIRTUAL_PORT=8091
      - LETSENCRYPT_HOST=api.yourdomain.com
      - LETSENCRYPT_EMAIL=your-email@example.com
      - SERVERS_DIR=/app/servers
      - FRONTEND_URL=https://minepanel.yourdomain.com
      - CLIENT_PASSWORD=admin
      - CLIENT_USERNAME=admin
      - DEFAULT_LANGUAGE=en
      - JWT_SECRET=
    volumes:
      - ./servers:/app/servers
      - /var/run/docker.sock:/var/run/docker.sock
    restart: always

  filebrowser:
    image: hurlenko/filebrowser
    expose:
      - 8080
    environment:
      - VIRTUAL_HOST=files.yourdomain.com
      - VIRTUAL_PORT=8080
      - LETSENCRYPT_HOST=files.yourdomain.com
      - LETSENCRYPT_EMAIL=your-email@example.com
      - FB_BASEURL=/
    volumes:
      - ./servers:/data
      - ./filebrowser-data:/config
    restart: always
```

::: warning DNS Configuration
Make sure your domains point to your server's IP address before starting:

- minepanel.yourdomain.com → Your server IP
- api.yourdomain.com → Your server IP
- files.yourdomain.com → Your server IP
  :::

```bash
docker compose -f docker-compose.split.yml up -d
```

---

## Development Setup

For contributors or those who want to modify the code.

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Git

### Setup

```bash
# Clone repository
git clone https://github.com/Ketbome/minepanel.git
cd minepanel

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Run in Development Mode

**Terminal 1 - Backend:**

```bash
cd backend
npm run start:dev
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

**Terminal 3 - Filebrowser (optional):**

```bash
docker run -d \
  --name filebrowser \
  -p 8080:8080 \
  -v $(pwd)/servers:/data \
  hurlenko/filebrowser
```

Now you can access:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8091
- Filebrowser: http://localhost:8080

### Build Custom Docker Image

```bash
# Build single-arch image
docker build -t minepanel:custom .

# Test your custom build
docker compose up -d
```

### Build Multi-Architecture

For publishing to Docker Hub (requires buildx):

```bash
# Create and use buildx builder
docker buildx create --name multiplatform --use --bootstrap

# Build and push for multiple architectures
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t username/minepanel:latest \
  --push .
```

---

## Platform-Specific Notes

### Linux

No special configuration needed. Just make sure your user is in the `docker` group:

```bash
sudo usermod -aG docker $USER
# Log out and back in
```

### macOS

Docker Desktop for Mac handles everything automatically. No additional setup required.

### Windows (WSL2)

1. Install [WSL2](https://docs.microsoft.com/en-us/windows/wsl/install)
2. Install [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop)
3. Enable WSL2 integration in Docker Desktop settings
4. Run all commands inside WSL2 (Ubuntu)

::: tip
Use WSL2 file system for better performance: `/home/username/minepanel` instead of `/mnt/c/Users/...`
:::

### Raspberry Pi / ARM

Minepanel supports ARM architecture (arm64). Use the same installation commands:

```bash
docker compose up -d
```

Docker will automatically pull the correct ARM image.

::: info Performance Note
On Raspberry Pi 4 (4GB+), you can comfortably run 2-3 small Minecraft servers. Allocate 1-2GB RAM per server.
:::

---

## Uninstalling

To completely remove Minepanel:

```bash
# Stop all containers
docker compose down

# Remove all server data (WARNING: This deletes everything!)
rm -rf servers/ filebrowser-data/

# Remove Docker images
docker rmi ketbom/minepanel:latest
docker rmi hurlenko/filebrowser
```

To keep your server data but stop the panel:

```bash
# Just stop containers
docker compose down

# Start again later
docker compose up -d
```

---

## Next Steps

- 📖 [Configuration Guide](/configuration)
- 🎯 [Learn about Features](/features)
- 🏗️ [Understand Architecture](/architecture)
