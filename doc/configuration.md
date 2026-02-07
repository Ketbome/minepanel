---
title: Configuration Guide - Minepanel
description: Complete configuration reference for Minepanel - Environment variables, JWT setup, port configuration, CORS settings, authentication, and deployment options for production environments.
head:
  - - meta
    - name: keywords
      content: minepanel configuration, environment variables, jwt secret, docker configuration, cors settings, production deployment, server setup
---

# Configuration

![Configuration](/img/configuration.png)

## Environment Variables

All variables can be set in `.env` or `docker-compose.yml`.

### Required

| Variable     | Description                                      |
| ------------ | ------------------------------------------------ |
| `JWT_SECRET` | Auth secret. Generate: `openssl rand -base64 32` |

### Ports & Directories

| Variable        | Default | Description               |
| --------------- | ------- | ------------------------- |
| `FRONTEND_PORT` | `3000`  | Web UI port               |
| `BACKEND_PORT`  | `8091`  | API port                  |
| `BASE_DIR`      | `$PWD`  | Base path for server data |

### Authentication

| Variable          | Default | Description    |
| ----------------- | ------- | -------------- |
| `CLIENT_USERNAME` | `admin` | Login username |
| `CLIENT_PASSWORD` | `admin` | Login password |

### URLs

| Variable                       | Default                 | Description            |
| ------------------------------ | ----------------------- | ---------------------- |
| `FRONTEND_URL`                 | `http://localhost:3000` | Controls CORS          |
| `NEXT_PUBLIC_BACKEND_URL`      | `http://localhost:8091` | API URL for frontend   |
| `NEXT_PUBLIC_DEFAULT_LANGUAGE` | `en`                    | `en`, `es`, `nl`, `de` |

::: danger CORS
`FRONTEND_URL` **must match** how you access the panel. Mismatch = blocked requests.
:::

## Quick Reference

### Local Development

```bash
# .env
JWT_SECRET=your_secret
```

### Remote Access

```bash
# .env
JWT_SECRET=your_secret
FRONTEND_URL=http://your-ip:3000
NEXT_PUBLIC_BACKEND_URL=http://your-ip:8091
```

### With Domain + SSL

```bash
# .env
JWT_SECRET=your_secret
FRONTEND_URL=https://minepanel.yourdomain.com
NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com
```

## Network Settings

Public IP, LAN IP, and Proxy settings are configured through the web UI:

**Settings → Network Settings** / **Settings → Proxy Settings**

## Advanced

### Custom Base Directory

```bash
BASE_DIR=/mnt/external/minepanel
```

### Multiple Instances

Run on different ports:

```bash
# Instance 1
FRONTEND_PORT=3000
BACKEND_PORT=8091

# Instance 2
FRONTEND_PORT=3001
BACKEND_PORT=8092
```

### Subdirectory Routing

For `mydomain.com/minepanel`:

```yaml
# docker-compose.development.yml
frontend:
  build:
    args:
      - NEXT_PUBLIC_BASE_PATH=/minepanel
  environment:
    - NEXT_PUBLIC_BACKEND_URL=https://mydomain.com/api

backend:
  environment:
    - BASE_PATH=/api
```

::: warning
`NEXT_PUBLIC_BASE_PATH` is build-time only. Requires building the image.
:::

## Related

- [Networking](/networking) - Remote access, SSL, proxy
- [Administration](/administration) - Backups, updates
- [Troubleshooting](/troubleshooting) - Common issues
