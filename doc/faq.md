---
title: FAQ - Minepanel
description: Frequently asked questions about Minepanel. Installation, server management, networking, security, performance, and troubleshooting answers.
head:
  - - meta
    - property: og:title
      content: Minepanel FAQ
  - - meta
    - property: og:description
      content: Common questions about Minepanel. Requirements, supported servers, mods, remote access, and more.
---

# FAQ - Frequently Asked Questions

Quick answers to common questions. For detailed guides, see the linked documentation.

## 🚀 Getting Started

### What is Minepanel?

A modern web-based control panel for managing multiple Minecraft servers using Docker. Easy to use, no command-line knowledge required.

### Is it free?

Yes! Completely free and open-source (MIT license).

### What are the requirements?

- **Minimum**: 2GB RAM, 2 CPU cores, 10GB disk
- **Recommended**: 4GB+ RAM, 4+ CPU cores, 50GB+ SSD
- Docker 20.10+ and Docker Compose v2.0+

**→ Full requirements:** [Installation Guide](/installation)

### What platforms are supported?

- ✅ Linux (Ubuntu, Debian, CentOS, Fedora, Arch)
- ✅ Windows (with WSL2)
- ✅ macOS (Intel & Apple Silicon)
- ✅ Raspberry Pi (ARM64)
- ✅ Any x86_64 or ARM64 system with Docker

### How do I install it?

```bash
git clone https://github.com/Ketbome/minepanel.git
cd minepanel
docker compose up -d
```

**→ Full guide:** [Installation Guide](/installation)

### How do I update it?

```bash
docker compose pull
docker compose up -d
```

Your data is preserved during updates.

## 🎮 Server Management

### What server types are supported?

Vanilla, Fabric, Forge, Paper, Spigot, Bukkit, Purpur, Pufferfish, Folia, Leaf, and CurseForge modpacks.

**→ Details:** [Server Types Guide](/server-types)

### Can I run multiple servers?

Yes! Run as many as your hardware allows. Each server is isolated in its own Docker container.

### How do I add mods?

Use Modrinth or CurseForge integration for automatic mod downloads and updates.

**→ Full guide:** [Mods & Plugins](/mods-plugins)

### Can I import existing servers?

Yes! Copy your existing server data to `servers/your-server/mc-data` and create the server in Minepanel.

### How do I backup my servers?

Enable automatic backups in server settings, or backup manually via the UI.

