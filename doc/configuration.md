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
FRONTEND_URL=http://localhost:3000
DEFAULT_LANGUAGE=en
```

### Frontend

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:8091
NEXT_PUBLIC_FILEBROWSER_URL=http://localhost:8080
NEXT_PUBLIC_DEFAULT_LANGUAGE=en
```

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

Behind a reverse proxy? Set:

```yaml
environment:
  - FRONTEND_URL=https://your-domain.com
  - NEXT_PUBLIC_BACKEND_URL=https://api.your-domain.com
```

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
