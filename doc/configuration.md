# Configuration

How to configure Minepanel.

## Environment variables

### Backend

```bash
# Required
JWT_SECRET=your_secret_here  # openssl rand -base64 32

# Optional
CLIENT_USERNAME=admin
CLIENT_PASSWORD=admin
DEFAULT_LANGUAGE=en

# CRITICAL: Controls CORS - Must match frontend URL
FRONTEND_URL=http://localhost:3000
```

::: danger FRONTEND_URL is Critical
The `FRONTEND_URL` variable controls CORS (Cross-Origin Resource Sharing) in the backend. If this doesn't match the URL you're using to access the frontend, API requests will be blocked.

**Examples:**
- Local: `FRONTEND_URL=http://localhost:3000`
- Remote IP: `FRONTEND_URL=http://192.168.1.100:3000`
- Domain: `FRONTEND_URL=https://minepanel.yourdomain.com`

Always restart after changing: `docker compose restart`
:::

### Frontend

```bash
# Must point to backend API URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:8091

# Must point to filebrowser URL
NEXT_PUBLIC_FILEBROWSER_URL=http://localhost:8080

# Default language (en, es, nl)
NEXT_PUBLIC_DEFAULT_LANGUAGE=en
```

::: tip Frontend Variables
These variables are loaded at runtime and must include the full URL with `http://` or `https://` protocol.
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

## Server directory

Where server files are stored:

```yaml
environment:
  - SERVERS_DIR=${PWD}/servers
volumes:
  - ${PWD}/servers:${PWD}/servers
```

Change `${PWD}/servers` to your preferred path.

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
mkdir -p servers filebrowser-data
docker compose up -d
```

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

### Can't connect to database

Make sure postgres service is running:

```bash
docker compose ps postgres
docker compose logs postgres
```

### Lost admin password

Update `CLIENT_PASSWORD` in docker-compose.yml and restart.

## More help

- [FAQ](/faq)
- [GitHub Issues](https://github.com/Ketbome/minepanel/issues)
