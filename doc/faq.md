# Frequently Asked Questions (FAQ)

Common questions and answers about Minepanel.

## General Questions

### What is Minepanel?

Minepanel is a modern web-based control panel for managing multiple Minecraft servers using Docker containers. It provides an easy-to-use interface for creating, configuring, and monitoring Minecraft servers without needing command-line knowledge.

### Is Minepanel free?

Yes! Minepanel is completely free and open-source under the MIT license. You can use it for personal or commercial purposes without any restrictions.

### What makes Minepanel different from other panels?

- **One-command installation** - Get started in seconds
- **Modern UI** - Built with Next.js for a smooth experience
- **Docker native** - Each server runs isolated in its own container
- **Multi-architecture** - Works on x86, ARM, Raspberry Pi, and Apple Silicon
- **Easy to use** - No complex configurations needed

### Who should use Minepanel?

Minepanel is perfect for:

- Server admins managing multiple Minecraft servers
- Players who want to easily run servers for friends
- Developers testing mods/plugins
- Anyone tired of managing servers via terminal

---

## Installation & Setup

### What are the system requirements?

**Minimum:**

- 2GB RAM
- 2 CPU cores
- 10GB disk space
- Docker 20.10+
- Docker Compose v2.0+

**Recommended:**

- 4GB+ RAM (more for multiple servers)
- 4+ CPU cores
- 50GB+ SSD storage
- Docker 24.0+

### Can I run Minepanel on Windows?

Yes! Use **Windows with WSL2** (Windows Subsystem for Linux):

1. Install WSL2
2. Install Docker Desktop for Windows
3. Enable WSL2 integration in Docker Desktop
4. Run Minepanel inside WSL2 (Ubuntu)

::: tip
Use WSL2's native filesystem for better performance: `/home/username/minepanel`
:::

### Can I run it on a Raspberry Pi?

Yes! Minepanel supports ARM64 architecture. It works on:

- Raspberry Pi 4 (4GB+ RAM recommended)
- Raspberry Pi 5
- Other ARM-based devices

Docker automatically pulls the correct ARM image.

### Does it work on macOS?

Yes! Minepanel works on both Intel and Apple Silicon (M1/M2/M3/M4) Macs. Just install Docker Desktop for Mac and follow the standard installation.

### Do I need to know Docker?

No! Minepanel handles all Docker operations for you. However, basic Docker knowledge can help with troubleshooting.

### How do I update Minepanel?

```bash
# Pull latest image
docker pull ketbom/minepanel:latest

# Recreate container
docker compose up -d

# Clean old images
docker image prune
```

Your server data is preserved during updates.

---

## Security

### How secure is Minepanel?

Minepanel implements several security measures:

- bcrypt password hashing (12 rounds)
- JWT token authentication
- httpOnly cookies to prevent XSS
- Input validation and sanitization
- Docker container isolation

### Should I expose Minepanel to the internet?

**Not recommended without additional security!** If you must:

- ✅ Use strong, unique passwords
- ✅ Set up HTTPS/SSL with reverse proxy
- ✅ Use Cloudflare Tunnel or VPN
- ✅ Enable firewall rules
- ✅ Keep Minepanel updated
- ❌ Never expose with default credentials

**Better option:** Use a VPN (WireGuard, Tailscale) for remote access.

### Can I add multiple users?

Not yet, but multi-user support is planned! Currently, Minepanel uses a single admin account.

### Is the Docker socket access safe?

