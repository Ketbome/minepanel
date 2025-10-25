# 🗺️ Roadmap

This page outlines the planned features and improvements for Minepanel. We're constantly working to make Minepanel the best Minecraft server management panel available.

## 🎯 High Priority Features

These are the features we're actively working on or planning to implement in the near future:

### Enhanced Log Viewer

**Status**: 📋 Planned

Improve the current log viewing experience with:

- **Advanced Filtering** - Filter logs by type (info, warning, error, debug)
- **Search Functionality** - Search through historical logs
- **Log Highlighting** - Better syntax highlighting for different log types
- **Export Logs** - Download logs in various formats (TXT, JSON)
- **Real-time Updates** - Live log streaming with auto-scroll control
- **Log Statistics** - View error counts and patterns
- **Multi-server Logs** - View logs from multiple servers simultaneously

### Server.properties Editor

**Status**: 📋 Planned

Edit `server.properties` directly from the web interface:

- **Visual Editor** - User-friendly form with field descriptions
- **Validation** - Real-time validation of configuration values
- **Tooltips** - Helpful tooltips for each property
- **Backup Before Save** - Automatic backup before applying changes
- **Diff View** - See what changed before applying
- **Syntax Highlighting** - Raw mode with syntax highlighting
- **Templates** - Pre-configured settings for common scenarios

**Use Cases**:

- Change game mode, difficulty, and world settings
- Configure server port and player limits
- Adjust view distance and simulation distance
- Enable/disable features like PvP, command blocks, etc.

### Reverse Proxy Integration

**Status**: 📋 Planned

Built-in reverse proxy configuration for better security and easier access:

- **Automatic Proxy Setup** - Configure NGINX or Caddy automatically
- **SSL/TLS Support** - Easy HTTPS setup with Let's Encrypt
- **Custom Domains** - Map custom domains to your servers
- **No Port Exposure** - Access servers without exposing ports
- **Load Balancing** - Distribute traffic across multiple instances
- **Access Logs** - View proxy access logs and statistics

**Benefits**:

- Improved security (no direct port exposure)
- Professional URLs instead of IP:PORT
- Easy SSL/TLS certificate management
- Better performance with caching

### CurseForge Modpack Browser

**Status**: 📋 Planned

Browse and install modpacks directly from CurseForge:

- **Modpack Search** - Search through thousands of modpacks
- **Advanced Filtering** - Filter by Minecraft version, mod loader, category
- **Modpack Details** - View description, screenshots, and changelog
- **One-Click Installation** - Install modpacks with a single click
- **Automatic Dependency Resolution** - Automatically install required mods
- **Update Notifications** - Get notified when modpack updates are available
- **Version Management** - Switch between modpack versions easily
- **Popular & Trending** - Browse popular and trending modpacks

**Supported Mod Loaders**:

- Forge
- Fabric
- NeoForge
- Quilt

## 🚀 Planned Features

Features we're planning for future releases:

### User Roles & Permissions

**Status**: 💡 Planned

Multi-user support with granular permissions:

- **Role-Based Access Control (RBAC)** - Define custom roles
- **Predefined Roles** - Admin, Moderator, Viewer
- **Per-Server Permissions** - Grant access to specific servers
- **Action Permissions** - Control who can start/stop servers, edit configs, etc.
- **Audit Logs** - Track user actions for security
- **User Management UI** - Easy user creation and management

### Server Templates

**Status**: 💡 Planned

Quick server deployment with pre-configured templates:

- **Official Templates** - Vanilla, Paper, Fabric, Forge configurations
- **Custom Templates** - Create and save your own templates
- **Template Marketplace** - Share templates with the community
- **Variable Substitution** - Customize templates during deployment
- **Version Compatibility** - Templates for different MC versions

**Example Templates**:

- Vanilla Survival Server
- Creative Building Server
- Modded Adventure Server (with popular mods)
- PvP Server
- Minigame Server

### Advanced Metrics Dashboard

**Status**: 💡 Planned

Detailed performance analytics and monitoring:

- **Performance Graphs** - CPU, RAM, Disk I/O over time
- **Player Statistics** - Active players, peak times, session duration
- **TPS Monitoring** - Track server TPS (Ticks Per Second)
- **Resource Alerts** - Get notified when resources are low
- **Historical Data** - View historical performance data
- **Comparison View** - Compare metrics across multiple servers
- **Export Data** - Export metrics for external analysis

### Discord Integration

**Status**: 💡 Planned

Connect Minepanel with Discord for notifications and control:

- **Webhook Notifications** - Get notified about server events
  - Server start/stop
  - Player join/leave
  - Server crashes
  - Backup completion
  - Resource alerts
