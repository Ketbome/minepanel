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

| Variable          | Default              | Description                                        |
| ----------------- | -------------------- | -------------------------------------------------- |
| `SERVERS_DIR`     | `./servers`          | Directory for Minecraft servers data               |
| `DATA_DIR`        | `./data`             | Directory for application data (database, backups) |
| `FILEBROWSER_DIR` | `./filebrowser-data` | Directory for file browser configuration           |

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

| Variable                       | Default | Description                         |
| ------------------------------ | ------- | ----------------------------------- |
| `NEXT_PUBLIC_DEFAULT_LANGUAGE` | `en`    | Default language (`en`, `es`, `nl`) |

### Using Environment Variables

#### Option 1: .env File (Recommended)

Create a `.env` file in the same directory as `docker-compose.yml`:

```bash
# Ports
BACKEND_PORT=8091
FRONTEND_PORT=3000
FILEBROWSER_PORT=8080

# Directories
SERVERS_DIR=./servers
DATA_DIR=./data
FILEBROWSER_DIR=./filebrowser-data

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
```

Then run:

```bash
docker compose up -d
```

#### Option 2: Inline Variables

```bash
SERVERS_DIR=/custom/path JWT_SECRET=my_secret docker compose up -d
```

#### Option 3: Directly in docker-compose.yml

```yaml
environment:
  - SERVERS_DIR=/app/servers
  - JWT_SECRET=your_secret_here
```

### Custom Directories Example

To use custom directories for your data:

```bash
# In .env file
SERVERS_DIR=/mnt/storage/minecraft-servers
DATA_DIR=/mnt/storage/minepanel-data
FILEBROWSER_DIR=/mnt/storage/filebrowser-config
```

Or directly in docker-compose.yml:

```yaml
volumes:
  - ${SERVERS_DIR:-./servers}:/app/servers
  - ${DATA_DIR:-./data}:/app/data
  - ${FILEBROWSER_DIR:-./filebrowser-data}:/config
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

## Custom Server Directory

By default, server files are stored in `./servers` relative to your `docker-compose.yml` file. To use a different location:

### Using .env file:

```bash
SERVERS_DIR=/custom/path/to/servers
```

### Using docker-compose.yml:

```yaml
volumes:
  - ${SERVERS_DIR:-./servers}:/app/servers
```

### Examples:

```bash
# External drive
SERVERS_DIR=/mnt/external-drive/minecraft-servers

# Home directory
SERVERS_DIR=~/minecraft-servers

# Absolute path
SERVERS_DIR=/var/lib/minepanel/servers
```

::: tip
The `:-./servers` syntax means: use `SERVERS_DIR` if set, otherwise default to `./servers`. This works on all operating systems (Linux, macOS, Windows).
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
