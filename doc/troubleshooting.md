# Troubleshooting

Common issues and how to solve them.

## Quick Checks

Before diving into specific problems, try these:

```bash
# Check if containers are running
docker compose ps

# View logs
docker compose logs minepanel
docker compose logs --tail 100

# Check Docker daemon
docker ps

# Restart everything
docker compose restart
```

## Installation Issues

### Docker Not Found

**Error:** `docker: command not found` or `docker compose: command not found`

**Solution:**

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Add your user to docker group
sudo usermod -aG docker $USER

# Log out and back in, then test
docker --version
docker compose version
```

### Permission Denied

**Error:** `permission denied while trying to connect to the Docker daemon socket`

**Solution:**

```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Log out and back in, or:
newgrp docker

# Verify
docker ps
```

### Port Already in Use

**Error:** `port is already allocated` or `address already in use`

**Solution:**

```bash
# Find what's using the port
sudo lsof -i :3000
sudo lsof -i :8091

# Option 1: Stop the conflicting service
sudo systemctl stop <service-name>

# Option 2: Change Minepanel ports
# Edit docker-compose.yml or .env
FRONTEND_PORT=3001
BACKEND_PORT=8092

# Restart
docker compose down
docker compose up -d
```

## Connection Issues

### Can't Access Frontend

**Symptoms:** Browser shows "Can't connect" or "Connection refused"

**Solutions:**

1. **Check container is running:**

```bash
docker compose ps
# Should show minepanel as "Up"
```

2. **Check logs:**

```bash
docker compose logs minepanel
```

3. **Verify port:**

```bash
# Check if port is open
curl http://localhost:3000
```

4. **Firewall:**

```bash
# Allow port through firewall
sudo ufw allow 3000/tcp
```

### Can't Access from Remote

**Symptoms:** Works on `localhost` but not from other devices

**Solutions:**

1. **Update FRONTEND_URL:**

```yaml
environment:
  - FRONTEND_URL=http://YOUR_IP:3000  # Not localhost!
```

2. **Firewall configuration:**

```bash
# Ubuntu/Debian
sudo ufw allow 3000/tcp
sudo ufw allow 8091/tcp
sudo ufw allow 8080/tcp

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=8091/tcp
sudo firewall-cmd --reload
```

3. **Check router port forwarding** (if accessing from internet)

4. **Restart after changes:**

```bash
docker compose restart
```

### CORS Errors

**Symptoms:** Console shows CORS policy errors, API calls fail

**Solution:**

The `FRONTEND_URL` must match EXACTLY how you access the frontend:

```yaml
# If accessing via http://localhost:3000
FRONTEND_URL=http://localhost:3000

# If accessing via http://192.168.1.100:3000
FRONTEND_URL=http://192.168.1.100:3000

# If accessing via domain
FRONTEND_URL=https://minepanel.yourdomain.com
```

Always restart after changing:

```bash
docker compose restart
```

## Authentication Issues

### Can't Login

**Error:** "Invalid credentials" with correct password

**Solutions:**

1. **Check if first time login:**

Default credentials are `admin`/`admin` unless you set `CLIENT_PASSWORD`.

2. **Password changed in UI:**

If you changed password through the UI, environment variable won't work. Use the UI or [reset password](/administration#forgot-your-password).

3. **Database issues:**

```bash
# Check if database exists
ls -l data/minepanel.db

# If missing, recreate
docker compose down
docker compose up -d
```

4. **Reset password:**

See [Password Management](/administration#password-management).

### JWT Token Errors

**Error:** "Invalid token" or "Token expired"

**Solutions:**

1. **Clear browser cache and cookies**
2. **Log out and log back in**
3. **Check JWT_SECRET** hasn't changed:

```yaml
environment:
  - JWT_SECRET=same_secret_as_before
```

## Server Management Issues

### Can't Create Server

**Error:** Server creation fails

**Solutions:**

1. **Check Docker socket access:**

```bash
ls -l /var/run/docker.sock
# Should be readable by Docker group
```

2. **Check BASE_DIR:**

```yaml
environment:
  - BASE_DIR=/absolute/path  # Must be absolute!
```

3. **Check disk space:**

```bash
df -h
```

4. **View detailed error:**

```bash
docker compose logs minepanel | grep -i error
```

### Server Won't Start

**Symptoms:** Server status shows "error" or "exited"

**Solutions:**

1. **Check server logs:**

```bash
# Via UI: Go to server → Logs tab

# Via terminal:
docker logs <server-container-name>
```

2. **Common issues:**

**Port conflict:**

```bash
# Find what's using the port
sudo lsof -i :25565

