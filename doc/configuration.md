# Configuration Guide

Learn how to customize Minepanel to fit your needs.

## Environment Variables

Minepanel uses environment variables for configuration. You can set them in:

- `docker-compose.yml` file
- `.env` file (recommended for sensitive data)
- Command line when starting containers

### Backend Variables

| Variable           | Default                 | Description                               |
| ------------------ | ----------------------- | ----------------------------------------- |
| `SERVERS_DIR`      | `${PWD}/servers`        | Directory where server files are stored   |
| `FRONTEND_URL`     | `http://localhost:3000` | URL where the frontend is accessible      |
| `CLIENT_USERNAME`  | `admin`                 | Admin username for authentication         |
| `CLIENT_PASSWORD`  | (bcrypt hash)           | Admin password (bcrypt hashed)            |
| `DEFAULT_LANGUAGE` | `en`                    | Default interface language (`en` or `es`) |
| `BACKEND_PORT`     | `8091`                  | Port for backend API                      |

### Frontend Variables

| Variable                       | Default                 | Description                     |
| ------------------------------ | ----------------------- | ------------------------------- |
| `NEXT_PUBLIC_BACKEND_URL`      | `http://localhost:8091` | Backend API URL                 |
| `NEXT_PUBLIC_FILEBROWSER_URL`  | `http://localhost:8080` | Filebrowser URL                 |
| `NEXT_PUBLIC_DEFAULT_LANGUAGE` | `en`                    | Default language (`en` or `es`) |
| `FRONTEND_PORT`                | `3000`                  | Port for frontend web interface |

### Filebrowser Variables

| Variable           | Default | Description              |
| ------------------ | ------- | ------------------------ |
| `FB_BASEURL`       | `/`     | Base URL for Filebrowser |
| `FILEBROWSER_PORT` | `8080`  | Port for file browser    |

---

## Change Admin Password

The default password is **not secure**. Change it immediately after installation!

### Step 1: Generate a bcrypt Hash

