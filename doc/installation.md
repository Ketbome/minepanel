---
title: Installation Methods - Minepanel
description: Multiple installation methods for Minepanel - Docker Compose, single container, development build, and test images. Choose the best deployment option for your needs.
head:
  - - meta
    - name: keywords
      content: minepanel installation, docker compose install, minecraft server docker, self hosted minecraft, pterodactyl alternative install, docker deployment
---

# Installation

![Installation](/img/installation.png)

## Quick Install (Recommended)

```bash
git clone https://github.com/Ketbome/minepanel.git
cd minepanel
docker compose up -d
```

**Access:** http://localhost:3000 → `admin` / `admin`

::: tip
The default `docker-compose.yml` runs split backend/frontend images. For a single combined image, use `docker-compose.single.yml`.
:::

## Configuration

Create a `.env` file for custom settings:

```bash
# Authentication
JWT_SECRET=your_secret_here  # openssl rand -base64 32

# Ports (optional)
FRONTEND_PORT=3000
BACKEND_PORT=8091

# Base directory
BASE_DIR=$PWD
```

**→ All variables:** [Configuration](/configuration)

## Update

```bash
cd minepanel
git pull
docker compose pull
docker compose up -d
```

## Installation Options

### Single Image

All-in-one container (simpler):

```bash
docker compose -f docker-compose.single.yml up -d
```

### Development Build

Build from source:

```bash
docker compose -f docker-compose.development.yml up --build -d
```

### Test Images (Pre-release)

Test images are built from non-main branches for pre-release testing:

```bash
docker compose -f docker-compose.test.yml up -d
```

::: warning
Test images may contain unstable features. Use for testing only, not production.
:::

### With Reverse Proxy (SSL)

For nginx-proxy/Traefik setups:

```yaml
# Add to docker-compose.yml
networks:
  default:
    name: nginx-proxy
    external: true

services:
  frontend:
    environment:
      - VIRTUAL_HOST=minepanel.yourdomain.com
      - LETSENCRYPT_HOST=minepanel.yourdomain.com
```

**→ Full guide:** [Networking - SSL](/networking#ssl-https)

## Platform Notes

### Linux

```bash
sudo usermod -aG docker $USER  # Then log out/in
```

### Windows

Use WSL2 with Docker Desktop.

### Raspberry Pi

Works on ARM64. Same commands, Docker pulls correct architecture automatically.

## Uninstall

```bash
docker compose down          # Stop containers
rm -rf servers/ data/        # Remove data (CAREFUL!)
docker rmi ketbom/minepanel  # Remove image
```

## Next

- [Configuration](/configuration) - All settings
- [Networking](/networking) - Remote access, SSL
- [Features](/features) - What you can do
