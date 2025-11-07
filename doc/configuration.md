# Configuration

How to configure Minepanel.

## Environment Variables

All environment variables can be set in a `.env` file or directly in `docker-compose.yml`.

### Complete Variable Reference

#### Ports

| Variable           | Default | Description                 |
| ------------------ | ------- | --------------------------- |
| `BACKEND_PORT`     | `8091`  | Backend API port            |
| `FRONTEND_PORT`    | `3000`  | Frontend web interface port |
| `FILEBROWSER_PORT` | `8080`  | File browser port           |

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

| Variable                      | Default                 | Description                  |
| ----------------------------- | ----------------------- | ---------------------------- |
| `FRONTEND_URL`                | `http://localhost:3000` | Frontend URL (controls CORS) |
| `NEXT_PUBLIC_BACKEND_URL`     | `http://localhost:8091` | Backend API URL              |
| `NEXT_PUBLIC_FILEBROWSER_URL` | `http://localhost:8080` | File browser URL             |

#### Other

| Variable                       | Default | Description                                  |
| ------------------------------ | ------- | -------------------------------------------- |
| `NEXT_PUBLIC_DEFAULT_LANGUAGE` | `en`    | Default language (`en`, `es`, `nl`)          |
| `HOST_LAN_IP`                  | -       | Optional: Your LAN IP for local network play |

### Using Environment Variables

#### Option 1: .env File (Recommended)

Create a `.env` file in the same directory as `docker-compose.yml`:

```bash
# Ports
BACKEND_PORT=8091
FRONTEND_PORT=3000
FILEBROWSER_PORT=8080

# Directories
BASE_DIR=$PWD

# Authentication
JWT_SECRET=your_generated_secret_here
CLIENT_USERNAME=admin
CLIENT_PASSWORD=admin

# URLs
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_BACKEND_URL=http://localhost:8091
NEXT_PUBLIC_FILEBROWSER_URL=http://localhost:8080

# Language
NEXT_PUBLIC_DEFAULT_LANGUAGE=en

# Network (optional)
# HOST_LAN_IP=192.168.1.100  # Your LAN IP for local network play
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

## Remote Access Configuration

To access Minepanel from outside your local network:

### 1. Update Environment Variables

Edit your `docker-compose.yml`:

```yaml
environment:
  # Backend - Controls CORS
  - FRONTEND_URL=http://your-server-ip:3000

  # Frontend - API endpoints
  - NEXT_PUBLIC_BACKEND_URL=http://your-server-ip:8091
  - NEXT_PUBLIC_FILEBROWSER_URL=http://your-server-ip:8080
```

### 2. Using a Domain Name

If you have a domain:

```yaml
environment:
  # Backend
  - FRONTEND_URL=https://minepanel.yourdomain.com

  # Frontend
  - NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com
  - NEXT_PUBLIC_FILEBROWSER_URL=https://files.yourdomain.com
