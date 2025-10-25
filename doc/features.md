# Features

Discover everything Minepanel can do to make managing Minecraft servers easier.

![Minepanel Server Management](/public/img/modes.png)

## 🚀 Server Management

### Multiple Server Support

Run as many Minecraft servers as your hardware can handle. Each server runs in its own isolated Docker container.

- **No interference** - Servers are completely isolated from each other
- **Independent control** - Start, stop, restart any server individually
- **Easy management** - All servers visible from one dashboard
- **Resource allocation** - Assign specific CPU and RAM to each server

### All Server Types

Minepanel supports all major Minecraft server types:

| Type         | Description                   | Use Case                  |
| ------------ | ----------------------------- | ------------------------- |
| **Vanilla**  | Official Minecraft server     | Pure vanilla experience   |
| **Paper**    | High-performance Spigot fork  | Best for survival servers |
| **Spigot**   | Bukkit-based server           | Plugin support            |
| **Purpur**   | Paper fork with more features | Advanced customization    |
| **Fabric**   | Lightweight modding platform  | Modern mods               |
| **Forge**    | Popular modding platform      | Traditional mods          |
| **NeoForge** | Modern Forge fork             | Latest modding features   |
| **Quilt**    | Fabric alternative            | Experimental mods         |
| **Sponge**   | Plugin API for Forge/Fabric   | Mods + plugins            |

### Version Management

- **Any version** - From old (1.8) to latest (1.21+)
- **Snapshots** - Run experimental snapshots
- **Automatic updates** - Keep servers up to date
- **Pin versions** - Lock to specific version

### CurseForge Modpack Support

Install modpacks directly from CurseForge:

1. Get the modpack URL from CurseForge
2. Paste it in the server creation form
3. Minepanel downloads and configures everything
4. Server ready in minutes!

Supported:

- ✅ All CurseForge Minecraft modpacks
- ✅ Automatic mod installation
- ✅ Correct Forge/Fabric version
- ✅ Required libraries and dependencies

---

## 📊 Real-time Monitoring

### Server Status

See at a glance:

- 🟢 Running / 🔴 Stopped / 🟡 Starting
- Current player count
- Server version and type
- Uptime
- CPU usage
- Memory usage (RAM)

### Live Logs

View server logs in real-time with powerful features:

- **Live streaming** - Logs appear instantly as they happen
- **Error detection** - Errors highlighted in red
- **Search/filter** - Find specific log entries
- **Auto-scroll** - Follows new logs automatically
- **Download logs** - Save logs for troubleshooting
- **Clear view** - Clean, readable formatting

::: tip Log Colors

- 🔴 **Red** - Errors and critical issues
- 🟡 **Yellow** - Warnings
- ⚪ **White** - Info messages
- 🟢 **Green** - Success messages
  :::

### Resource Monitoring

Track your server's performance:

- **CPU Usage** - Real-time CPU percentage
- **Memory (RAM)** - Current usage vs. limit
- **Disk Space** - World file sizes
- **Network** - Players connected
- **Historical data** - See usage over time

---

## 🎮 Server Control

### Basic Controls

Simple, intuitive controls for your servers:

- **Start** - Launch the server
- **Stop** - Gracefully shut down
- **Restart** - Quick restart without reconfiguration
- **Force Stop** - Emergency stop if server hangs

### Console Access

Send commands directly to the Minecraft server console:

```
/say Hello players!
/whitelist add Steve
/op Alex
/save-all
/stop
```

- Command history
- Auto-complete (coming soon)
- Quick commands sidebar

### Player Management

- View online players
- Kick/ban players
- Whitelist management
- Op (operator) management
- Player stats

---

## 📁 File Management

### Integrated File Browser

Edit server files directly from your browser:

- **Edit configs** - server.properties, bukkit.yml, etc.
- **Upload files** - Mods, plugins, worlds
- **Download files** - Backup specific files
- **Create/delete** - Manage folders and files
- **Permissions** - Set file permissions

