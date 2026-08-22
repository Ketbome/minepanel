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
| `POST` | `/servers/autoscale` | mc-router auto-scaling webhook; disabled unless auto-scaling is enabled in Settings |

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
- `POST /servers/:id/stop/force` — skips the shutdown announcement (see below)
- `POST /servers/:id/restart`
- `GET /servers/:id/logs`
- `GET /servers/:id/runtime-stats` — live status, CPU, memory, player totals, uptime and
  game version for one server
- `GET /servers/all-runtime-stats` — the same data keyed by server ID, filtered to the servers
  visible to the current user

Game values (`playersOnline`, `playersMax`, `version`) are nullable. A container answers Docker
resource checks before Minecraft is ready to answer its Java or Bedrock status query; in that
window `gameReachable` is `false` and the API leaves those fields `null` instead of turning an
unavailable player count into zero. `playersMax` falls back to `maxPlayers` from `server.json`.

Modpack files uploaded for a server (`.zip` for CurseForge, `.mrpack` for Modrinth). They are stored
in `servers/<id>/modpacks/` and mounted read-only at `/modpacks`:

- `GET /servers/:id/worlds` — worlds available to this server, from its own library
  and the shared one (Java only)
- `PUT /servers/:id/worlds/select` — body `{ worldSource, worldScope, worldLevelName,
  forceWorldCopy?, restartIfRunning? }`. `worldScope` is `local` | `global`.
  An empty `worldSource` clears the selection: `WORLD` stops being generated, the server boots
  its own world at `LEVEL`, and `forceWorldCopy` is reset. Already-copied world data on disk is
  left untouched
- `GET /servers/:id/modpacks`
- `POST /servers/:id/modpacks` — multipart `file`
- `DELETE /servers/:id/modpacks/:fileName`

Uploads are capped at 256 MB and rejected unless the file ends in `.zip` or `.mrpack`.

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
- `POST /settings/proxy/power` — body `{ "enabled": true | false }`. Starts or stops
  the mc-router container right away instead of waiting for a settings save
- `GET /settings/integrations` — masked SMTP/OIDC config (admin only; secrets are
  never returned)
- `PATCH /settings/integrations` — write-only secrets: omit to keep, `""` to clear
- `POST /settings/integrations/smtp/test`

### Users

User CRUD and password changes.

Examples:

- `GET /users`
- `GET /users/one`
- `POST /users`
- `PATCH /users/:id`
- `PATCH /users/:id/role` (admin only, `{ "role": "ADMIN" | "USER" }`)
- `DELETE /users/:id`
- `POST /users/change-password`

### System

Host monitoring endpoints:

- `GET /system/stats`
- `GET /system/network`
- `GET /version` — running version, newest release, the release notes for everything
  in between parsed into sections, and whether any of it is breaking; the GitHub
  lookup is cached for an hour (five minutes when it failed) and never fails the
  request. `?refresh=true` skips that cache, at most once a minute
- `GET /version/update-status` — `current` plus the outcome of the last update.
  Polled while one is running; answers from disk, without calling GitHub
- `POST /version/update` — starts a panel update in a throwaway container (admin
  only). Answers `400` when the panel was not started by Docker Compose

### Mod Providers

- `GET /curseforge/search`
- `GET /curseforge/featured`
- `GET /curseforge/mods/search` — supports `sort` (`relevance` | `downloads` | `updated`) and `category` (category ID)
- `GET /curseforge/mods/categories` — mod categories used by the search filter
- `GET /curseforge/mods/resolve` — `refs` is a comma-separated list of slugs/IDs; returns their metadata (name, icon, downloads)
- `GET /curseforge/mods/:ref/versions` — files for a mod, filtered by `minecraftVersion` and `loader`
- `GET /curseforge/mods/files/resolve` — `ids` is a comma-separated list of file IDs; returns their names
- `GET /curseforge/mods/latest` — newest compatible version per `refs`, used to flag outdated pins
- `GET /modrinth/mods/search` — supports `sort` (`relevance` | `downloads` | `updated`) and `category` (category slug)
- `GET /modrinth/mods/categories` — mod categories for `projectType` (`mod` | `datapack`)
- `GET /modrinth/projects/resolve` — same `refs` contract as CurseForge
- `GET /modrinth/projects/:ref/versions`
- `GET /modrinth/versions/resolve` — same `ids` contract as CurseForge
- `GET /modrinth/projects/latest` — same `refs` contract as CurseForge
- `GET /curseforge/mods/:ref/files/:fileId/changelog` — changelog text for one file, resolved lazily on demand

Search and version endpoints treat `minecraftVersion=latest` (or empty) as "no version
filter" instead of returning zero results. CurseForge endpoints use the global API key
from user settings; Modrinth needs no credentials. Modrinth version objects (from
`/modrinth/projects/:ref/versions` and `/modrinth/versions/resolve`) carry their `changelog`
inline at no extra request cost.

### Mod Watch

The **Mod Watch** tab's annotations live on the server's own config (`servers/<serverId>/server.json`)
as `modNotes` and `modWatchTargetVersion`, so there is no second per-server state file and
`POST /servers/:id/clone` carries them:

- `PUT /servers/:id/mod-watch` — body `{ "targetVersion"?: "1.21.4" | null, "notes"?: { "<mod-ref>": "..." } }`

`notes` is the complete map, not a patch: the tab sends it pruned to the mods still configured, which
is how a note for a removed mod stops being stored. Blank notes are dropped, and `targetVersion: null`
clears the watch. Omitting either field leaves it untouched.

This is deliberately separate from `PUT /servers/:id`: that regenerates `docker-compose.yml`, and
regeneration re-runs port allocation. Mod Watch is the one tab that stays usable while the server is
running, so it writes `server.json` directly and never touches the compose file. Neither field is
compose input. Access control and the `servers` audit log are the same as any other server config
change (action `update_mod_watch`).

### World Discovery

Global world library search/import and CurseForge metadata lookup:

- `GET /world-discovery/library` - lists what is already in the shared library
- `GET /world-discovery/search`
- `POST /world-discovery/import`
- `GET /world-discovery/curseforge/:projectId`

`GET /world-discovery/library` returns one entry per world - a folder holding a
`level.dat` or a supported archive - with the path relative to the library root as
`source`, which is what a server stores as `worldSource`. Folders that are not
worlds are walked into, so imports grouped under `curseforge/` or `url/` show up.
`sizeBytes` is `0` for folders: measuring one means walking every region file.

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

Auto-scaling webhook, called by mc-router (see [Networking](/networking#auto-scaling-sleep-when-idle)):

- `POST /servers/autoscale`

```json
{ "action": "up", "serverAddress": "survival.mc.example.com", "backend": "survival:25565" }
```

Requires `Authorization: Bearer <token>`, where the token is the one the panel generated when auto-scaling was enabled. `action: "up"` starts the server and only answers `200` once it accepts connections; `action: "down"` stops it. Servers that are not in the proxy routes are rejected with `404`. When a server has auto-scaling turned off, `down` answers `200` with `{ "status": "skipped" }` and `up` is rejected with `503`.

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
