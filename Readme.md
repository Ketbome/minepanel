# Minepanel

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Made with NestJS](https://img.shields.io/badge/Backend-NestJS-red)
![Made with Next.js](https://img.shields.io/badge/Frontend-Next.js-black)
![PM2](https://img.shields.io/badge/Process_Manager-PM2-2B037A)

A web-based tool for managing multiple Minecraft servers using Docker. Because managing servers from the terminal can be a real headache.

This project is built on top of the amazing work by [itzg](https://github.com/itzg):

- `docker-minecraft-server` – The most popular Minecraft server container
- `docker-mc-backup` – Automated backup system

![Dashboard View](./assets/Animation.gif)

## Why another server manager?

After trying several solutions, I wanted something that was:

- Easy to set up and use
- Modern (no 2000s-era interfaces)
- Flexible for handling multiple servers
- That wouldn't give me headaches

## What you can do

- **Intuitive web panel** - Built with Next.js, no ugly interfaces
- **Robust API** - NestJS backend that handles everything
- **Multiple servers** - Manage as many as your server can handle
- **Real-time logs** - See what's happening without SSH
- **File management** - Edit configurations from your browser
- **Automatic backups** - Because nobody wants to lose their world

## Project structure

```
minepanel/
├── frontend/         # Web interface (Next.js) - Dockerized
├── backend/          # REST API (NestJS) - Dockerized, controls Docker via socket
├── servers/          # Minecraft servers directory (each server has its own docker-compose)
├── filebrowser/      # File management UI - Dockerized
└── docker-compose.yml  # Main orchestration file
```

## Architecture

Minepanel is **fully containerized** using a smart Docker-in-Docker approach:

### 🏗️ Components

- **Backend (NestJS)**: Runs in Docker, manages everything via REST API
- **Frontend (Next.js)**: Runs in Docker, provides the beautiful web interface  
- **Filebrowser**: Runs in Docker, allows direct file editing
- **Minecraft Servers**: Each server runs in its own isolated Docker container

### 🔌 How does Docker control Docker?

The backend container can create and manage Minecraft server containers through the **Docker socket**:

```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock  # Direct access to host Docker daemon
  - ${PWD}/servers:${PWD}/servers              # Same path in container and host
```

**The flow:**
1. Backend (inside container) executes `docker compose up` for a Minecraft server
2. Command travels through the mounted socket to the **host's Docker daemon**
3. Minecraft server container is created on the host (as a "sibling", not nested)
4. Backend monitors/controls servers using standard Docker commands

**Why this works:**
- ✅ No Docker-in-Docker (DinD) complexity - simpler and faster
- ✅ Minecraft servers run directly on host with full performance
- ✅ Paths are synchronized between container and host
- ✅ Production-ready and battle-tested approach
- ✅ Backend stays isolated but has infrastructure control

### 🚀 Deployment Modes

This repo includes configuration for two deployment scenarios:

1. **Production with nginx-proxy** (`docker-compose.yml`) - SSL + custom domains
2. **Local development** - Simple setup without reverse proxy (instructions below)

## ⚠️ Security First!

> **Default admin credentials:**
> - Username: `admin`  
> - Password: `admin`
>
> **🔒 CHANGE THE PASSWORD BEFORE PRODUCTION!**
>
> The password is stored as a bcrypt hash in the `docker-compose.yml`. Generate a new one:
> - Use [bcrypt-generator.com](https://bcrypt-generator.com/)
> - Or Node.js: `require('bcrypt').hashSync('your-password', 12)`
> - Update `CLIENT_PASSWORD` in `docker-compose.yml`

## 📋 Requirements

- **Docker** and **Docker Compose** (that's it!)
- Git
- (Optional) nginx-proxy if using custom domains

## 🚀 Installation

Choose your deployment method:

---

### Option A: Production with nginx-proxy (Recommended for VPS/Server)

Perfect for: Production deployments with custom domains and automatic SSL.

**Prerequisites:**
- [nginx-proxy](https://github.com/nginx-proxy/nginx-proxy) already configured
- Domain names pointing to your server

#### Step 1: Clone and configure

```bash
git clone https://github.com/Ketbome/minepanel.git
cd minecraft-docker-manager
```

#### Step 2: Edit docker-compose.yml

Replace placeholder values with your own:

```bash
nano docker-compose.yml
```

Change these values:
- `app.ketbome.lat` → your backend API domain
- `minecraft.ketbome.lat` → your frontend domain  
- `filebrowser.ketbome.lat` → your filebrowser domain
- `pims.2711@gmail.com` → your email (for Let's Encrypt)
- `CLIENT_PASSWORD` → your bcrypt hash (see security section above)
- `CF_API_KEY` → your CurseForge API key (optional)

#### Step 3: Create required directories

```bash
mkdir -p servers filebrowser/config
```

#### Step 4: Start all services

```bash
docker compose up -d
```

#### Step 5: Check logs

```bash
docker compose logs -f
```

**Access your panel:**
- Frontend: `https://your-frontend-domain.com`
- Backend API: `https://your-backend-domain.com`
- Filebrowser: `https://your-filebrowser-domain.com`

**Useful commands:**
```bash
# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Restart a service
docker compose restart backend

# Stop everything
docker compose down

# Update
git pull
docker compose build
docker compose up -d
```

---

### Option B: Local Development (Without nginx-proxy)

Perfect for: Local testing, development, or simple home server.

#### Step 1: Clone the project

```bash
git clone https://github.com/Ketbome/minepanel.git
cd minecraft-docker-manager
```

#### Step 2: Modify docker-compose.yml for local use

```bash
# Backup the production config
cp docker-compose.yml docker-compose.prod.yml

# Edit for local use
nano docker-compose.yml
```

Remove nginx-proxy configuration and use direct ports. Change:

```yaml
# BEFORE (nginx-proxy mode):
expose:
  - 8091
environment:
  - VIRTUAL_HOST=app.ketbome.lat
  # ...
networks:
  - nginx-proxy

# AFTER (local mode):
ports:
  - "8091:8091"
environment:
  - FRONTEND_URL=http://localhost:3000
  # ... (remove VIRTUAL_HOST, LETSENCRYPT_* vars)
# Remove networks section
```

Or use this quick config:

```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8091:8091"
    environment:
      - SERVERS_DIR=${PWD}/servers
      - PORT=8091
      - FRONTEND_URL=http://localhost:3000
      - CLIENT_USERNAME=admin
      - CLIENT_PASSWORD=$2a$12$soXdCUDdjo4PVV3iYNl9/OpbaSWy2cTUJ3tU5WtWxZHxXqrMYtla2
      - CF_API_KEY=
    volumes:
      - ${PWD}/servers:${PWD}/servers
      - /var/run/docker.sock:/var/run/docker.sock
    restart: always

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_FILEBROWSER_URL=http://localhost:8080
      - NEXT_PUBLIC_BACKEND_URL=http://localhost:8091
    restart: always
    depends_on:
      - backend

  filebrowser:
    image: hurlenko/filebrowser
    user: "1000:1000"
    ports:
      - "8080:8080"
    volumes:
      - ${PWD}/servers:/data
      - ${PWD}/filebrowser/config:/config
    environment:
      - FB_BASEURL=/
    restart: always
```

#### Step 3: Start services

```bash
docker compose up -d
```

**Access your panel:**
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8091`
- Filebrowser: `http://localhost:8080`

---

## 📁 File Browser

Filebrowser is **automatically included** and starts with `docker compose up`. It allows you to edit server files directly from your browser.

**Access:** 
- Production: `https://your-filebrowser-domain.com`
- Local: `http://localhost:8080`

**Default credentials:**
- Username: `admin`
- Password: `admin`

> ⚠️ **Change these credentials** immediately after first login in Filebrowser settings!

**What you can do:**
- Browse all your Minecraft server files
- Edit configurations (`server.properties`, `ops.json`, etc.)
- Upload mods, plugins, datapacks, or worlds
- Download backups
- Manage files without SSH/FTP

---

## ⚙️ Configuration Reference

All configuration is done directly in `docker-compose.yml`. Key environment variables:

### Backend
- `SERVERS_DIR` - Path where Minecraft servers are stored
- `FRONTEND_URL` - Frontend URL for CORS  
- `CLIENT_USERNAME` - Admin username
- `CLIENT_PASSWORD` - Admin password (bcrypt hash)
- `CF_API_KEY` - CurseForge API key (optional, for modpack downloads)

### Frontend
- `NEXT_PUBLIC_BACKEND_URL` - Backend API URL (accessible from browser)
- `NEXT_PUBLIC_FILEBROWSER_URL` - Filebrowser URL (accessible from browser)

### Filebrowser
- `FB_BASEURL` - Base URL path (use `/` for root or `/filebrowser` for subpath)

**Note:** When using nginx-proxy, frontend/backend URLs should be `https://`. For local dev, use `http://localhost`.

## ✅ Features

**Currently available:**

- ✅ Fully Dockerized (Backend + Frontend + Filebrowser)
- ✅ Multiple Minecraft servers management
- ✅ Real-time logs with error detection
- ✅ User authentication
- ✅ Resource usage monitoring (CPU, RAM)
- ✅ Dynamic server creation/deletion
- ✅ Automatic backups (using mc-backup)
- ✅ File browser integration
- ✅ Multi-language support (English/Spanish)
- ✅ Support for multiple server types (Vanilla, Paper, Forge, Fabric, Spigot, etc.)
- ✅ CurseForge modpack support
- ✅ nginx-proxy ready (SSL + custom domains)

**Roadmap:**

- [ ] User roles and permissions system
- [ ] API documentation (Swagger)
- [ ] Mobile UI improvements
- [ ] Server templates
- [ ] Metrics and analytics dashboard
- [ ] Discord webhooks for notifications

---

## 🤝 Contributing

Found a bug? Have a great idea? Pull requests are welcome!

You can also:

- Report issues in Issues
- Give a star if you like the project
- Share it with other server administrators

## License

MIT License - basically you can do whatever you want with the code.

## Contact

Created by [@Ketbome](https://github.com/Ketbome)

Questions? Suggestions? Just want to chat about Minecraft? Open an issue or send a message.

---

_This project was born out of the frustration of managing Minecraft servers for friends and the community. If it helps you, I'm glad!_