```

### 3. Restart Services

```bash
docker compose restart
```

::: warning Security

- Always use HTTPS for production deployments
- See [SSL/HTTPS](#ssl-https) section below for setup
- Make sure your firewall allows the required ports
- Don't expose ports publicly without proper authentication
  :::

## LAN Network Configuration

When you create a Minecraft server, Minepanel automatically shows the connection information to share with players. By default, it shows your **public IP** (obtained automatically via ipify.org). However, if you want players on your **local network (LAN)** to see your local IP address, you need to configure it manually.

### Why Configure LAN IP?

- **Better performance**: Players on your local network will connect directly without going through your router
- **No port forwarding needed**: For LAN players, you don't need to configure port forwarding
- **Both options**: The panel will show both public IP (for internet players) and LAN IP (for local players)

### How to Get Your LAN IP {#how-to-get-your-lan-ip}

**On macOS:**

```bash
ipconfig getifaddr en0
# Example output: 192.168.3.208
```

**On Linux:**

```bash
hostname -I | awk '{print $1}'
# Example output: 192.168.1.100
```

**On Windows (PowerShell):**

```powershell
(Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Ethernet").IPAddress
# Example output: 192.168.1.50
```

::: tip
Your LAN IP typically starts with `192.168.x.x` or `10.x.x.x`
:::

### Configuration

Add the `HOST_LAN_IP` variable to your `docker-compose.yml`:

```yaml
services:
  minepanel:
    environment:
      # ... other variables
      - HOST_LAN_IP=192.168.3.208 # Replace with your actual LAN IP
```

Or in your `.env` file:

```bash
HOST_LAN_IP=192.168.3.208
```

### Restart Services

```bash
docker compose down
docker compose up -d
```

### How It Works

When a Minecraft server is running, the panel will show a **Server Connection** section with:

1. **Public IP/Domain**: `203.0.113.50:25565` (for external players)
2. **LAN IP**: `192.168.3.208:25565` (for local network players)

Both addresses are easily copyable with one click.

::: info
If you don't configure `HOST_LAN_IP`, only the public IP will be shown. This is fine if all your players are connecting from the internet.
:::

## Change admin password

### From UI

1. Login
2. Go to Settings
3. Change password

### From environment

Update `CLIENT_PASSWORD` in docker-compose.yml with a hashed password:

```bash
# Generate hash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('newpassword', 12).then(console.log)"

# Use in docker-compose.yml
CLIENT_PASSWORD=$2a$12$your_hash_here
```

## Ports

Default ports:

- Frontend: `3000`
- Backend: `8091`
- Filebrowser: `8080`

Change in docker-compose.yml:

```yaml
ports:
  - "3001:3000" # Frontend on 3001
  - "9000:8091" # Backend on 9000
```

## BASE_DIR Configuration

`BASE_DIR` is a **critical environment variable** that tells Minepanel where server files are located on the **host machine**. This is necessary because Minepanel uses the Docker socket to create and manage Minecraft server containers.

### Why BASE_DIR is Required

When Minepanel creates a Minecraft server container via the Docker socket (`/var/run/docker.sock`), it needs to mount directories from the host machine. Since Minepanel itself runs in a container, it must provide **absolute host paths** for volume mounts.

**Without BASE_DIR:**

```yaml
# ❌ This won't work with Docker socket
volumes:
  - ./mc-data:/data # Relative path doesn't exist on host
```

**With BASE_DIR:**

```yaml
# ✅ This works - uses absolute host path
volumes:
  - /Users/username/minepanel/servers/my-server/mc-data:/data
```

### Default Configuration

```yaml
environment:
  - BASE_DIR=${BASE_DIR:-$PWD}
volumes:
  - ${BASE_DIR:-$PWD}/servers:/app/servers
  - ${BASE_DIR:-$PWD}/data:/app/data
```

This configuration:

- Defaults to current directory (`$PWD`)
- Uses host-side paths for Docker operations
- Maps to `/app/servers` and `/app/data` inside the container

### Custom BASE_DIR

If you want to store servers in a different location:

```bash
# In .env file
BASE_DIR=/mnt/storage/minepanel
```

Or directly:

```bash
BASE_DIR=/mnt/storage/minepanel docker compose up -d
```

### Examples

```bash
# External drive
BASE_DIR=/mnt/external-drive/minepanel

# Home directory
BASE_DIR=/home/username/minepanel

# Absolute path on Windows WSL2
BASE_DIR=/home/username/minepanel  # NOT /mnt/c/...
```

::: warning Important

- `BASE_DIR` must be an **absolute path** on the host machine
- On WSL2, use Linux paths (`/home/...`) not Windows paths (`/mnt/c/...`)
- The directory must be accessible to Docker
- Check Docker Desktop → Settings → Resources → File Sharing
  :::

::: tip Technical Details
See [Architecture - Docker Socket Communication](/architecture#docker-socket-access) for more details on why `BASE_DIR` is necessary.
:::

## Custom Server Directory

By default, server files are stored in `${BASE_DIR}/servers`. To use a different structure, you can customize both `BASE_DIR` and mount points:

### Using .env file:

```bash
BASE_DIR=/custom/path/minepanel
```

### Using docker-compose.yml:

```yaml
environment:
  - BASE_DIR=${BASE_DIR:-$PWD}
volumes:
  - ${BASE_DIR:-$PWD}/servers:/app/servers
  - ${BASE_DIR:-$PWD}/data:/app/data
```

::: tip
The `:-$PWD` syntax means: use `BASE_DIR` if set, otherwise default to current directory. This works on all operating systems (Linux, macOS, Windows).
:::

## Language

Change default language:

```yaml
environment:
  - DEFAULT_LANGUAGE=es # or 'en'
  - NEXT_PUBLIC_DEFAULT_LANGUAGE=es
```

## SSL/HTTPS

### With nginx-proxy

```yaml
services:
  frontend:
    environment:
      - VIRTUAL_HOST=minepanel.yourdomain.com
      - LETSENCRYPT_HOST=minepanel.yourdomain.com
      - LETSENCRYPT_EMAIL=you@email.com

networks:
  default:
    name: nginx_network
    external: true
```

## Resource limits

Limit Minepanel's resources:

```yaml
services:
  minepanel:
    deploy:
      resources:
        limits:
          cpus: "2"
          memory: 2G
        reservations:
          memory: 512M
```

## Server defaults

Set defaults for new servers in the UI Settings page.

## Logs

View logs:

```bash
docker compose logs -f minepanel
docker compose logs -f filebrowser
```

Save logs:

```bash
docker compose logs minepanel > minepanel.log
```

## Updates

Update to latest:

```bash
docker compose pull
docker compose up -d
```

## Reset to defaults

```bash
docker compose down
rm -rf servers/ filebrowser-data/ data/
mkdir -p servers filebrowser-data data
docker compose up -d
```

## Database Management

Minepanel uses SQLite for data persistence. The database file is stored at `./data/minepanel.db`.

### Backup Database

```bash
# Simple backup
cp data/minepanel.db data/minepanel.db.backup

# Backup with timestamp
cp data/minepanel.db data/minepanel.db.$(date +%Y%m%d_%H%M%S)
```

### Restore Database

```bash
# Restore from backup
docker compose down
cp data/minepanel.db.backup data/minepanel.db
docker compose up -d
```

### Reset Database

**WARNING: This will delete all your servers, users, and configuration!**

```bash
docker compose down
rm -f data/minepanel.db
docker compose up -d
```

After reset, you'll need to log in again with the default credentials (admin/admin).

## Advanced

### Custom Docker socket

```yaml
volumes:
  - /custom/path/docker.sock:/var/run/docker.sock
```

### Multiple instances

Run multiple Minepanel instances:

1. Create separate directories
2. Use different ports
3. Use different server directories

### Proxy configuration

Behind a reverse proxy? Update all three critical variables:

```yaml
environment:
  # Backend - CRITICAL for CORS
  - FRONTEND_URL=https://your-domain.com

  # Frontend - API endpoints
  - NEXT_PUBLIC_BACKEND_URL=https://api.your-domain.com
  - NEXT_PUBLIC_FILEBROWSER_URL=https://files.your-domain.com
```

::: tip
See the [Remote Access Configuration](#remote-access-configuration) section above for detailed examples.
:::

### Custom network

```yaml
networks:
  minepanel:
    driver: bridge

services:
  minepanel:
    networks:
      - minepanel
```

## Troubleshooting

### Can't connect to Docker

```bash
# Check Docker is running
docker ps

# Check permissions
sudo usermod -aG docker $USER
```

### Port already in use

Change ports in docker-compose.yml

### Database issues

The database is stored at `./data/minepanel.db`. If you have issues:

```bash
# Check if the database file exists
ls -l data/minepanel.db

# Check minepanel logs
docker compose logs minepanel

# Reset database (WARNING: deletes all data)
docker compose down
rm -f data/minepanel.db
docker compose up -d
```

### Lost admin password

Update `CLIENT_PASSWORD` in docker-compose.yml and restart.

## More help

- [FAQ](/faq)
- [GitHub Issues](https://github.com/Ketbome/minepanel/issues)
