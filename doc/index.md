---
title: Minepanel - Free Minecraft Server Manager
description: Free open source Minecraft server management panel with Docker. Self-hosted alternative to Pterodactyl and Aternos. Web UI for Paper, Forge, Fabric, Spigot servers.
head:
  - - meta
    - property: og:title
      content: Minepanel - Free Minecraft Server Manager with Docker
  - - meta
    - property: og:description
      content: Open source web panel to manage multiple Minecraft servers. Self-hosted, Docker-based, supports Paper/Forge/Fabric/Spigot.
layout: home

hero:
  name: "Minepanel"
  text: "Minecraft Server Manager"
  tagline: Free self-hosted alternative to Aternos and Pterodactyl. Manage your Minecraft servers with Docker.
  image:
    src: /cubo.webp
    alt: Minepanel Dashboard
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/Ketbome/minepanel
    - theme: alt
      text: Docker Hub
      link: https://hub.docker.com/r/ketbom/minepanel

features:
  - icon: 🚀
    title: Quick Setup
    details: One command to get started. Takes about 2 minutes.

  - icon: 🎨
    title: Web Interface
    details: Built with Next.js. Works on any device with a browser.

  - icon: 🐳
    title: Docker Based
    details: Each server runs in its own container.

  - icon: 📊
    title: Monitoring
    details: See CPU, RAM usage and logs in real-time. Detects errors automatically.

  - icon: 🔧
    title: All Server Types
    details: Vanilla, Paper, Forge, Fabric, Spigot, Purpur, etc.

  - icon: 📁
    title: Built-in File Browser
    details: Edit configs, upload files, syntax highlighting. No external tools needed.

  - icon: 💾
    title: Backups
    details: Automatic backup system included.

  - icon: 🌍
    title: Multi-language
    details: English, Spanish, Dutch, and German.

  - icon: 🔄
    title: Multi-arch
    details: x86, ARM, Raspberry Pi, Apple Silicon.
---

## Why this exists

Got tired of managing servers through SSH. Tried other panels but they were either too complex or didn't work well. Made this instead.

## Quick Start

```bash
# Create docker-compose.yml file, then:
docker compose up -d
```

Go to http://localhost:3000

::: tip Default login
`admin` / `admin` (change this after first login)
:::

## Built On

- **Frontend**: [Next.js](https://nextjs.org/) + React + TypeScript
- **Backend**: [NestJS](https://nestjs.com/)
- **Minecraft Servers**: [itzg/docker-minecraft-server](https://github.com/itzg/docker-minecraft-server)
- **Backups**: [itzg/docker-mc-backup](https://github.com/itzg/docker-mc-backup)

## What's next

### Recently Added (v1.7)

- ✅ Server templates (Survival, Creative, SkyBlock, etc.)
- ✅ Player management (whitelist, ops, bans, kick)
- ✅ Dashboard with server quick view
- ✅ Quick admin actions (save, broadcast, time/weather)
- ✅ CurseForge modpack browser
- ✅ Discord webhooks

### Coming Soon

- Better log viewer with search and filtering
- Edit server.properties from the UI
- Scheduled tasks (auto restart, commands)
- Plugin browser from panel

### Planned

- User roles and permissions
- Historical metrics and graphs
- Multi-node support (Docker Swarm)
- Cloud backups

Want to help? Check the [Contributing Guide](/development#contributing)

## Community

<p>
  <a href="https://github.com/Ketbome/minepanel/stargazers"><img src="https://img.shields.io/github/stars/Ketbome/minepanel?style=social" alt="Stars"></a>
  <a href="https://hub.docker.com/r/ketbom/minepanel"><img src="https://img.shields.io/docker/pulls/ketbom/minepanel?logo=docker" alt="Docker Pulls"></a>
  <a href="https://github.com/Ketbome/minepanel/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License"></a>
</p>

Created by [@Ketbome](https://github.com/Ketbome)

---

Made this because I was tired of managing servers through SSH. Hope it helps you too.
