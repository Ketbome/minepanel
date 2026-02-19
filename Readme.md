<div align="center">

# Minepanel

**Minecraft Server Manager for Java & Bedrock Edition**

Web panel to manage Minecraft servers with Docker — Create, configure, and monitor Java and Bedrock servers from a modern UI.

[![License](https://img.shields.io/badge/License-Community-blue.svg)](LICENSE)
[![Docker Pulls](https://img.shields.io/docker/pulls/ketbom/minepanel?logo=docker&color=2496ED)](https://hub.docker.com/r/ketbom/minepanel)
[![Docker Size](https://img.shields.io/docker/image-size/ketbom/minepanel/latest?color=2496ED)](https://hub.docker.com/r/ketbom/minepanel)

[Documentation](https://minepanel.ketbome.com) · [Report Bug](https://github.com/Ketbome/minepanel/issues/new?labels=bug) · [Request Feature](https://github.com/Ketbome/minepanel/issues/new?labels=enhancement)

</div>

---

<div align="center">
  <img src="./doc/public/img/Animation.gif" alt="Minepanel Dashboard" width="90%">
</div>

---

## Quick Start

```bash
git clone https://github.com/Ketbome/minepanel.git
cd minepanel
export JWT_SECRET=$(openssl rand -base64 32)
docker compose up -d
```

Open http://localhost:3000 — Login: `admin` / `admin`

---

## Features

- **Java & Bedrock** — Support for both Minecraft editions
- **Multi-server** — Create and manage multiple servers from one panel
- **Real-time monitoring** — CPU, RAM, players, and logs
- **All server types** — Vanilla, Paper, Forge, Fabric, Purpur, and more
- **Modpacks** — CurseForge & Modrinth integration
- **Automatic backups** — Scheduled backups with retention policies
- **Proxy support** — mc-router for single-port multi-server (Java)
- **Discord webhooks** — Server events notifications
- **Multi-language** — English, Spanish, Dutch, German

---

## Documentation

Full docs at **[minepanel.ketbome.com](https://minepanel.ketbome.com)**

- [Installation](https://minepanel.ketbome.com/installation) — Docker setup guide
- [Configuration](https://minepanel.ketbome.com/configuration) — Environment variables & settings
- [Networking](https://minepanel.ketbome.com/networking) — Ports, DNS, and proxy setup
- [Features](https://minepanel.ketbome.com/features) — Full feature documentation
- [FAQ](https://minepanel.ketbome.com/faq) — Common questions
- [API](https://minepanel.ketbome.com/api) — REST API reference

---

## Powered By

Minepanel is built on top of amazing open source projects by [itzg](https://github.com/itzg):

| Project                                                                                         | Description                              |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------- |
| [itzg/docker-minecraft-server](https://github.com/itzg/docker-minecraft-server)                 | Docker image for Java Edition servers    |
| [itzg/docker-minecraft-bedrock-server](https://github.com/itzg/docker-minecraft-bedrock-server) | Docker image for Bedrock Edition servers |
| [itzg/docker-mc-backup](https://github.com/itzg/docker-mc-backup)                               | Automatic backup sidecar container       |
| [itzg/mc-router](https://github.com/itzg/mc-router)                                             | Minecraft proxy for routing by hostname  |

Thank you itzg for making Minecraft server hosting accessible to everyone!

---

## Contributors

<a href="https://github.com/Ketbome/minepanel/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Ketbome/minepanel" />
</a>

---

<div align="center">

**[⭐ Star this repo](https://github.com/Ketbome/minepanel)** if you find it useful!

Made with ❤️ by [@Ketbome](https://github.com/Ketbome) · [Community License](LICENSE)

</div>
<div align="center" style="margin-top: 8px;">
  <a href="https://buymeacoffee.com/pims2711y" target="_blank">
    <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" width="150" height="40">
  </a>
  <br>
  <span style="font-size: 0.95em; color: #888;">If Minepanel or my other projects (like Hytalepanel) help you, a coffee would mean a lot. Thank you for supporting independent devs!</span>
</div>
