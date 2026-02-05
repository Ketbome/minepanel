---
title: Minepanel - Minecraft Server Manager for Java & Bedrock
description: Free open source Minecraft server management panel for Java and Bedrock Edition. Self-hosted Docker alternative to Pterodactyl and Aternos. Manage Paper, Forge, Fabric, Spigot, Purpur, and Bedrock servers.
head:
  - - meta
    - property: og:title
      content: Minepanel - Minecraft Java & Bedrock Server Manager
  - - meta
    - property: og:description
      content: Open source web panel to manage Minecraft Java and Bedrock servers. Self-hosted, Docker-based, supports Paper/Forge/Fabric/Spigot/Purpur/Bedrock.
  - - meta
    - name: keywords
      content: minecraft server manager, minecraft java server, minecraft bedrock server, minecraft server panel, minecraft docker, pterodactyl alternative, aternos alternative
layout: home

hero:
  name: 'Minepanel'
  text: 'Minecraft Server Manager'
  tagline: Java & Bedrock Edition. Free, self-hosted, Docker-based. Your servers, your rules.
  image:
    src: /cubo.webp
    alt: Minepanel - Minecraft Server Manager
  actions:
    - theme: brand
      text: Get Started →
      link: /getting-started
    - theme: alt
      text: GitHub
      link: https://github.com/Ketbome/minepanel

features:
  - icon: 🎮
    title: Java & Bedrock
    details: Full support for both Minecraft editions in one panel.

  - icon: 🚀
    title: 2-Minute Setup
    details: Clone, compose up, done.

  - icon: 🐳
    title: Docker Native
    details: Each server isolated in its own container.

  - icon: 🔧
    title: All Server Types
    details: Vanilla, Paper, Forge, Fabric, Purpur, CurseForge modpacks.

  - icon: 📊
    title: Real-time Monitoring
    details: CPU, RAM, logs with auto error detection.

  - icon: 📁
    title: File Browser
    details: Edit configs, upload files, syntax highlighting.

  - icon: 💾
    title: Auto Backups
    details: Schedule, restore, download. (Java Edition)

  - icon: 🌐
    title: Proxy Support
    details: mc-router for multiple servers on one port. (Java Edition)

  - icon: 🌍
    title: Multi-language
    details: EN / ES / NL / DE

  - icon: 🔄
    title: Multi-arch
    details: x86, ARM, Raspberry Pi, Apple Silicon.
---

## Quick Start

```bash
git clone https://github.com/Ketbome/minepanel.git
cd minepanel
docker compose up -d
```

Open http://localhost:3000 → Login: `admin` / `admin`

## Powered By

Minepanel is built on top of amazing open source projects by [itzg](https://github.com/itzg):

- [itzg/docker-minecraft-server](https://github.com/itzg/docker-minecraft-server) — Java Edition servers
- [itzg/docker-minecraft-bedrock-server](https://github.com/itzg/docker-minecraft-bedrock-server) — Bedrock Edition servers
- [itzg/docker-mc-backup](https://github.com/itzg/docker-mc-backup) — Automatic backups
- [itzg/mc-router](https://github.com/itzg/mc-router) — Proxy routing by hostname

**Stack:** Next.js + NestJS + TypeScript + Docker

---

<p align="center">
  <a href="https://github.com/Ketbome/minepanel/stargazers"><img src="https://img.shields.io/github/stars/Ketbome/minepanel?style=social" alt="Stars"></a>
  <a href="https://hub.docker.com/r/ketbom/minepanel"><img src="https://img.shields.io/docker/pulls/ketbom/minepanel?logo=docker" alt="Docker Pulls"></a>
</p>
