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

The Compose files only declare the core variables. **Optional features (SMTP password
recovery, OIDC/SSO, ...) are read from your `.env` file** via `env_file`, so you don't need
to edit `docker-compose.yml` to enable them — just add the variables to `.env`. See
[`.env.example`](https://github.com/Ketbome/minepanel/blob/main/.env.example) for the full list.

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
| `COMPOSE_PROJECT` | _(empty)_ | Optional prefix for per-server Docker Compose project names (`<prefix>_<serverId>`) |

### Authentication

| Variable          | Default | Description    |
| ----------------- | ------- | -------------- |
| `JWT_EXPIRES_IN` | `2d` | Access token expiration (`20s`, `15m`, `1h`, `2d`) |
| `ALLOW_INSECURE_AUTH_COOKIES` | `false` | Set `true` only for HTTP/LAN access when browsers block auth cookies |

Minepanel no longer uses default credentials from environment variables. The first visit to the panel opens a setup screen where you create the initial admin account.

### Password Recovery

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `SMTP_HOST` | _(empty)_ | SMTP server hostname |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_SECURE` | `false` | Use `true` for SMTPS/465, `false` for STARTTLS/587 |
| `SMTP_USER` | _(empty)_ | SMTP username |
| `SMTP_PASS` | _(empty)_ | SMTP password |
| `SMTP_FROM` | _(empty)_ | Sender shown in password reset emails |
| `PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES` | `60` | Password reset link lifetime in minutes |

### Single Sign-On (OIDC)

Optional. Enabled only when `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` and
`OIDC_REDIRECT_URI` are all set. Works with any OpenID Connect provider (Authentik, Authelia,
Keycloak, Google, ...). See the [Single Sign-On](/sso) guide for setup.

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `OIDC_ISSUER` | _(empty)_ | Provider issuer URL (endpoints are auto-discovered) |
| `OIDC_CLIENT_ID` | _(empty)_ | OAuth2 client ID |
| `OIDC_CLIENT_SECRET` | _(empty)_ | OAuth2 client secret (kept server-side only) |
| `OIDC_REDIRECT_URI` | _(empty)_ | Backend callback, e.g. `https://api.example.com/auth/oidc/callback` |
| `OIDC_SCOPES` | `openid email profile` | Space-separated scopes |
| `OIDC_PROVIDER_NAME` | `SSO` | Label shown on the login button |
| `OIDC_DISABLE_PASSWORD_LOGIN` | `false` | `true` hides and blocks password login (SSO only) |

### URLs

| Variable                       | Default                 | Description                  |
| ------------------------------ | ----------------------- | ---------------------------- |
| `FRONTEND_URL`                 | `http://localhost:3000` | Controls CORS                |
| `NEXT_PUBLIC_BACKEND_URL`      | `http://localhost:8091` | API URL for frontend         |
| `BASE_PATH`                    | _(empty)_               | Backend API prefix such as `/api` |
| `NEXT_PUBLIC_BASE_PATH`        | _(empty)_               | Frontend route prefix such as `/minepanel` |
| `NEXT_PUBLIC_DEFAULT_LANGUAGE` | `en`                    | `en`, `es`, `nl`, `de`, `pl` |

::: danger CORS
`FRONTEND_URL` **must match** how you access the panel. Mismatch = blocked requests.
:::

::: warning Authentication over HTTP
In production, authentication cookies are secure by default. If you access Minepanel over plain HTTP (for example via local IP), browsers may reject secure cookies and login can get stuck on **"Verifying authentication..."**.

You can explicitly opt in to HTTP auth cookies with:

```bash
ALLOW_INSECURE_AUTH_COOKIES=true
```

Use this only for trusted LAN/development environments. Prefer HTTPS whenever possible.
:::

## Quick Reference

<TerminalCommand
  title="config-check"
  command="docker compose config"
  :outputs="[
    'services.backend.environment.FRONTEND_URL=http://localhost:3000',
    'services.frontend.environment.NEXT_PUBLIC_BACKEND_URL=http://localhost:8091',
    'Configuration loaded successfully'
  ]"
  :typing-ms="1800"
/>

Pick a preset and copy it to your `.env` file:

<EnvPresetTabs />

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

Use these variables when Minepanel is served behind a reverse proxy under subpaths instead of the domain root.

| Variable | What it affects | Example |
| --- | --- | --- |
| `NEXT_PUBLIC_BASE_PATH` | Frontend URLs generated by Next.js | `/minepanel` |
| `BASE_PATH` | Backend route prefix in NestJS | `/api` |
| `NEXT_PUBLIC_BACKEND_URL` | Full backend URL used by the frontend | `https://mydomain.com/api` |

Example for `https://mydomain.com/minepanel` talking to `https://mydomain.com/api`:

```yaml
# docker-compose.development.yml
frontend:
  build:
    args:
      - NEXT_PUBLIC_BASE_PATH=/minepanel
  environment:
    - NEXT_PUBLIC_BASE_PATH=/minepanel
    - NEXT_PUBLIC_BACKEND_URL=https://mydomain.com/api

backend:
  environment:
    - BASE_PATH=/api
```

::: warning
`NEXT_PUBLIC_BASE_PATH` changes the Next.js `basePath`, so it must be present at build time. For custom Docker builds, keep the runtime value aligned with the build arg so healthchecks and diagnostics use the same path.
:::

::: info
Prebuilt frontend images cannot switch to a different `NEXT_PUBLIC_BASE_PATH` at runtime only. If you need `/minepanel`, build the frontend image with that value.
:::

## Related

- [Networking](/networking) - Remote access, SSL, proxy
- [Administration](/administration) - Backups, updates
- [Troubleshooting](/troubleshooting) - Common issues
