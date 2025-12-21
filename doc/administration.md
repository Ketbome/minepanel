# Administration

Manage passwords, database, backups, updates, and system maintenance.

![Administration](/img/administration.png)

## Password Management

### Change Admin Password

#### From UI

1. Click on your profile (admin) in the top right
2. Select "Change Password"
3. Enter current password
4. Enter new password
5. Confirm new password
6. Click "Save"

The password is hashed with bcrypt and stored securely in the database.

#### From Environment Variable

::: warning
This method only works for the FIRST login. After that, use the UI method above.
:::

Edit `docker-compose.yml`:

```yaml
environment:
  - CLIENT_PASSWORD=your_new_password
```

Restart:

```bash
docker compose restart
```

### Forgot Your Password?

If you've forgotten your password and can't access the UI:

**Option 1: Reset via environment variable (doesn't work after first login)**

If you've never changed your password through the UI, you can use the environment variable method above.

**Option 2: Reset the database**

::: danger WARNING
This will delete ALL your servers and configuration!
:::

```bash
docker compose down
rm -f data/minepanel.db
docker compose up -d
```

You'll be able to log in with the default credentials (admin/admin) or your `CLIENT_PASSWORD` environment variable.

**Option 3: Manual database update (Advanced)**

If you know SQL and want to keep your servers:

```bash
# Stop minepanel
docker compose stop minepanel

# Install sqlite3 if needed
sudo apt install sqlite3

# Connect to database
sqlite3 data/minepanel.db

# Generate new password hash (use bcrypt online tool or Node.js)
# Then update:
UPDATE users SET password = 'your_bcrypt_hash_here' WHERE username = 'admin';

# Exit sqlite
.exit

# Start minepanel
docker compose start minepanel
```

To generate a bcrypt hash:

```javascript
// Using Node.js
const bcrypt = require('bcrypt');
const hash = bcrypt.hashSync('your_new_password', 10);
console.log(hash);
```

## Database Management

### Database Location

Minepanel uses SQLite and stores its database at:

```
./data/minepanel.db
```

This file contains:
- User credentials
- Server configurations
- Settings
- API keys

### Backup Database

**Manual backup:**

```bash
cp data/minepanel.db data/minepanel.db.backup
```

**Automated backup script:**

```bash
#!/bin/bash
# backup-minepanel.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups/minepanel"
mkdir -p $BACKUP_DIR

# Backup database
cp data/minepanel.db "$BACKUP_DIR/minepanel_$DATE.db"

# Keep only last 7 days
find $BACKUP_DIR -name "minepanel_*.db" -mtime +7 -delete

echo "Backup completed: minepanel_$DATE.db"
```

Make it executable and add to cron:

```bash
chmod +x backup-minepanel.sh

# Add to crontab (daily at 2 AM)
crontab -e
0 2 * * * /path/to/backup-minepanel.sh
```

### Restore Database

```bash
# Stop minepanel
docker compose down

# Restore from backup
cp data/minepanel.db.backup data/minepanel.db

# Start minepanel
docker compose up -d
```

### Database Inspection

To view database contents:

```bash
sqlite3 data/minepanel.db

# List tables
.tables

# View users
SELECT * FROM users;

# View servers
SELECT id, serverName, serverType, port, active FROM servers;

# Exit
.exit
```

### Reset Database

::: danger WARNING
This will delete ALL your servers, users, and configuration!
:::

```bash
docker compose down
rm -f data/minepanel.db
docker compose up -d
```

After reset, log in with default credentials (admin/admin).

## Server Backups

### Automatic Backups

Minepanel supports automatic backups for individual Minecraft servers. Configure in the server settings:

**Backup Methods:**
- `tar` - Traditional tar archives (default)
- `rsync` - Incremental backups
- `restic` - Encrypted, deduplicated backups
- `rclone` - Cloud storage backups

**Example configuration:**

```yaml
services:
  mc:
    # ... server config ...

  backup:
    image: itzg/mc-backup
    container_name: my-server-backup
    depends_on:
      - mc
    environment:
      BACKUP_METHOD: tar
      BACKUP_INTERVAL: 24h
      INITIAL_DELAY: 2m
      BACKUP_NAME: world
      DEST_DIR: /backups
      PRUNE_BACKUPS_DAYS: 7
      RCON_HOST: mc
      RCON_PORT: 25575
      RCON_PASSWORD: your_rcon_password
    volumes:
      - ./mc-data:/data:ro
      - ./backups:/backups
```

### Manual Backup

From the Minepanel UI:
1. Go to server details
2. Click "Backup Now"
3. Wait for completion
4. Download from the Files tab

Or manually:

```bash
# Backup a specific server
cd servers/my-server
tar -czf ../my-server-backup-$(date +%Y%m%d).tar.gz mc-data/
```

### Restore from Backup

1. Stop the server
2. Extract backup to `mc-data` folder
3. Start the server

```bash
docker compose stop mc
tar -xzf backup.tar.gz -C servers/my-server/
docker compose start mc
```

## Updates

### Update Minepanel

**Using Docker Compose:**

```bash
# Pull latest image
docker compose pull

# Restart with new image
docker compose up -d
```

**Check for updates:**

```bash
# Check current version
docker images ketbom/minepanel

# Check latest version on Docker Hub
https://hub.docker.com/r/ketbom/minepanel/tags
```

### Update Minecraft Server

Minecraft servers auto-update when restarted (unless you specified a specific version).

To update manually:
1. Stop server
2. Change VERSION environment variable
3. Restart server

### Rollback

If an update causes issues:

```bash
# Use specific version
docker compose down
docker tag ketbom/minepanel:latest ketbom/minepanel:backup
docker pull ketbom/minepanel:v1.0.0  # previous version
docker compose up -d
```

## Resource Management

### Check Resource Usage

```bash
# View container stats
docker stats

# View specific container
docker stats minepanel

# Check disk usage
docker system df
```

### Clean Up

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Complete cleanup
docker system prune -a --volumes
```

### Logs Management

**View logs:**

```bash
# All services
docker compose logs

# Specific service
docker compose logs minepanel

# Follow logs
docker compose logs -f

# Last 100 lines
docker compose logs --tail 100
```

**Limit log size:**

Add to `docker-compose.yml`:

```yaml
services:
  minepanel:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## System Defaults

### Reset to Defaults

To reset Minepanel to default settings (keeps servers):

```bash
# Stop containers
docker compose down

# Remove only configuration
rm -f data/minepanel.db

# Restart
docker compose up -d
```

### Complete Reset

::: danger
This removes EVERYTHING including all servers!
:::

```bash
docker compose down
rm -rf data/
rm -rf servers/
docker compose up -d
```

## Maintenance Mode

To perform maintenance:

```bash
# Stop all services
docker compose stop

# Perform maintenance (backups, updates, etc.)
# ...

# Start services
docker compose start
```

Or stop specific services:

```bash
# Stop only Minepanel (keeps servers running)
docker compose stop minepanel

# Restart
docker compose start minepanel
```

## Health Checks

### Container Health

```bash
# Check container status
docker compose ps

# Inspect container
docker inspect minepanel

# Check logs for errors
docker compose logs minepanel | grep -i error
```

### Service Health

```bash
# Test API endpoint
curl http://localhost:8091/api/health

# Test frontend
curl http://localhost:3000
```

## Best Practices

1. **Regular Backups** - Backup database and server data regularly
2. **Update Regularly** - Keep Minepanel and servers up to date
3. **Monitor Resources** - Watch disk space and memory usage
4. **Secure Passwords** - Change default passwords immediately
5. **Use HTTPS** - In production, always use SSL/TLS
6. **Document Changes** - Keep notes of custom configurations
7. **Test Restores** - Periodically test backup restoration

## Next Steps

- Configure [Networking & Remote Access](/networking)
- Set up [Server Types](/server-types)
- Review [Troubleshooting Guide](/troubleshooting)
