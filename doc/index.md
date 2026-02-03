---
title: Minepanel - Minecraft Server Manager
description: Free open source Minecraft server management panel with Docker. Self-hosted alternative to Pterodactyl and Aternos.
head:
  - - meta
    - property: og:title
      content: Minepanel - Minecraft Server Manager
  - - meta
    - property: og:description
      content: Open source web panel to manage multiple Minecraft servers. Self-hosted, Docker-based, supports Paper/Forge/Fabric/Spigot.
layout: home

hero:
  name: 'Minepanel'
  text: 'Minecraft Server Manager'
  tagline: Free, self-hosted, Docker-based. Your servers, your rules.
  image:
    src: /cubo.webp
    alt: Minepanel
  actions:
    - theme: brand
      text: Get Started →
      link: /getting-started
    - theme: alt
      text: GitHub
      link: https://github.com/Ketbome/minepanel

features:
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
    details: Schedule, restore, download.

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

## Built On

- [itzg/docker-minecraft-server](https://github.com/itzg/docker-minecraft-server)
- [itzg/docker-mc-backup](https://github.com/itzg/docker-mc-backup)
- Next.js + NestJS + TypeScript

---

<p align="center">
  <a href="https://github.com/Ketbome/minepanel/stargazers"><img src="https://img.shields.io/github/stars/Ketbome/minepanel?style=social" alt="Stars"></a>
  <a href="https://hub.docker.com/r/ketbom/minepanel"><img src="https://img.shields.io/docker/pulls/ketbom/minepanel?logo=docker" alt="Docker Pulls"></a>
</p>
