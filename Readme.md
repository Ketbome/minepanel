<div align="center">

# Minepanel

**Manage Minecraft servers with Docker — Simple, Fast, Beautiful**

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

## Contributors

<a href="https://github.com/Ketbome/minepanel/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Ketbome/minepanel" />
</a>

---

<div align="center">
**[⭐ Star this repo](https://github.com/Ketbome/minepanel)** if you find it useful!

Made with ❤️ by [@Ketbome](https://github.com/Ketbome)
Made by [@Ketbome](https://github.com/Ketbome) · [Community License](LICENSE)

</div>
