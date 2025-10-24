# Minepanel

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Made with NestJS](https://img.shields.io/badge/Backend-NestJS-red)
![Made with Next.js](https://img.shields.io/badge/Frontend-Next.js-black)
![Docker Hub](https://img.shields.io/docker/pulls/ketbom/minepanel?logo=docker)
![Docker Image Size](https://img.shields.io/docker/image-size/ketbom/minepanel/latest)

A modern web-based panel for managing multiple Minecraft servers using Docker.

**🐳 Docker Hub:** [ketbom/minepanel](https://hub.docker.com/r/ketbom/minepanel)

Built on top of [itzg/docker-minecraft-server](https://github.com/itzg/docker-minecraft-server) and [itzg/docker-mc-backup](https://github.com/itzg/docker-mc-backup).

![Dashboard View](./assets/Animation.gif)

## Why Minepanel?

After trying several server management solutions, I wanted something that was:

- ✨ **Easy to use** - No complex configurations
- 🎨 **Modern interface** - Built with Next.js
- 🚀 **Quick to deploy** - One command installation
- 💪 **Powerful** - Manage multiple servers effortlessly

## ✨ Features

- ✅ **One-command deployment** from Docker Hub
- ✅ **Multi-architecture** (Intel/AMD + ARM/Raspberry Pi/Apple Silicon)
- ✅ **Multiple Minecraft servers** with isolated containers
- ✅ **Real-time logs** with error detection
- ✅ **Resource monitoring** (CPU, RAM)
- ✅ **Integrated file browser** for editing configs
- ✅ **Automatic backups**
- ✅ **All server types**: Vanilla, Paper, Forge, Fabric, Spigot, Purpur, etc.
- ✅ **CurseForge modpacks** support
- ✅ **Multi-language** (English/Spanish)

## 📋 Requirements

- Docker & Docker Compose (v2.0+)
- 2GB+ RAM
- Linux, macOS, or Windows with WSL2

## 🚀 Quick Start

### Option 1: Direct installation (Recommended)

Create a `docker-compose.yml` file:

```yaml
services:
  minepanel:
    image: ketbom/minepanel:latest
    ports:
      - "${BACKEND_PORT:-8091}:8091"
      - "${FRONTEND_PORT:-3000}:3000"
    environment:
      # Backend environment variables
      - SERVERS_DIR=${PWD}/servers
      - FRONTEND_URL=${FRONTEND_URL:-http://localhost:3000}
      - CLIENT_PASSWORD=${CLIENT_PASSWORD:-$$2a$$12$$kvlrbEjbVd6SsbD8JdIB.OOQWXTPL5dFgo5nDeIXgeW.BhIyy8ocu}
      - CLIENT_USERNAME=${CLIENT_USERNAME:-admin}
      - DEFAULT_LANGUAGE=${DEFAULT_LANGUAGE:-en}
      # Frontend environment variables (informative, already baked in build)
      - NEXT_PUBLIC_FILEBROWSER_URL=${NEXT_PUBLIC_FILEBROWSER_URL:-http://localhost:8080}
      - NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL:-http://localhost:8091}
      - NEXT_PUBLIC_DEFAULT_LANGUAGE=${NEXT_PUBLIC_DEFAULT_LANGUAGE:-en}
    volumes:
      - ${PWD}/servers:${PWD}/servers
      - /var/run/docker.sock:/var/run/docker.sock
    restart: always

  filebrowser:
    image: hurlenko/filebrowser
    # user: "${UID:-1000}:${GID:-1000}"
    ports:
      - "${FILEBROWSER_PORT:-8080}:8080"
    volumes:
      - ${PWD}/servers:/data
      - ./filebrowser-data:/config
    environment:
      - FB_BASEURL=/
    restart: always
```

Then run:

```bash
mkdir -p servers filebrowser-data
docker compose up -d
```

### Option 2: Clone from repository

```bash
git clone https://github.com/Ketbome/minepanel.git
cd minepanel
mkdir -p servers filebrowser-data
docker compose up -d
```

**That's it!** 🎉

### Access

- **Web Panel**: http://localhost:3000
- **Filebrowser**: http://localhost:8080

**Default credentials:** `admin` / `admin` (change after first login!)

## 🏗️ Architecture

Minepanel runs as a unified container with:

- **Backend (NestJS)** on port 8091
- **Frontend (Next.js)** on port 3000
- **Filebrowser** for file management

The backend uses the Docker socket to create and manage Minecraft server containers on the host, keeping them isolated and performant.

## 🔧 Configuration

### Change Admin Password

1. Generate a bcrypt hash: https://bcrypt-generator.com/
2. Edit `docker-compose.yml` and update `CLIENT_PASSWORD`
3. **Important**: Escape `$` symbols with `$$` in docker-compose.yml

```yaml
# Example
CLIENT_PASSWORD=$$2a$$12$$YourHashHere...
```

### Customize Ports

Create a `.env` file:

```bash
BACKEND_PORT=8091
FRONTEND_PORT=3000
FILEBROWSER_PORT=8080
```

### Update to Latest Version

```bash
docker pull ketbom/minepanel:latest
docker compose up -d
```

## 📦 Useful Commands

```bash
# View logs
docker compose logs -f minepanel

# Restart
docker compose restart minepanel

# Stop all
docker compose down

# Container shell access
docker compose exec minepanel sh
```

## 🛠️ Development

Want to modify the code or build from source?

```bash
# Run locally without Docker
cd backend && npm install && npm run start:dev
cd frontend && npm install && npm run dev

# Build custom Docker image
docker build -t minepanel:custom .

# Build multi-architecture (for publishing)
docker buildx create --name multiplatform --use --bootstrap
docker buildx build --platform linux/amd64,linux/arm64 -t username/minepanel:latest --push .
```

## 🗺️ Roadmap

- [ ] User roles and permissions
- [ ] API documentation (Swagger)
- [ ] Server templates
- [ ] Metrics dashboard
- [ ] Discord webhooks

## 🤝 Contributing

Found a bug or have an idea? Pull requests are welcome!

- Report issues on [GitHub Issues](https://github.com/Ketbome/minepanel/issues)
- ⭐ Star the project if you like it
- Share with other server admins

## 📄 License

MIT License - feel free to use this project however you'd like.

## 💬 Contact

Created by [@Ketbome](https://github.com/Ketbome)

Questions or suggestions? Open an issue!

---

_This project was born from the frustration of managing Minecraft servers via terminal. If it helps you, I'm happy!_ ❤️