**→ Details:** [Administration Guide](/administration#server-backups)

### Can I schedule restarts?

Not yet directly in the UI, but you can use Docker restart policies and cron jobs.

**→ Planned:** [Roadmap](/roadmap)

## 🌐 Networking & Access

### How do I access it remotely?

Update `FRONTEND_URL` to your public IP or domain, open firewall ports, and optionally set up SSL.

**→ Full guide:** [Networking Guide](/networking)

### How do I set up HTTPS/SSL?

Use a reverse proxy (Nginx/Caddy) with Let's Encrypt certificates.

**→ Step-by-step:** [SSL/HTTPS Setup](/networking#ssl-https)

### Can I use a custom domain?

Yes! Configure your DNS, set up a reverse proxy, and update environment variables.

**→ Guide:** [Domain Setup](/networking#using-a-domain-name)

### How do I configure LAN access?

Configure your LAN IP through the web UI at **Settings → Network Settings** to show LAN connection info to players.

**→ Details:** [Network Settings](/networking#network-settings)

### What ports does it use?

- **3000**: Web interface
- **8091**: API server
- **8080**: File browser
- **25565+**: Minecraft servers

**→ Port management:** [Port Configuration](/networking#port-configuration)

## 🔐 Security & Admin

### How do I change the admin password?

Go to profile → Change Password in the UI.

**→ Full guide:** [Password Management](/administration#password-management)

### I forgot my password, what do I do?

Reset the database or manually update via SQL.

**→ Recovery steps:** [Forgot Password](/administration#forgot-your-password)

### Is it secure?

Yes, with proper configuration:

- Change default passwords immediately
- Use HTTPS for remote access
- Keep firewall configured properly
- Update regularly

**→ Best practices:** [Security Guide](/networking)

### Can I have multiple users?

Not yet. Multi-user support with permissions is planned.

**→ Roadmap:** [Roadmap](/roadmap)

### Where is data stored?

- **Database**: `./data/minepanel.db`
- **Server files**: `./servers/`
- **Backups**: Configurable per server

**→ Database management:** [Administration Guide](/administration#database-management)

## 🔧 Configuration

### How do I change ports?

Edit `.env` file or `docker-compose.yml`:

```bash
FRONTEND_PORT=3000
BACKEND_PORT=8091
```

**→ Full guide:** [Configuration Reference](/configuration)

### Can I use custom Java versions?

Yes! Use different Docker image tags (java8, java17, java21, etc.)

**→ Details:** [Server Types](/server-types)

### How do I set resource limits?

Configure CPU and memory limits in server settings.

**→ Guide:** [Resource Management](/administration#resource-management)

### Can I use custom JVM flags?

Yes! Add them in the server's advanced settings.

**→ Configuration:** [Configuration Reference](/configuration)

## ⚡ Performance

### How many servers can I run?

Depends on your hardware. General guideline:

- **4GB RAM**: 1-2 small servers
- **8GB RAM**: 2-4 medium servers
- **16GB+ RAM**: 4+ servers or large modded servers

### Why is my server slow?

Common causes:

- Insufficient RAM/CPU
- Too many players/mods
- HDD instead of SSD
- High view distance

**→ Optimization:** [Troubleshooting - Performance](/troubleshooting#performance-issues)

### Should I use Vanilla or Paper?

- **Vanilla**: Pure Minecraft experience
- **Paper**: Better performance, plugin support

**→ Comparison:** [Server Types](/server-types)

### How do I reduce memory usage?

- Lower view distance
- Use Paper/Purpur
- Enable Aikar's flags
- Reduce max players

**→ Full guide:** [Performance Optimization](/troubleshooting#performance-issues)

## 🐛 Troubleshooting

### Server won't start

Check logs for specific errors. Common issues:

- Port conflicts
- Insufficient memory
- Missing EULA acceptance
- Corrupted files

**→ Solutions:** [Troubleshooting Guide](/troubleshooting#server-wont-start)

### Can't access from remote

1. Check `FRONTEND_URL` matches your access URL
2. Verify firewall ports are open
3. Check router port forwarding

**→ Full guide:** [Connection Issues](/troubleshooting#connection-issues)

### CORS errors in browser console

Your `FRONTEND_URL` doesn't match how you're accessing the panel. Update it and restart.

**→ Fix:** [CORS Errors](/troubleshooting#cors-errors)

### Mods not downloading

- Verify API key (CurseForge)
- Check project names
- Ensure version compatibility
- Check server logs

**→ Solutions:** [Mod Issues](/troubleshooting#mod-plugin-issues)

### Docker errors

```bash
# Check Docker is running
docker ps

# View logs
docker compose logs

# Restart everything
docker compose restart
```

**→ Full troubleshooting:** [Troubleshooting Guide](/troubleshooting)

## 📦 Features

### Does it support modpacks?

Yes! CurseForge modpacks are fully supported with automatic installation.

**→ Setup:** [CurseForge Modpacks](/server-types#curseforge-modpacks)

### Can I use Fabric mods?

Yes! Fabric is fully supported with Modrinth and CurseForge integration.

**→ Guide:** [Fabric Server Setup](/server-types#fabric)

### Is there a mobile app?

Not yet, but the web UI is mobile-friendly.

**→ Planned:** [Roadmap](/roadmap)

### Can I use plugins?

Yes! Paper, Spigot, Bukkit, and other plugin-based servers are supported.

**→ Details:** [Plugin Management](/mods-plugins#plugin-management)

### Does it have automatic backups?

Yes! Configure backup frequency, retention, and method per server.

**→ Setup:** [Backup Configuration](/administration#server-backups)

### Can I edit server.properties?

Yes! Use the built-in file browser or edit directly in the UI (coming soon).

## 💻 Development

### Can I contribute?

Yes! Contributions are welcome. See the contributing guidelines.

**→ Guide:** [Development Guide](/development)

### Is there an API?

Yes! The backend provides a REST API for all operations.

**→ Documentation:** Coming soon

### Can I customize the UI?

Yes! The project is open-source. Fork and modify as needed.

**→ Architecture:** [Architecture Guide](/architecture)

### What tech stack is used?

- **Frontend**: Next.js, React, TypeScript, TailwindCSS
- **Backend**: NestJS, TypeScript, SQLite
- **Infrastructure**: Docker, Docker Compose

**→ Details:** [Architecture Guide](/architecture)

## 🆚 Comparisons

### Minepanel vs Pterodactyl?

**Minepanel:**

- ✅ Easier installation (one command)
- ✅ Lighter weight
- ✅ Focused on Minecraft
- ❌ Single-user only (for now)
- ❌ Fewer advanced features

**Pterodactyl:**

- ✅ Multi-user with permissions
- ✅ Supports many game types
- ✅ More mature project
- ❌ Complex installation
- ❌ More resource intensive

### Minepanel vs AMP?

**Minepanel:**

- ✅ Free and open-source
- ✅ Modern UI
- ✅ Docker-native

**AMP:**

- ✅ More features
- ✅ Professional support
- ❌ Paid license
- ❌ Closed source

### Minepanel vs Crafty Controller?

**Minepanel:**

- ✅ More modern UI
- ✅ Docker-based
- ✅ Better mod management

**Crafty:**

- ✅ More mature
- ✅ Multi-user
- ❌ Different architecture

### Why not just use command line?

Minepanel offers:

- Visual server management
- Easy configuration
- Log viewing
- File editing
- One-click mod installation
- Automatic backups
- Resource monitoring

Perfect for those who prefer GUI over CLI.

## 🚀 Roadmap & Future

### What features are coming?

See the [Roadmap](/roadmap) for:

- Multi-user support
- Server templates
- Better metrics
- Discord webhooks
- Plugin manager
- And more!

### Can I request features?

Yes! Open an issue on [GitHub](https://github.com/Ketbome/minepanel/issues) with your suggestion.

### When will X feature be added?

Check the [Roadmap](/roadmap) for planned features. No specific ETAs, as this is developed in free time.

## 📞 Support

### Where do I get help?

1. Check this FAQ
2. Read the [Troubleshooting Guide](/troubleshooting)
3. Search [GitHub Issues](https://github.com/Ketbome/minepanel/issues)
4. Create a new issue with details

### How do I report a bug?

Create an issue on GitHub with:

- Steps to reproduce
- Expected vs actual behavior
- System information
- Relevant logs
- Screenshots if applicable

### Is there a Discord/community?

Not yet, but GitHub Discussions are available for questions and community interaction.

### Can I hire you for custom work?

This is a personal project maintained in free time. For professional support, consider contributing to the project or sponsoring development.

## 🎯 Best Practices

### Recommended setup for production?

1. Use SSD storage
2. Set up HTTPS with Let's Encrypt
3. Configure regular backups
4. Use strong passwords
5. Keep firewall configured
6. Update regularly
7. Monitor resource usage

**→ Full guide:** [Administration Best Practices](/administration#best-practices)

### How should I organize multiple servers?

- Use clear naming conventions
- Document each server's purpose
- Set appropriate resource limits
- Configure automatic backups
- Monitor performance regularly

### What should I backup?

- `data/minepanel.db` (database)
- `servers/` (all server data)
- Your `docker-compose.yml` configuration

**→ Backup guide:** [Database Backups](/administration#backup-database)

## 📚 Documentation

### Where's the full documentation?

- [Installation](/installation) - Get started
- [Configuration](/configuration) - Environment variables
- [Server Types](/server-types) - Supported servers
- [Mods & Plugins](/mods-plugins) - Mod management
- [Networking](/networking) - Remote access, SSL
- [Administration](/administration) - Backups, updates
- [Troubleshooting](/troubleshooting) - Fix issues
- [Architecture](/architecture) - How it works
- [Development](/development) - Contributing

### Is there video documentation?

Not yet! Community contributions welcome.

### Can I improve the docs?

Yes! Documentation is in the GitHub repo. PRs welcome.

## ❓ Still Have Questions?

- 📖 Read the [full documentation](/getting-started)
- 🐛 Check [Troubleshooting](/troubleshooting)
- 💬 Ask on [GitHub Discussions](https://github.com/Ketbome/minepanel/discussions)
- 🐞 Report bugs on [GitHub Issues](https://github.com/Ketbome/minepanel/issues)