# Change server port in Minepanel
```

**Memory limits:**

```yaml
# Increase memory in server settings
MAX_MEMORY: 4G
INIT_MEMORY: 2G
```

**EULA not accepted:**

```bash
# Check if EULA=TRUE in server config
# Recreate server if needed
```

3. **Restart Docker:**

```bash
sudo systemctl restart docker
docker compose restart
```

### Server Stuck in "Starting"

**Solutions:**

1. **Give it more time** - First start can take 5-10 minutes
2. **Check logs** for actual progress
3. **Check resources:**

```bash
docker stats
# Ensure enough CPU/RAM available
```

4. **Force restart:**

```bash
docker restart <server-container-name>
```

## Mod/Plugin Issues

### Mods Not Downloading

**Symptoms:** Modrinth or CurseForge mods don't appear

**Solutions:**

1. **Check API key** (for CurseForge):

```yaml
environment:
  CF_API_KEY: your_actual_key
```

2. **Check server logs:**

```bash
docker logs <server-name> | grep -i "modrinth\|curseforge"
```

3. **Verify project names:**

- Test on Modrinth website first
- Check spelling of project slugs
- Ensure compatibility with Minecraft version

4. **Network issues:**

```bash
# Test connectivity from container
docker exec <server-name> ping modrinth.com
docker exec <server-name> ping api.curseforge.com
```

### Version Conflicts

**Symptoms:** Server crashes, "incompatible" errors

**Solutions:**

1. **Check Minecraft version matches mods**
2. **Verify loader version** (Fabric/Forge)
3. **Check mod dependencies**
4. **Remove conflicting mods** one by one

## File Browser Issues

### Can't Upload Files

**Solutions:**

1. **Check permissions:**

```bash
ls -ld servers/your-server/mc-data
# Should be writable
```

2. **Check disk space:**

```bash
df -h
```

3. **Check FileBrowser logs:**

```bash
docker compose logs filebrowser
```

### Can't Edit Files

**Symptoms:** Changes don't save

**Solutions:**

1. **Stop server first** before editing critical files
2. **Check file permissions**
3. **Use correct file encoding** (UTF-8)

## Performance Issues

### High CPU Usage

**Solutions:**

1. **Limit server resources:**

```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 4G
```

2. **Use Aikar's flags:**

```yaml
environment:
  USE_AIKAR_FLAGS: "true"
```

3. **Reduce view distance:**

```yaml
environment:
  VIEW_DISTANCE: 6
  SIMULATION_DISTANCE: 4
```

### High Memory Usage

**Solutions:**

1. **Increase swap:**

```bash
# Check current swap
free -h

# Add swap
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

2. **Lower server memory allocation**
3. **Use Paper/Purpur** instead of Vanilla

### Slow Response Times

**Solutions:**

1. **Use SSD** instead of HDD
2. **Increase server resources**
3. **Enable auto-pause** for idle servers:

```yaml
environment:
  ENABLE_AUTOPAUSE: "true"
  AUTOPAUSE_TIMEOUT_EST: 3600
```

## Database Issues

### Database Locked

**Error:** "database is locked"

**Solution:**

```bash
# Stop all containers
docker compose down

# Wait a few seconds
sleep 5

# Start again
docker compose up -d
```

### Corrupted Database

**Symptoms:** Errors loading servers, UI broken

**Solutions:**

1. **Restore from backup:**

```bash
docker compose down
cp data/minepanel.db.backup data/minepanel.db
docker compose up -d
```

2. **If no backup, reset:** (loses all data)

```bash
docker compose down
rm data/minepanel.db
docker compose up -d
```

## Docker Issues

### Container Keeps Restarting

**Solutions:**

1. **Check logs:**

```bash
docker compose logs --tail 100
```

2. **Check for crashes:**

```bash
docker inspect minepanel | grep -A 10 "State"
```

3. **Verify environment variables:**

```bash
docker compose config
```

### Can't Pull Image

**Error:** "error pulling image configuration"

**Solutions:**

1. **Check internet connection**
2. **Check Docker Hub status**
3. **Clear Docker cache:**

```bash
docker system prune -a
```

4. **Manual pull:**

```bash
docker pull ketbom/minepanel:latest
```

## Still Having Issues?

### Collect Debug Information

```bash
# System info
uname -a
docker --version
docker compose version

# Container status
docker compose ps

# Recent logs
docker compose logs --tail 200 > minepanel-logs.txt

# System resources
docker stats --no-stream

# Disk space
df -h
```

### Get Help

1. **Check the [FAQ](/faq)** for common questions
2. **Search [GitHub Issues](https://github.com/Ketbome/minepanel/issues)**
3. **Create a new issue** with:
   - Your debug information
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable

### Emergency Reset

If nothing works and you need to start fresh:

::: danger
This removes EVERYTHING!
:::

```bash
# Stop everything
docker compose down -v

# Remove all data
rm -rf data/ servers/

# Remove images
docker rmi ketbom/minepanel

# Start fresh
docker compose up -d
```

## Next Steps

- Review [Administration Guide](/administration)
- Check [Configuration Reference](/configuration)
- Join the community for support

