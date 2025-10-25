---
layout: home

hero:
  name: "Minepanel"
  text: "Modern Minecraft Server Management"
  tagline: Manage multiple Minecraft servers with a beautiful web interface using Docker
  image:
    src: /img/cubo.webp
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
    title: Quick Deployment
    details: One-command deployment from Docker Hub. Get your server panel running in seconds.

  - icon: 🎨
    title: Modern Interface
    details: Beautiful and intuitive web interface built with Next.js and React.

  - icon: 🐳
    title: Docker Native
    details: Each server runs in its own isolated container for better performance and security.

  - icon: 📊
    title: Real-time Monitoring
    details: Monitor CPU, RAM usage and view logs in real-time with error detection.

  - icon: 🔧
    title: Full Control
    details: Manage all server types - Vanilla, Paper, Forge, Fabric, Spigot, Purpur, and more.

  - icon: 📁
    title: File Browser
    details: Integrated file browser for easy config editing and server management.

  - icon: 💾
    title: Automatic Backups
    details: Built-in backup system to keep your worlds safe.

  - icon: 🌍
    title: Multi-language
    details: Available in English and Spanish, with more languages coming soon.

  - icon: 🔄
    title: Multi-architecture
    details: Works on Intel/AMD, ARM, Raspberry Pi, and Apple Silicon.
---

## Why Minepanel?

After trying several server management solutions, I wanted something that was:

- ✨ **Easy to use** - No complex configurations
- 🎨 **Modern interface** - Built with Next.js
- 🚀 **Quick to deploy** - One command installation
- 💪 **Powerful** - Manage multiple servers effortlessly

## Quick Start

Get up and running in less than 2 minutes:

```bash
# Create docker-compose.yml file, then:
mkdir -p servers filebrowser-data
docker compose up -d
```

Access the panel at http://localhost:3000

::: tip Default Credentials
Username: `admin` | Password: `admin` (change after first login!)
:::

## Built On

- **Frontend**: [Next.js](https://nextjs.org/) + React + TypeScript
- **Backend**: [NestJS](https://nestjs.com/)
- **Minecraft Servers**: [itzg/docker-minecraft-server](https://github.com/itzg/docker-minecraft-server)
- **Backups**: [itzg/docker-mc-backup](https://github.com/itzg/docker-mc-backup)
- **File Browser**: [Filebrowser](https://filebrowser.org/)

## Community

<p>
  <a href="https://github.com/Ketbome/minepanel/stargazers"><img src="https://img.shields.io/github/stars/Ketbome/minepanel?style=social" alt="Stars"></a>
  <a href="https://hub.docker.com/r/ketbom/minepanel"><img src="https://img.shields.io/docker/pulls/ketbom/minepanel?logo=docker" alt="Docker Pulls"></a>
  <a href="https://github.com/Ketbome/minepanel/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License"></a>
</p>

Created by [@Ketbome](https://github.com/Ketbome)

---

_This project was born from the frustration of managing Minecraft servers via terminal. If it helps you, I'm happy!_ ❤️