Use an online tool: [bcrypt-generator.com](https://bcrypt-generator.com/)

Enter your desired password and select **rounds: 12**. You'll get a hash like:

```
$2a$12$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKL
```

### Step 2: Escape Dollar Signs

In `docker-compose.yml`, **dollar signs must be doubled** (`$$`):

```yaml
environment:
  - CLIENT_PASSWORD=$$2a$$12$$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKL
```

### Step 3: Update and Restart

```bash
docker compose down
docker compose up -d
```

::: warning Keep Your Password Safe

- Use a strong, unique password
- Store the bcrypt hash securely
- Never commit passwords to version control
  :::

### Alternative: Using .env File

Create a `.env` file (recommended for security):

```bash
CLIENT_USERNAME=admin
CLIENT_PASSWORD=$$2a$$12$$YourBcryptHashHere...
```

Then in `docker-compose.yml`:

```yaml
environment:
  - CLIENT_USERNAME=${CLIENT_USERNAME}
  - CLIENT_PASSWORD=${CLIENT_PASSWORD}
```

---

## Customize Ports

### Method 1: .env File (Recommended)

Create a `.env` file in the same directory as `docker-compose.yml`:

```bash
# Minepanel ports
BACKEND_PORT=8091
FRONTEND_PORT=3000
FILEBROWSER_PORT=8080

# Credentials
CLIENT_USERNAME=admin
CLIENT_PASSWORD=$$2a$$12$$YourHashHere...
```

Then update `docker-compose.yml` to use these variables:

```yaml
services:
  minepanel:
    ports:
      - "${BACKEND_PORT:-8091}:8091"
      - "${FRONTEND_PORT:-3000}:3000"
    environment:
      - CLIENT_USERNAME=${CLIENT_USERNAME:-admin}
      - CLIENT_PASSWORD=${CLIENT_PASSWORD}
```

### Method 2: Direct Edit

Directly edit the ports in `docker-compose.yml`:

```yaml
services:
  minepanel:
    ports:
      - "9090:8091" # Backend on port 9090
      - "8080:3000" # Frontend on port 8080
```

::: tip Testing Port Availability
Check if a port is in use:

```bash
# Linux/Mac
sudo netstat -tulpn | grep :3000

# Windows
netstat -ano | findstr :3000
```

:::

---

## Language Configuration

Minepanel supports multiple languages. Change the default language:

```yaml
environment:
  - DEFAULT_LANGUAGE=es # Spanish
  # or
  - DEFAULT_LANGUAGE=en # English
```

Supported languages:

- `en` - English
- `es` - Spanish (Español)

Users can also change the language from the web interface.

---

## Persistent Data

### Understanding Volumes

Minepanel uses Docker volumes to persist data:

```yaml
volumes:
  - ${PWD}/servers:${PWD}/servers # Minecraft server data
  - /var/run/docker.sock:/var/run/docker.sock # Docker control
  - ./filebrowser-data:/config # Filebrowser settings
```

### Server Data Location

All Minecraft servers are stored in the `servers/` directory:

```
servers/
├── my-server-1/
│   ├── world/
│   ├── server.properties
│   ├── ops.json
│   └── ...
├── my-server-2/
│   └── ...
└── backups/
    ├── my-server-1/
    └── my-server-2/
```

### Backup Your Data

**Manual Backup:**

```bash
# Stop servers
docker compose down

# Backup
tar -czf minepanel-backup-$(date +%Y%m%d).tar.gz servers/ filebrowser-data/

# Restart
docker compose up -d
```

**Restore from Backup:**

```bash
# Stop services
docker compose down

# Extract backup
tar -xzf minepanel-backup-20241024.tar.gz

# Start services
docker compose up -d
```

### Change Server Directory

To store servers in a different location:

```yaml
environment:
  - SERVERS_DIR=/custom/path/servers
volumes:
  - /custom/path/servers:/custom/path/servers
```

::: warning Path Consistency
The `SERVERS_DIR` environment variable must match the volume mount path!
:::

---

## Resource Limits

Limit Minepanel's resource usage:

```yaml
services:
  minepanel:
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 2G
        reservations:
          memory: 512M
```

### Per-Server Limits

You can also limit individual Minecraft servers from the Minepanel interface:

- Go to Server Settings → Resources
- Set Memory limit (e.g., 2G for 2 gigabytes)
- Set CPU cores

---

## Network Configuration

### Custom Network

Create a custom Docker network for better isolation:

```yaml
networks:
  minepanel:
    driver: bridge

services:
  minepanel:
    networks:
      - minepanel
  filebrowser:
    networks:
      - minepanel
```

### External Access (Public Server)

To expose your servers to the internet:

1. **Port Forward** on your router:

   - Forward port 25565 (Minecraft) → Your server IP
   - Forward port 3000 (Minepanel) → Your server IP

2. **Firewall Rules:**

```bash
# Allow Minecraft port
sudo ufw allow 25565/tcp

# Allow Minepanel (only if needed externally)
sudo ufw allow 3000/tcp
```

::: danger Security Warning
**Never expose Minepanel directly to the internet without:**

- Strong passwords
- HTTPS/SSL certificates
- A reverse proxy with security headers
- Fail2ban or similar protection

Consider using a VPN (WireGuard, Tailscale) for remote access instead.
:::

### Using Reverse Proxy

For production deployments, use a reverse proxy with SSL:

See [Installation Guide - Split Services](/installation#split-services-installation) for detailed nginx-proxy and Traefik configurations.

---

## HTTPS/SSL Configuration

### With Cloudflare Tunnel (Easiest)

[Cloudflare Tunnel](https://www.cloudflare.com/products/tunnel/) provides free HTTPS without opening ports:

```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
sudo mv cloudflared /usr/local/bin/
sudo chmod +x /usr/local/bin/cloudflared

# Authenticate
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create minepanel

# Route traffic
cloudflared tunnel route dns minepanel minepanel.yourdomain.com

# Run tunnel
cloudflared tunnel run minepanel
```

### With Let's Encrypt + nginx-proxy

See [Installation Guide - nginx-proxy example](/installation#with-nginx-proxy-lets-encrypt)

### With Caddy (Automatic HTTPS)

Caddy automatically obtains SSL certificates:

```Caddyfile
minepanel.yourdomain.com {
    reverse_proxy localhost:3000
}

api.yourdomain.com {
    reverse_proxy localhost:8091
}

files.yourdomain.com {
    reverse_proxy localhost:8080
}
```

---

## Advanced Configuration

### Custom Minecraft Server Defaults

Edit server creation defaults by mounting a config file:

```json
{
  "defaultMemory": "2G",
  "defaultVersion": "1.20.1",
  "defaultType": "PAPER",
  "defaultPort": 25565,
  "javaArgs": "-XX:+UseG1GC -XX:+ParallelRefProcEnabled"
}
```

```yaml
volumes:
  - ./config.json:/app/config.json:ro
```

### Enable Debug Logging

```yaml
environment:
  - LOG_LEVEL=debug
```

### Docker Socket Security

For enhanced security, use Docker Socket Proxy:

```yaml
services:
  socket-proxy:
    image: tecnativa/docker-socket-proxy
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - CONTAINERS=1
      - IMAGES=1
      - NETWORKS=1
      - VOLUMES=1
    restart: always

  minepanel:
    environment:
      - DOCKER_HOST=tcp://socket-proxy:2375
    volumes:
      - ${PWD}/servers:${PWD}/servers
      # No direct docker.sock mount
```

This limits what Minepanel can do with Docker.

---

## Updating Minepanel

### Update from Docker Hub

```bash
# Pull latest image
docker pull ketbom/minepanel:latest

# Recreate container with new image
docker compose up -d

# Clean up old images
docker image prune
```

### Update from Source

```bash
cd minepanel
git pull origin main
docker compose build
docker compose up -d
```

---

## Troubleshooting Configuration

### Check Current Environment Variables

```bash
# View environment variables in running container
docker compose exec minepanel env
```

### Reset to Defaults

```bash
# Stop services
docker compose down

# Remove configuration
rm .env

# Use default docker-compose.yml
docker compose up -d
```

### Configuration Not Applied

1. **Restart the containers** after changing config:

   ```bash
   docker compose restart
   ```

2. **Recreate containers** if restart doesn't work:
   ```bash
   docker compose up -d --force-recreate
   ```

---

## Next Steps

- 📖 [Learn about Features](/features)
- 🏗️ [Understand Architecture](/architecture)
- ❓ [Common Issues (FAQ)](/faq)