- **Discord Bot Commands** - Control servers from Discord
- **Status Embed** - Rich embeds with server status
- **Customizable Messages** - Customize notification messages
- **Multiple Channels** - Different notifications to different channels

### API Documentation (Swagger)

**Status**: 💡 Planned

Complete API documentation for developers:

- **Interactive API Docs** - Swagger/OpenAPI specification
- **Try It Out** - Test API endpoints directly from docs
- **Code Examples** - Examples in multiple languages
- **Authentication Guide** - How to authenticate with the API
- **Webhooks Documentation** - Receive events via webhooks
- **Rate Limits** - API rate limit information

### Scheduled Tasks

**Status**: 💡 Planned

Automate server maintenance and operations:

- **Scheduled Restarts** - Restart servers at specific times
- **Automated Backups** - Schedule regular backups
- **Command Execution** - Run commands on a schedule
- **Maintenance Windows** - Schedule maintenance periods
- **Task History** - View execution history of scheduled tasks
- **Task Templates** - Pre-configured task templates

**Example Use Cases**:

- Daily server restarts at 4 AM
- Backup every 6 hours
- Send warning message before restart
- Clear dropped items weekly

### Plugin Manager

**Status**: 💡 Planned

Browse and manage plugins for Paper, Spigot, and Bukkit servers:

- **Plugin Repository** - Browse available plugins
- **Search & Filter** - Find plugins by category, popularity
- **One-Click Installation** - Install plugins easily
- **Update Management** - Update plugins with one click
- **Dependency Resolution** - Automatically install required dependencies
- **Plugin Configuration** - Edit plugin configs from the interface
- **Enable/Disable** - Toggle plugins without removing them

### World Manager

**Status**: 💡 Planned

Manage server worlds easily:

- **World Upload** - Upload custom worlds
- **World Download** - Download worlds for backup or local editing
- **Switch Worlds** - Switch between different worlds
- **World Templates** - Use pre-generated worlds
- **World Backup** - Automatic world-specific backups
- **World Info** - View world size, seed, game mode

### Whitelist & Banlist Editor

**Status**: 💡 Planned

Manage player access from the web interface:

- **Whitelist Management** - Add/remove players from whitelist
- **Ban Management** - Ban/unban players and IPs
- **Ban Reasons** - Add reasons for bans
- **Temporary Bans** - Set expiration dates for bans
- **Import/Export** - Import/export lists
- **Player Lookup** - Search by username or UUID
- **OP Management** - Manage server operators

## 💡 Under Consideration

Features we're considering for future development:

### Multi-Server Command Execution

Execute commands across multiple servers simultaneously:

- Select multiple servers
- Run the same command on all selected servers
- View aggregated results
- Save command presets for common operations

### Server Resource Limits

Configure resource limits per server:

- CPU limits
- RAM limits
- Disk space quotas
- Network bandwidth limits
- Container resource management

### Integrated RCON Console

Direct RCON access from the web interface:

- Real-time command execution
- Command history
- Auto-completion
- Syntax highlighting
- Save favorite commands

### Server Comparison View

Compare multiple servers side-by-side:

- Configuration comparison
- Performance metrics comparison
- Plugin/mod comparison
- Version comparison
- Quick configuration sync

### Export/Import Server Configurations

Backup and restore server configurations:

- Export server settings to JSON/YAML
- Import configurations to new servers
- Share configurations with others
- Configuration version control
- Bulk server setup

## 🤝 Want to Contribute?

We'd love your help in building these features! Here's how you can contribute:

1. **Pick a Feature** - Choose a feature you're interested in implementing
2. **Discuss First** - Open an issue to discuss your approach
3. **Follow Guidelines** - Check our [Contributing Guide](./development.md#contributing)
4. **Submit a PR** - Submit your pull request for review

## 📊 Vote on Features

Have a favorite feature from this list? Let us know!

- ⭐ [Star the project](https://github.com/Ketbome/minepanel) on GitHub
- 💬 [Join the discussion](https://github.com/Ketbome/minepanel/discussions) to vote on features
- 🐛 [Open an issue](https://github.com/Ketbome/minepanel/issues) to suggest new features

## 📅 Release Schedule

We follow a rolling release model:

- **Minor updates** - Every 2-3 weeks (bug fixes, small improvements)
- **Major features** - When ready (properly tested and documented)
- **Security updates** - Immediate release when needed

## 🔔 Stay Updated

Want to be notified about new features?

- Watch the [GitHub repository](https://github.com/Ketbome/minepanel)
- Check our [release notes](https://github.com/Ketbome/minepanel/releases)
- Follow [@Ketbome](https://github.com/Ketbome) on GitHub

---

_This roadmap is subject to change based on community feedback and project priorities. Feature status and timelines are estimates and may vary._

**Last Updated**: October 2025
