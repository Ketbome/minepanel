---
title: Configuration Guide - Minepanel
description: Complete environment variables reference for Minepanel. Configure ports, authentication, URLs, language, and advanced Docker settings.
head:
  - - meta
    - property: og:title
      content: Minepanel Configuration Reference
  - - meta
    - property: og:description
      content: All environment variables and configuration options for Minepanel. JWT, CORS, ports, directories and more.
---

# Configuration

How to configure Minepanel.

![Configuration](/img/configuration.png)

## Environment Variables

All environment variables can be set in a `.env` file or directly in `docker-compose.yml`.

### Complete Variable Reference

#### Ports

| Variable        | Default | Description                 |
| --------------- | ------- | --------------------------- |
| `BACKEND_PORT`  | `8091`  | Backend API port            |
| `FRONTEND_PORT` | `3000`  | Frontend web interface port |

#### Directories

| Variable   | Default | Description                                                           |
| ---------- | ------- | --------------------------------------------------------------------- |
| `BASE_DIR` | `$PWD`  | Base directory for servers (required for Docker socket communication) |

#### Authentication

| Variable          | Required | Default | Description                                               |
| ----------------- | -------- | ------- | --------------------------------------------------------- |
| `JWT_SECRET`      | ✅ Yes   | -       | JWT secret key (generate with: `openssl rand -base64 32`) |
| `CLIENT_USERNAME` | No       | `admin` | Admin username                                            |
| `CLIENT_PASSWORD` | No       | `admin` | Admin password                                            |

#### URLs

| Variable                  | Default                 | Description                  |
| ------------------------- | ----------------------- | ---------------------------- |
| `FRONTEND_URL`            | `http://localhost:3000` | Frontend URL (controls CORS) |
| `NEXT_PUBLIC_BACKEND_URL` | `http://localhost:8091` | Backend API URL              |

#### Other

| Variable                       | Default | Description                         |
| ------------------------------ | ------- | ----------------------------------- |
| `NEXT_PUBLIC_DEFAULT_LANGUAGE` | `en`    | Default language (`en`, `es`, `nl`) |

::: info Network Settings
Public IP, LAN IP, and Proxy settings are configured through the web UI at **Settings → Network Settings** and **Settings → Proxy Settings**.
:::

#### Subdirectory Routing

For reverse proxy setups with directory-based routing (e.g., `mydomain.com/minepanel`):

| Variable                | Default | Type       | Description                             |
| ----------------------- | ------- | ---------- | --------------------------------------- |
| `BASE_PATH`             | -       | Runtime    | Backend API prefix (e.g., `/api`)       |
| `NEXT_PUBLIC_BASE_PATH` | -       | Build-time | Frontend base path (e.g., `/minepanel`) |

::: warning
`NEXT_PUBLIC_BASE_PATH` must be set during Docker build, not at runtime. See [Subdirectory Routing](/networking#subdirectory-routing) for setup instructions.
:::

### Using Environment Variables

#### Option 1: .env File (Recommended)

Create a `.env` file in the same directory as `docker-compose.yml`:

```bash
# Ports
BACKEND_PORT=8091
FRONTEND_PORT=3000

# Directories
BASE_DIR=$PWD

# Authentication
JWT_SECRET=your_generated_secret_here
CLIENT_USERNAME=admin
CLIENT_PASSWORD=admin

# URLs
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_BACKEND_URL=http://localhost:8091

# Language
NEXT_PUBLIC_DEFAULT_LANGUAGE=en
```

Then run:

```bash
docker compose up -d
```

#### Option 2: Directly in docker-compose.yml

```yaml
environment:
  - JWT_SECRET=your_secret_here
```

### Custom Directories Example

To use custom directories for your data:

```bash
# In .env file
BASE_DIR=/home/user/minepanel
```

Or directly in docker-compose.yml:

```yaml
volumes:
  - ${BASE_DIR:-$PWD}/servers:/app/servers
  - ${BASE_DIR:-$PWD}/data:/app/data
```

::: danger FRONTEND_URL is Critical
The `FRONTEND_URL` variable controls CORS (Cross-Origin Resource Sharing) in the backend. If this doesn't match the URL you're using to access the frontend, API requests will be blocked.

**Examples:**

- Local: `FRONTEND_URL=http://localhost:3000`
- Remote IP: `FRONTEND_URL=http://192.168.1.100:3000`
- Domain: `FRONTEND_URL=https://minepanel.yourdomain.com`

Always restart after changing: `docker compose restart`
:::

::: tip Frontend Variables
Frontend variables (`NEXT_PUBLIC_*`) are loaded at runtime and must include the full URL with `http://` or `https://` protocol.
:::

## Quick Configuration Guides

For specific configuration topics, see these dedicated pages:

### 🌐 Networking & Remote Access

**→ [Networking Guide](/networking)**

- Remote access setup
- LAN network configuration
- SSL/HTTPS configuration
- Port management
- Firewall setup
- Reverse proxy configuration

### 🔧 Administration

**→ [Administration Guide](/administration)**

- Password management
- Database backups
- System updates
- Resource management
- Logs management
- Reset procedures

### 🎮 Server Types

**→ [Server Types Guide](/server-types)**

- Fabric
- Forge
- Paper, Spigot, Bukkit
- Purpur, Pufferfish, Folia
- CurseForge modpacks

### 📦 Mods & Plugins

**→ [Mods & Plugins Guide](/mods-plugins)**

- Modrinth integration
- CurseForge files
- Plugin management
- Combining sources

### ❓ Troubleshooting

**→ [Troubleshooting Guide](/troubleshooting)**

- Common issues
- Connection problems
- Server management issues
- Performance optimization

## Advanced Configuration

### Custom Docker Socket

```yaml
volumes:
  - /custom/path/docker.sock:/var/run/docker.sock
```

### Multiple Instances

Run multiple Minepanel instances:

1. Create separate directories
2. Use different ports
3. Use different server directories

Example:

```yaml
# Instance 1
FRONTEND_PORT=3000
BACKEND_PORT=8091

# Instance 2
FRONTEND_PORT=3001
BACKEND_PORT=8092
```

### Custom Network

```yaml
networks:
  minepanel:
    driver: bridge

services:
  minepanel:
    networks:
      - minepanel
```

## Next Steps

- **Getting Started**: [Installation Guide](/installation)
- **Remote Access**: [Networking Guide](/networking)
- **Server Setup**: [Server Types](/server-types)
- **Add Mods**: [Mods & Plugins](/mods-plugins)
- **Need Help?**: [Troubleshooting](/troubleshooting)

## More Help

- [FAQ](/faq)
- [GitHub Issues](https://github.com/Ketbome/minepanel/issues)
- [Docker Hub](https://hub.docker.com/r/ketbom/minepanel)
