---
title: API Reference - Minepanel
description: Authentication model, public endpoints, protected resources, and practical API usage examples for Minepanel.
---

# API Reference

Minepanel exposes a REST API used by the web dashboard.

## Base URL

The backend runs behind the URL configured in `NEXT_PUBLIC_BACKEND_URL` on the frontend.

Examples:

- `https://panel.example.com/api`
- `http://localhost:8091`

If `BASE_PATH` is configured in the backend, that prefix is part of the API URL.

If the frontend is also served under a subpath, that is controlled separately by `NEXT_PUBLIC_BASE_PATH`.

## Authentication

Minepanel uses JWT sessions stored in `httpOnly` cookies:

- `access_token` for authenticated requests
- `refresh_token` for session renewal

Primary authentication mechanism:

1. Browser session cookies set by `POST /auth/login`

JWT tokens are not accepted in query strings.

The backend also accepts `Authorization: Bearer <token>` on protected routes, but the standard login flow issues cookies and does not return raw JWTs in the response body.

## Public Endpoints

These routes do not require an authenticated session:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Liveness check |
| `POST` | `/auth/login` | Start a session |
| `POST` | `/auth/refresh` | Renew access token using `refresh_token` cookie |
| `POST` | `/auth/logout` | Clear session cookies and revoke refresh token when present |
| `GET` | `/auth/oidc/login` | Begin SSO login, redirects to the OIDC provider (when SSO is configured) |
| `GET` | `/auth/oidc/callback` | OIDC provider callback; sets session cookies and redirects to the dashboard |

All other endpoints require JWT authentication. See [Single Sign-On](/sso) for SSO setup.

## Login Flow

### Login

```bash
curl -i \
  -c cookies.txt \
  -H 'Content-Type: application/json' \
  -X POST https://panel.example.com/api/auth/login \
  -d '{"username":"admin-or-email@example.com","password":"changeme"}'
```

Successful login returns the username and token lifetime, and writes auth cookies.

### Initial Setup

```bash
curl -i \
  -c cookies.txt \
  -H 'Content-Type: application/json' \
  -X POST https://panel.example.com/api/auth/setup-admin \
  -d '{"username":"admin","email":"admin@example.com","password":"changeme123"}'
```

### Current Session

```bash
curl -b cookies.txt https://panel.example.com/api/auth/me
```

### Refresh Session

```bash
curl -i -b cookies.txt -c cookies.txt -X POST https://panel.example.com/api/auth/refresh
```

### Logout

```bash
curl -i -b cookies.txt -X POST https://panel.example.com/api/auth/logout
```

## Main Resource Groups

### Auth

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/refresh`
- `POST /auth/logout`

### Servers

Main control plane for server creation, configuration, lifecycle, logs, commands, worlds, and related runtime actions.

Typical examples:

- `GET /servers`
- `GET /servers/:id`
- `POST /servers`
- `PUT /servers/:id`
- `POST /servers/:id/start`
- `POST /servers/:id/stop`
- `POST /servers/:id/restart`
- `GET /servers/:id/logs`

### Files

Server file browser API used by the dashboard.

Examples:

- `GET /files/:serverId/list?path=`
- `GET /files/:serverId/read?path=`
- `GET /files/:serverId/download?path=`
- `POST /files/:serverId/write`
- `POST /files/:serverId/upload`
- `POST /files/:serverId/upload-multiple`
- `PUT /files/:serverId/rename`
- `DELETE /files/:serverId/delete?path=`

Important path semantics:

- `serverId="_root"` targets the global servers root used by the file manager
- `serverId=".world"` targets the global world library
- Any normal `serverId` targets that server's `mc-data`

### Settings

Per-user panel settings and integration configuration.

Examples:

- `GET /settings`
- `PATCH /settings`
- `POST /settings/test-discord-webhook`

### Users

User CRUD and password changes.

Examples:

- `GET /users`
- `GET /users/one`
- `POST /users`
- `PATCH /users/:id`
- `DELETE /users/:id`
- `POST /users/change-password`

### System

Host monitoring endpoints:

- `GET /system/stats`
- `GET /system/network`

### Mod Providers

- `GET /curseforge/search`
- `GET /curseforge/featured`
- `GET /modrinth/mods/search`

### World Discovery

Global world library search/import and CurseForge metadata lookup:

- `GET /world-discovery/search`
- `POST /world-discovery/import`
- `GET /world-discovery/curseforge/:projectId`

### Bedrock Addons

Bedrock addon management:

- `GET /bedrock-addons/:serverId`
- `POST /bedrock-addons/:serverId/upload`
- `GET /bedrock-addons/:serverId/curseforge/search`
- `POST /bedrock-addons/:serverId/curseforge/import`
- `PUT /bedrock-addons/:serverId/order` — body `{ "addonIds": ["..."] }` with every installed addon ID in priority order (first = highest priority)
- `POST /bedrock-addons/:serverId/:addonId/enable`
- `POST /bedrock-addons/:serverId/:addonId/disable`
- `DELETE /bedrock-addons/:serverId/:addonId`

### Proxy

mc-router proxy status and mapping management:

- `GET /proxy/status`
- `GET /proxy/mappings`
- `GET /proxy/server/:id/hostname`
- `POST /proxy/server/:id`
- `DELETE /proxy/server/:id`

## Response Patterns

Minepanel uses standard HTTP status codes:

- `200` successful read/update action
- `201` resource created
- `400` validation or bad input
- `401` missing or invalid authentication
- `404` resource not found
- `500` internal server error

Typical unauthorized response:

```json
{
  "status": 401,
  "error": "Unauthorized"
}
```

Validation errors usually come from NestJS validation pipes.

## Security Notes

- Treat the API as private by default.
- Prefer cookie-based auth for browser clients.
- Do not send JWT tokens in query params.
- File and proxy endpoints are protected and should not be exposed through unauthenticated reverse-proxy exceptions.
- Restrict access to trusted users only; Minepanel can control Docker and host-mounted server data.

## Related

- [Architecture](/architecture)
- [Configuration](/configuration)
- [Development](/development)