Direct Docker socket access can be risky as it provides root-level access. Minepanel is designed with minimal privileges, but for maximum security, consider using a [Docker Socket Proxy](https://github.com/Tecnativa/docker-socket-proxy).

---

## Server Management

### How many servers can I run?

As many as your hardware can support! Each server uses:

- **Vanilla/Paper**: 1-2GB RAM, 1 CPU core
- **Modded (light)**: 2-4GB RAM, 1-2 CPU cores
- **Modded (heavy)**: 4-8GB RAM, 2-4 CPU cores

**Example:** A server with 16GB RAM can comfortably run 4-6 Minecraft servers.

### What server types are supported?

All major types:

- Vanilla
- Paper (recommended for survival)
- Spigot
- Purpur
- Fabric
- Forge
- NeoForge
- Quilt
- Sponge

### Can I install modpacks?

Yes! Minepanel supports **CurseForge modpacks**:

1. Get the modpack URL from CurseForge
2. Paste it when creating a server
3. Minepanel downloads and installs everything automatically

### Can I upload my own mods/plugins?

Yes! Use the integrated **File Browser**:

1. Open Filebrowser (port 8080)
2. Navigate to your server folder
3. Go to `plugins/` (for plugins) or `mods/` (for mods)
4. Upload your files
5. Restart the server

### How do I change server.properties?

**Method 1 - Web Interface:**

1. Click on your server
2. Go to Settings tab
3. Edit values in the form
4. Save changes

**Method 2 - File Browser:**

1. Open Filebrowser (port 8080)
2. Navigate to your server
3. Edit `server.properties`
4. Save and restart server

### Can I migrate existing servers?

Yes! Copy your existing server files to the `servers/` directory **inside the `mc-data` folder**:

```bash
servers/
└── my-old-server/
    └── mc-data/
        ├── world/
        ├── server.properties
        ├── ops.json
        ├── banned-players.json
        ├── banned-ips.json
        ├── whitelist.json
        └── ...
```

**Important:** Minepanel uses a `mc-data` subfolder to organize server files. This differs from itzg/docker-minecraft-server's flat structure.

**Migration steps:**

1. **Choose a server ID/name** (e.g., `my-old-server`) - this will be used everywhere
2. Create the server directory: `mkdir -p servers/my-old-server/mc-data`
3. Copy your itzg server files into `mc-data/`:
   ```bash
   cp -r /path/to/old-server/* servers/my-old-server/mc-data/
   ```
4. **Create a server in Minepanel with EXACTLY the same name** (`my-old-server`)
   - Minepanel will generate the docker-compose.yml automatically
   - The `container_name` and `ID_MANAGER` will match your server ID
5. Start the server - it will use your existing world and configs

**Example of correct naming:**

- Folder: `servers/test/`
- Server name in Minepanel: `test`
- Generated docker-compose.yml will have:
  ```yaml
  container_name: test
  environment:
    ID_MANAGER: test
  ```

**Important:** The generated `docker-compose.yml` must have the **complete path** to `mc-data/` and **matching names**. Minepanel handles this automatically, but if you're manually creating/editing docker-compose files:

```yaml
services:
  mc:
    image: itzg/minecraft-server:latest
    container_name: my-old-server # ⚠️ Must match server ID
    environment:
      ID_MANAGER: my-old-server # ⚠️ Must match server ID
      EULA: "TRUE"
      TYPE: "PAPER"
      # ... other env vars
    volumes:
      - ./mc-data:/data # ✅ Correct - points to mc-data subfolder
      - ./modpacks:/modpacks:ro
    ports:
      - "25565:25565"
```

**Critical: `container_name` and `ID_MANAGER` MUST match the server folder name.**

If your server is in `servers/test/`:

```yaml
container_name: test # ✅ Matches folder name
environment:
  ID_MANAGER: test # ✅ Matches folder name
```

**Incorrect examples:**

```yaml
# Wrong volume paths
volumes:
  - ./:/data # ❌ Points to root, not mc-data
  - /data:/data # ❌ Absolute path
  - ./world:/data # ❌ Only mounts world folder

# Wrong naming
container_name: minecraft # ❌ Doesn't match server ID
ID_MANAGER: server1 # ❌ Doesn't match server ID
```

**Automatic migration:** As of the latest version, Minepanel will automatically detect and migrate server files if you accidentally place them in the wrong location (root folder instead of `mc-data/`). This fixes a common issue when migrating from itzg/docker-minecraft-server.

---

### Migration Naming Example (Complete)

Let's say you want to migrate a server called `survival-world`:

**1. File structure:**

```
servers/
└── survival-world/           ← Folder name
    ├── docker-compose.yml
    └── mc-data/
        ├── world/
        ├── server.properties
        └── ...
```

**2. In Minepanel UI:**

- Create server with ID: `survival-world`

**3. Generated docker-compose.yml:**

```yaml
services:
  mc:
    container_name: survival-world # ← Same as folder
    environment:
      ID_MANAGER: survival-world # ← Same as folder
      SERVER_NAME: survival-world
    volumes:
      - ./mc-data:/data # ← Points to mc-data
```

**Everything must match:**

- ✅ Folder: `servers/survival-world/`
- ✅ Server ID in Minepanel: `survival-world`
- ✅ `container_name`: `survival-world`
- ✅ `ID_MANAGER`: `survival-world`

**What happens if they don't match:**

- ❌ Minepanel can't find/control the container
- ❌ Server status shows as "not found"
- ❌ Start/stop buttons won't work

### Why does Minepanel use a different folder structure than itzg?

Minepanel organizes server files into subfolders for better management:

```
servers/my-server/
├── docker-compose.yml    # Server configuration (source of truth)
├── mc-data/              # Minecraft server files (mounted to /data)
├── backups/              # Server backups
└── modpacks/             # Modpack files (if applicable)
```

This structure provides:

- **Clean separation** between config, data, and backups
- **Easier backups** - backup just `mc-data/` without compose files
- **Better organization** - especially with multiple servers
- **Modpack support** - dedicated folder for modpack files

**Note:** Server configuration is stored in `docker-compose.yml` files, not in a separate database. Minepanel reads these files and Docker container metadata to display server information, making it mostly stateless regarding server data.

### How do I backup my servers?

**Automatic backups:**
Configure backups in server settings (powered by itzg/docker-mc-backup).

**Manual backup:**

```bash
# Stop server first
docker compose down

# Backup
tar -czf backup-$(date +%Y%m%d).tar.gz servers/

# Restart
docker compose up -d
```

### How do I restore from backup?

```bash
# Stop services
docker compose down

# Extract backup
tar -xzf backup-20241024.tar.gz

# Restart
docker compose up -d
```

---

## Troubleshooting

### Ports are already in use

**Error:** `port is already allocated`

**Solution:**

1. Find what's using the port:

   ```bash
   # Linux/Mac
   sudo lsof -i :3000

   # Windows (PowerShell)
   netstat -ano | findstr :3000
   ```

2. Kill the process or use different ports:
   ```bash
   # Create .env file
   FRONTEND_PORT=3001
   BACKEND_PORT=8092
   ```

### Can't connect to Docker

**Error:** `Cannot connect to Docker daemon`

**Solution:**

```bash
# Check Docker is running
docker ps

# Add user to docker group (Linux)
sudo usermod -aG docker $USER
# Log out and back in

# Restart Docker (if needed)
sudo systemctl restart docker
```

### Filebrowser password lost

**Solution:**

```bash
# Delete database to generate new password
docker compose down
rm -rf filebrowser-data/filebrowser.db
docker compose up -d

# Check logs for new password
docker compose logs filebrowser
```

### Server won't start

**Check logs:**

```bash
docker compose logs minepanel
```

**Common causes:**

- EULA not accepted (Minepanel auto-accepts)
- Insufficient memory
- Port already in use
- Corrupt world files
- Wrong server type/version

### Server keeps restarting

**Check server logs:**

1. Open Minepanel
2. Go to your server
3. View Logs tab

**Common causes:**

- Out of memory
- Incompatible mods/plugins
- Java version mismatch
- Corrupted world

### High CPU/RAM usage

**Solutions:**

- Reduce view distance in server.properties
- Lower max players
- Optimize JVM arguments
- Use Paper instead of Vanilla
- Add more RAM to server
- Remove unnecessary plugins/mods

### Minecraft server not visible in server list

**Check:**

1. Server is running (green status)
2. Port is exposed and correct (default 25565)
3. Firewall allows the port
4. Using correct IP address
5. Server is in online mode (if needed)

**Port forwarding (for external access):**

- Forward port 25565 on your router
- Use your public IP address
- Consider using a dynamic DNS service

### Changes not taking effect

**Solution:**

```bash
# Restart services
docker compose restart

# Or force recreate
docker compose up -d --force-recreate
```

---

## Features & Functionality

### Can I access server console?

Yes! Each server page has a console tab where you can:

- View real-time logs
- Execute commands
- See player chat
- Monitor errors

### Does it support server icons?

Yes! Place a `server-icon.png` (64x64) in your server directory via Filebrowser.

### Can I schedule backups?

Yes! Configure automatic backups in server settings with:

- Backup interval (hourly, daily, etc.)
- Retention policy (keep last N backups)
- Compression options

### Does it support RCON?

The underlying Minecraft server supports RCON. You can enable it in server settings and use any RCON client to connect.

### Can I transfer servers between Minepanel instances?

Yes! Your servers are just Docker containers with data in `servers/` directory:

1. Backup servers on old instance
2. Copy `servers/` directory to new instance
3. Restart Minepanel on new instance
4. Servers will be automatically detected

### Does it work with BungeeCord/Velocity?

Yes! You can create multiple servers and set up a proxy:

1. Create your game servers (lobby, survival, creative, etc.)
2. Create a BungeeCord/Velocity server
3. Configure the proxy to connect to your servers
4. Players connect to the proxy server

---

## Performance

### How much RAM do I need?

**Per Minecraft server:**

- Vanilla/Paper (5-10 players): 1-2GB
- Vanilla/Paper (10-20 players): 2-4GB
- Light modpack (5-10 players): 2-4GB
- Heavy modpack (5-10 players): 4-8GB

**For Minepanel itself:**

- Frontend + Backend: ~500MB

### Can I run this on a VPS?

Yes! Many users run Minepanel on VPS providers:

- DigitalOcean
- Linode
- Vultr
- AWS
- Google Cloud
- Oracle Cloud (free tier!)
- Hetzner

Choose a VPS with enough RAM for your servers.

### What's the best server type for performance?

**Paper** is recommended for survival servers:

- Better performance than Vanilla
- Plugin support (Bukkit/Spigot plugins)
- Active development
- Large community

For modded, use **Fabric** (lightweight) or **Forge** (more mods available).

---

## Development & Contributing

### How can I contribute?

We welcome contributions!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

See [Development Guide](/development) for details.

### Where can I report bugs?

[GitHub Issues](https://github.com/Ketbome/minepanel/issues)

Please include:

- Minepanel version
- Operating system
- Docker version
- Steps to reproduce
- Error messages/logs

### Can I translate Minepanel to my language?

Yes! We need translators. Create a translation file in `frontend/src/lib/translations/` and submit a PR.

Current languages:

- English (en)
- Spanish (es)

Planned:

- French (fr)
- German (de)
- Portuguese (pt)

### Is there an API?

Yes! The backend exposes a REST API. API documentation is coming soon.

### Can I build custom features?

Absolutely! Minepanel is open-source. Fork it and customize as needed. We'd love to see your contributions merged back!

---

## Comparison with Alternatives

### Minepanel vs Pterodactyl

| Feature            | Minepanel           | Pterodactyl       |
| ------------------ | ------------------- | ----------------- |
| Installation       | 🟢 Very easy        | 🔴 Complex        |
| UI                 | 🟢 Modern (Next.js) | 🟢 Modern (React) |
| Multi-architecture | 🟢 Yes              | 🟡 Limited        |
| Game support       | 🔴 Minecraft only   | 🟢 Multiple games |
| Setup time         | < 5 minutes         | 1-2 hours         |

**Use Minepanel if:** You want easy Minecraft-specific management

**Use Pterodactyl if:** You need to manage multiple game types

### Minepanel vs AMP

| Feature     | Minepanel    | AMP       |
| ----------- | ------------ | --------- |
| Price       | 🟢 Free      | 🔴 Paid   |
| Open source | 🟢 Yes       | 🔴 No     |
| Setup       | 🟢 Very easy | 🟡 Medium |
| Features    | 🟡 Growing   | 🟢 Mature |

**Use Minepanel if:** You want free and open-source

**Use AMP if:** You want enterprise features and support

### Minepanel vs Multicraft

| Feature | Minepanel | Multicraft  |
| ------- | --------- | ----------- |
| Price   | 🟢 Free   | 🔴 Paid     |
| UI      | 🟢 Modern | 🔴 Outdated |
| Docker  | 🟢 Native | 🔴 No       |
| Setup   | 🟢 Easy   | 🟡 Medium   |

**Use Minepanel if:** You want modern UI and Docker containers

**Use Multicraft if:** You need traditional shared hosting features

---

## Support

### Where can I get help?

- 📚 [Documentation](https://github.com/Ketbome/minepanel/tree/main/doc)
- 💬 [GitHub Discussions](https://github.com/Ketbome/minepanel/discussions)
- 🐛 [GitHub Issues](https://github.com/Ketbome/minepanel/issues)

### Is there a Discord server?

Not yet! For now, use GitHub Discussions for community support.

### How can I support the project?

- ⭐ Star the project on GitHub
- 🐛 Report bugs and issues
- 💡 Suggest features
- 🔧 Contribute code
- 📖 Improve documentation
- 🌍 Help with translations
- 💰 Sponsor (coming soon)

---

## Roadmap

### What features are planned?

- [ ] Multi-user support with roles
- [ ] Server templates
- [ ] Advanced metrics dashboard
- [ ] Discord webhooks
- [ ] Scheduled tasks
- [ ] Plugin marketplace
- [ ] SFTP access
- [ ] Mobile app
- [ ] More languages

Vote for features or suggest new ones on [GitHub Discussions](https://github.com/Ketbome/minepanel/discussions)!

### When will X feature be added?

Minepanel is actively developed. Check the [GitHub Issues](https://github.com/Ketbome/minepanel/issues) for progress on specific features.

---

## Still Have Questions?

If your question isn't answered here:

1. Check the [full documentation](/getting-started)
2. Search [GitHub Issues](https://github.com/Ketbome/minepanel/issues)
3. Ask on [GitHub Discussions](https://github.com/Ketbome/minepanel/discussions)
4. Create a new issue if it's a bug

We're here to help! 🎉
