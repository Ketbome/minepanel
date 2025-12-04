# Installation Guide

This guide covers different installation methods for Minepanel, from simple to advanced setups.

![Installation](/public/img/installation.png)

## Installation Methods

Choose the method that best fits your needs:

- **[Quick Install](#quick-install)** - Recommended for most users
- **[From Source](#install-from-source)** - Clone the repository
- **[Split Services](#split-services-installation)** - Separate frontend/backend for reverse proxies
- **[Development Setup](#development-setup)** - For contributors and developers

---

## Quick Install

The fastest way to get started. Perfect for trying out Minepanel or running on a local network.

::: tip Cross-Platform
This configuration works on all operating systems (Linux, macOS, Windows). Variables with `:-` syntax provide sensible defaults that work everywhere.
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
      # Backend Configuration
      - FRONTEND_URL=${FRONTEND_URL:-http://localhost:3000}
      - JWT_SECRET=${JWT_SECRET} # Generate with: openssl rand -base64 32
      - CLIENT_PASSWORD=${CLIENT_PASSWORD:-admin}
      - CLIENT_USERNAME=${CLIENT_USERNAME:-admin}
      - BASE_DIR=${BASE_DIR:-$PWD}

      # Frontend Configuration
      - NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL:-http://localhost:8091}
      - NEXT_PUBLIC_DEFAULT_LANGUAGE=${NEXT_PUBLIC_DEFAULT_LANGUAGE:-en}
    volumes:
      - ${BASE_DIR:-$PWD}/servers:/app/servers
      - /var/run/docker.sock:/var/run/docker.sock
      - ${BASE_DIR:-$PWD}/data:/app/data
    restart: always
```

### Step 2: Launch

```bash
# Generate JWT secret
export JWT_SECRET=$(openssl rand -base64 32)

# Start services (Docker creates all volumes automatically)
docker compose up -d
```

::: tip Environment Variables
Use a `.env` file to customize directories, ports, and other settings without modifying docker-compose.yml:

```bash
# .env file
JWT_SECRET=your_generated_secret
BASE_DIR=$PWD
```

See [Configuration Guide](/configuration#using-environment-variables) for all available variables.
:::

---

## Install from Source

Clone the repository for the latest development version or to modify the code.

```bash
# Clone repository
git clone https://github.com/Ketbome/minepanel.git
cd minepanel

# Generate JWT secret (optional, can use .env)
export JWT_SECRET=$(openssl rand -base64 32)

# Start services (Docker creates volumes automatically)
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

# Generate JWT secret
export JWT_SECRET=$(openssl rand -base64 32)

# Start services (Docker creates volumes automatically)
docker compose -f docker-compose.split.yml up -d
```

This exposes:

- **Backend**: Port 8091
- **Frontend**: Port 3000

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
      - FRONTEND_URL=https://minepanel.yourdomain.com
      - CLIENT_PASSWORD=admin
      - CLIENT_USERNAME=admin
      - DEFAULT_LANGUAGE=en
      - JWT_SECRET=
      - BASE_DIR=${BASE_DIR:-$PWD}
    volumes:
      - ${BASE_DIR:-$PWD}/servers:/app/servers
      - ${BASE_DIR:-$PWD}/data:/app/data
      - /var/run/docker.sock:/var/run/docker.sock
    restart: always
```

::: warning DNS Configuration
Make sure your domains point to your server's IP address before starting:

- minepanel.yourdomain.com → Your server IP
- api.yourdomain.com → Your server IP
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

Now you can access:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8091

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

Make sure your user is in the `docker` group:

```bash
sudo usermod -aG docker $USER
# Log out and back in
```

### macOS

Install [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop). Everything works out of the box.

### Windows

1. Install [WSL2](https://docs.microsoft.com/en-us/windows/wsl/install)
2. Install [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop)
3. Enable WSL2 integration in Docker Desktop settings
4. Run commands inside WSL2 (Ubuntu terminal)

::: tip Better Performance
Use WSL2 file system for better performance: `/home/username/minepanel` instead of `/mnt/c/Users/...`
:::

### Raspberry Pi / ARM

Minepanel fully supports ARM64 architecture. Use the same installation commands - Docker automatically pulls the correct ARM image.

::: info Performance Note
On Raspberry Pi 4 (4GB+), you can run 2-3 small Minecraft servers. Allocate 1-2GB RAM per server.
:::

### Custom Directories

To use custom directories on any platform, set environment variables:

```bash
# Create .env file
BASE_DIR=${PWD}
```

See the [Configuration Guide](/configuration#using-environment-variables) for more details.

---

## Uninstalling

To completely remove Minepanel:

```bash
# Stop all containers
docker compose down

# Remove all data (WARNING: This deletes everything!)
rm -rf servers/ data/

# Remove Docker images
docker rmi ketbom/minepanel:latest
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
