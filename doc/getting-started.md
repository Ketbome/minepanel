# Getting Started

Get Minepanel running in about 2 minutes.

![Minepanel Dashboard](/public/img/Animation.gif)

## What you need

- Docker 20.10+
- Docker Compose v2.0+
- 2GB+ RAM
- Linux, macOS, or Windows with WSL2

::: tip Check your install
`docker --version` and `docker compose version`
:::

## Installation

::: warning Platform-Specific Configuration
Configuration differs between operating systems:

**macOS / Linux:** Use `SERVERS_DIR=${PWD}/servers` and volume mount `${PWD}/servers:${PWD}/servers`

**Windows:** Use `SERVERS_DIR=/app/servers` and volume mount `./servers:/app/servers`

Examples below use macOS/Linux format. Adjust for Windows as needed.
:::

### 1. Create docker-compose.yml

```yaml
services:
  minepanel:
    image: ketbom/minepanel:latest
    ports:
      - "${BACKEND_PORT:-8091}:8091"
      - "${FRONTEND_PORT:-3000}:3000"
    environment:
      # Backend
      # Windows: use /app/servers
      - SERVERS_DIR=${PWD}/servers
      - FRONTEND_URL=${FRONTEND_URL:-http://localhost:3000}
      - JWT_SECRET= # Generate with: openssl rand -base64 32
      - CLIENT_PASSWORD=${CLIENT_PASSWORD:-admin}
      - CLIENT_USERNAME=${CLIENT_USERNAME:-admin}
      # Database
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=${DB_NAME:-minepanel}
      - DB_USER=${DB_USER:-minepanel}
      - DB_PASSWORD=${DB_PASSWORD:-minepanel}
      # Frontend
      - NEXT_PUBLIC_FILEBROWSER_URL=${NEXT_PUBLIC_FILEBROWSER_URL:-http://localhost:8080}
      - NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL:-http://localhost:8091}
      - NEXT_PUBLIC_DEFAULT_LANGUAGE=${NEXT_PUBLIC_DEFAULT_LANGUAGE:-en}
    volumes:
      # Windows: use ./servers:/app/servers
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
      - ${PWD}/servers:/data
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
      - postgres_data:/var/lib/postgresql/data
    restart: always
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-minepanel}"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### Step 2: Create Required Directories

```bash
mkdir -p servers filebrowser-data
```

### 2. Start

```bash
docker compose up -d
```

### 3. Access

- **Minepanel**: http://localhost:3000
- **File Browser**: http://localhost:8080

## First login

### Minepanel

- Username: `admin`
- Password: `admin`

::: warning Change this
Change the password after first login. See [Configuration](/configuration#change-admin-password).
:::

### Filebrowser

Check the logs for the auto-generated password:

```bash
docker compose logs filebrowser
```

Look for a line like:

```
filebrowser  | 2024/10/24 12:34:56 Admin credentials: admin / <generated-password>
```

1. Copy the password
2. Login to http://localhost:8080
3. Change it

::: tip Lost it?

```bash
docker compose down
rm -rf filebrowser-data/filebrowser.db
docker compose up -d
docker compose logs filebrowser
```

:::

## Create your first server

1. Click "New Server"
2. Fill in:
   - Name
   - Type (Vanilla, Paper, Forge, etc.)
   - Minecraft version
   - Port (default: 25565)
   - Memory (e.g., 2G)
3. Click "Create"
4. Wait a few minutes (first time downloads files)

## Next

- [Features](/features)
- [Configuration](/configuration)
- [Architecture](/architecture)

## Troubleshooting

### Docker permission errors (Linux)

```bash
sudo usermod -aG docker $USER
# Log out and back in
```

### Containers restarting

```bash
docker compose logs minepanel
docker compose logs filebrowser
```

### Need help?

- 📚 Check the [FAQ](/faq)
- 🐛 [Report an issue on GitHub](https://github.com/Ketbome/minepanel/issues)
- 💬 [Join the discussion](https://github.com/Ketbome/minepanel/discussions)