::: tip Supported File Types
The integrated file browser supports editing:

- `.properties` - Server configs
- `.yml` / `.yaml` - Plugin configs
- `.json` - Data files
- `.txt` - Text files
- `.log` - Log files
  :::

### Quick Config Access

Common files are one click away:

- `server.properties` - Main server configuration
- `eula.txt` - License agreement
- `ops.json` - Server operators
- `whitelist.json` - Whitelisted players
- `banned-players.json` - Banned players

---

## 💾 Backup System

### Automatic Backups

Powered by [itzg/docker-mc-backup](https://github.com/itzg/docker-mc-backup):

- **Scheduled backups** - Automatic backups at set intervals
- **World saves** - Complete world data
- **Incremental backups** - Only save changes
- **Compression** - Saves disk space
- **Retention policy** - Keep last N backups

### Manual Backups

Create backups anytime:

1. Go to server settings
2. Click "Create Backup"
3. Backup is created instantly
4. Download or restore later

### Restore from Backup

Easy one-click restore:

1. View available backups
2. Select backup to restore
3. Confirm restoration
4. Server restored in seconds

---

## ⚙️ Advanced Configuration

### Server Settings

Comprehensive settings available from the web interface:

**General Settings:**

- Server name and description
- MOTD (Message of the Day)
- Max players
- Difficulty (Peaceful, Easy, Normal, Hard)
- Game mode (Survival, Creative, Adventure)
- PvP enabled/disabled

**World Settings:**

- Seed
- World type (Default, Flat, Amplified, etc.)
- Generate structures
- Spawn protection
- View distance
- Simulation distance

**Network Settings:**

- Server port
- RCON port
- Query port
- Enable/disable RCON

**Performance Settings:**

- Memory allocation (RAM)
- CPU cores
- JVM arguments
- Garbage collection tuning

### Plugin/Mod Management

- Upload plugins/mods via web interface
- Enable/disable plugins
- View plugin list
- Auto-update plugins (coming soon)

### JVM Configuration

Optimize Java Virtual Machine:

```bash
# Example JVM args
-Xms2G -Xmx4G
-XX:+UseG1GC
-XX:+ParallelRefProcEnabled
-XX:MaxGCPauseMillis=200
-XX:+UnlockExperimentalVMOptions
-XX:+DisableExplicitGC
-XX:G1NewSizePercent=30
-XX:G1MaxNewSizePercent=40
-XX:G1HeapRegionSize=8M
```

Pre-configured profiles available:

- **Default** - Balanced settings
- **High Performance** - For powerful servers
- **Low Memory** - For limited RAM
- **Modded** - Optimized for mods

---

## 🌍 Multi-Language Support

Minepanel is available in multiple languages:

- 🇬🇧 **English**
- 🇪🇸 **Spanish (Español)**
- 🇫🇷 **French** (coming soon)
- 🇩🇪 **German** (coming soon)
- 🇵🇹 **Portuguese** (coming soon)

Switch language:

1. Click the language icon in the header
2. Select your preferred language
3. Interface updates instantly

Want to help translate? [Contribute on GitHub](https://github.com/Ketbome/minepanel)!

---

## 🔒 Security Features

### Authentication

- Secure bcrypt password hashing
- Session management
- Auto-logout on inactivity

### Docker Isolation

- Each server in its own container
- Network isolation
- Resource limits prevent one server from affecting others

### File Permissions

- Separate Filebrowser authentication
- User-specific access control (coming soon)
- Read-only mode for sensitive files

---

## 🎨 User Interface

### Modern Design

- **Clean interface** - No clutter, easy to navigate
- **Responsive** - Works on desktop, tablet, and mobile
- **Dark mode** - Easy on the eyes
- **Minecraft-themed** - Familiar aesthetic
- **Fast** - Built with Next.js for speed

### Dashboard

Your control center:

- Server cards with status
- Quick actions
- Resource overview
- Recent logs
- System stats

### Server Page

Everything for one server:

- **Tabbed interface** - Settings, logs, resources, mods
- **Real-time updates** - No page refreshes needed
- **Keyboard shortcuts** - Work faster
- **Breadcrumbs** - Always know where you are

---

## 🔧 Developer Features

### REST API

All functionality available via API:

```bash
# Get all servers
GET /api/servers

# Start a server
POST /api/servers/:id/start

# Get server logs
GET /api/servers/:id/logs
```

### Webhooks

Get notified about server events:

- Server started/stopped
- Player joined/left
- Crash detected
- Backup completed

### Docker Labels

Minepanel uses Docker labels for server management:

```yaml
labels:
  - "minepanel.server=true"
  - "minepanel.name=my-server"
  - "minepanel.type=PAPER"
```

---

## 📈 Planned Features

Features coming in future releases:

- [ ] **User roles** - Multiple users with different permissions
- [ ] **Server templates** - Save and reuse configurations
- [ ] **Metrics dashboard** - Advanced performance graphs
- [ ] **Discord webhooks** - Notifications to Discord
- [ ] **Scheduled tasks** - Auto-restart, backups, commands
- [ ] **Plugin marketplace** - Browse and install plugins
- [ ] **SFTP access** - Transfer files with FTP client
- [ ] **Server groups** - Organize servers into categories
- [ ] **Resource packs** - Upload and manage resource packs
- [ ] **Mobile app** - Native mobile experience

Vote for features or suggest new ones on [GitHub Discussions](https://github.com/Ketbome/minepanel/discussions)!

---

## Platform Support

### Architecture

Minepanel runs on:

- ✅ **x86_64 (amd64)** - Intel/AMD processors
- ✅ **arm64 (aarch64)** - ARM processors
  - Raspberry Pi 4/5
  - Apple Silicon (M1/M2/M3/M4)
  - AWS Graviton
  - Oracle Cloud ARM

### Operating Systems

- ✅ **Linux** - Ubuntu, Debian, CentOS, Arch, etc.
- ✅ **macOS** - Intel and Apple Silicon
- ✅ **Windows** - Via WSL2

### System Requirements

**Minimum:**

- 2GB RAM
- 2 CPU cores
- 10GB disk space
- Docker 20.10+

**Recommended:**

- 4GB+ RAM (more for multiple servers)
- 4+ CPU cores
- 50GB+ SSD storage
- Docker 24.0+

**Per Minecraft Server:**

- 1-2GB RAM (Vanilla/Paper)
- 2-4GB RAM (Modded)
- 1 CPU core minimum

---

## Comparison

How Minepanel compares to alternatives:

| Feature                 | Minepanel  | Pterodactyl | AMP       | Multicraft |
| ----------------------- | ---------- | ----------- | --------- | ---------- |
| **Open Source**         | ✅ MIT     | ✅ MIT      | ❌ Paid   | ❌ Paid    |
| **One-command install** | ✅         | ❌ Complex  | ❌        | ❌         |
| **Multi-architecture**  | ✅         | ⚠️ Limited  | ❌        | ❌         |
| **Docker native**       | ✅         | ✅          | ❌        | ❌         |
| **Modern UI**           | ✅ Next.js | ✅ React    | ⚠️        | ❌         |
| **Resource monitoring** | ✅         | ✅          | ✅        | ✅         |
| **File browser**        | ✅         | ✅          | ✅        | ✅         |
| **Multi-language**      | ✅         | ⚠️ Limited  | ✅        | ✅         |
| **Setup difficulty**    | 🟢 Easy    | 🔴 Hard     | 🟡 Medium | 🟡 Medium  |

---

## Next Steps

- 🏗️ [Understand the Architecture](/architecture)
- ⚙️ [Configure Your Setup](/configuration)
- 🛠️ [Development Guide](/development)
- ❓ [Frequently Asked Questions](/faq)
