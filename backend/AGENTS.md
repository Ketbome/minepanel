# AGENTS.md - Backend

## Project Purpose

Minepanel backend is a NestJS API that manages Minecraft server lifecycle and runtime operations through Docker.

- Creates and updates per-server `docker-compose.yml` files.
- Starts, stops, and inspects containers.
- Handles auth, file management, worlds, proxy config, monitoring, and integrations.
- Supports Java and Bedrock with strategy-based behavior.

## Architecture

```txt
backend/src/
|- main.ts
|- app.module.ts
|- config.ts
|- auth/                    Global JWT guard, public auth endpoints, cookie session flow
|  |- oidc/                 OpenID Connect SSO (provider-agnostic) -> issues Minepanel session
|- server-management/       Runtime control, status, logs, commands
|  |- strategies/           Java/Bedrock strategy pattern
|- docker-compose/          Compose generation and server config persistence
|- files/                   File browser API over server directories
|- world-discovery/         World import/discovery into global world library
|- proxy/                   mc-router routes.json generation
|- modpacks/                Per-server modpack files (.zip/.mrpack) under servers/<id>/modpacks
|- system-monitoring/       Host metrics
|- metrics/                 Per-server CPU/RAM history (1-min sampler, query API)
|- alerts/                  Per-server Discord alerts (down / high CPU / high RAM), fed by the metrics sampler
|- scheduled-tasks/         Auto-restart and scheduled commands (fixed interval or cron expression via cron-parser)
|- users/                   User and settings persistence
|- settings/                Global (instance-wide) integration settings: SMTP/OIDC in DB
|- common/crypto/           Secret encryption at rest (AES-GCM, key derived from JWT_SECRET)
|- database/                TypeORM/sql.js setup
```

Integration settings & secrets:

- SMTP and OIDC are read via `InstanceSettingsService` (module `settings/`), which merges
  DB values over `.env` (DB wins). `auth-mail.service.ts` and `oidc.service.ts` consume it and
  re-read on change via `registerResetHandler`; do not read `config.get('smtp'|'oidc')` directly.
- Secrets (SMTP pass, OIDC client secret, CurseForge API key) are stored **encrypted** using
  `common/crypto/secret-cipher.ts` and are **write-only** over HTTP: responses expose booleans
  (`hasPassword`, `hasCfApiKey`, ...), never the value. The CurseForge key is decrypted only
  server-side (`SettingsService.getCfApiKey`) and injected into the generated compose plaintext
  so itzg reads it. Admin-only endpoints live in `users/controllers/integration-settings.controller.ts`.

Primary runtime relationship:

- API reads/writes local paths under `/app/servers` inside the backend container.
- Docker mounts a host directory (or a named volume) into backend `/app/servers`.
- Generated server compose files must use host absolute paths for volume mounts, taken from
  `serversHostDir`, never rebuilt from `BASE_DIR`.

## Key Commands

```bash
npm run start:dev
npm run build
npm run lint
npm run test
npm run test:e2e
```

From repo root:

```bash
npm run start:dev --prefix backend
npm run test --prefix backend
```

## Code Patterns

- Keep controllers thin; put behavior in services.
- Validate DTOs with `class-validator` and reject invalid shape early.
- Use Nest exceptions and `Logger`; do not return ad-hoc error objects.
- Keep naming consistent: files `kebab-case`, classes `PascalCase`, methods `camelCase`.
- Keep changes surgical: no unrelated refactors, imports, or formatting churn.

Path and filesystem patterns (critical):

- `serversDir` is container-side path (`/app/servers`) from `backend/src/config.ts`.
- `serversHostDir` and `dataHostDir` are the host-side paths used in generated compose mounts.
  Each is auto-detected at startup from the `Source` of the panel's own mount for that
  destination (`docker inspect` on the own container, see `resolveHostPath` in `config.ts`);
  `${BASE_DIR}/servers` and `${BASE_DIR}/data` are only fallbacks (local dev / no Docker).
  A mismatch between env and detected path is logged.
- There is no `baseDir` any more, on purpose. Deriving one meant taking the *parent* of a
  mount source, which is only correct for binds: a named volume reports
  `/var/lib/docker/volumes/<name>/_data`, and the parent silently dropped `_data`. Resolve
  each destination from its own mount and never do arithmetic on a mount source.
- Sources are used verbatim. Docker Desktop rewrites bind sources (`/host_mnt/...` on macOS,
  `/run/desktop/mnt/host/...` on Windows) and the daemon resolves them back; reshaping them
  breaks that.
- The one exception is the volume subpath, which `docker inspect .Mounts` does not report:
  a mount with `volume: subpath:` still lists the volume root as its `Source`. `readOwnMounts`
  reads `.HostConfig.Mounts` in the same inspect and copies `VolumeOptions.Subpath` onto the
  mount so `resolveHostPath` can append it. Any new mount lookup must go through that helper.
- Never mix `serversDir` with the host dirs; they are not interchangeable.
- **`servers/<id>/server.json` is the source of truth for a server's config.**
  `docker-compose.yml` is generated output; never parse it to read config. Reads go
  through `ServerStoreService.readConfig`; a server with no `server.json` is imported
  from its compose file once (`importFromDockerCompose`) and never parsed again.
- The panel owns the container paths `/data`, `/modpacks` and the two world-library
  targets, and re-derives their host side from `serversHostDir` on every generation
  (`rebaseManagedVolume`). A stored absolute source for one of them is a leftover from
  an older host dir and is rewritten; a bind on any other target, or one pointing
  outside `servers/<id>/`, is left exactly as the operator configured it. Never store a
  generated absolute path as if it were config: it outlives the host dir it was written
  against, which is what broke named volumes in 1.12.0.
- `servers/servers.json` is a **derived index**, never authoritative. It exists so
  the dashboard list and the routes regeneration do not open every server. Treat it
  as a cache: reconcile against the folders, let `server.json` win, and never store
  derived state (`active`, `serverExists`) in it.
- Adding a config field means adding it to `ServerConfigDto` and to the compose
  generator. There is no reader to update: that is the point of `server.json`.
- Per-server canonical layout is:
  - `/app/servers/<serverId>/server.json` (source of truth)
  - `/app/servers/<serverId>/docker-compose.yml` (generated)
  - `/app/servers/<serverId>/mc-data/`
  - `/app/servers/<serverId>/worlds/`
  - `/app/servers/<serverId>/modpacks/` (mounted read-only at `/modpacks`; `CF_MODPACK_ZIP` and local `.mrpack` paths point here)
  - `/app/servers/<serverId>/backups/` (if backup enabled, default location)
- Backup host mount is configurable: `BACKUP_BASE_DIR` (`backupBaseDir`) sets a global host base, and per-server `backupHostDir` overrides it. When set, the backup mount's host side can point outside `${BASE_DIR}` (e.g. a NAS); the backend's `fs.ensureDir` for it is best-effort (Docker creates the bind source if unreachable). See `resolveBackupsHostPath`/`parseBackupHostDir` in `docker-compose.service.ts`.
- Global world library is reserved under `/app/servers/.world/worlds/`.
- Reserved/hidden folders must not be treated as server IDs.

## Critical Files

- `src/config.ts` - source of `serversDir`, `serversHostDir` and `dataHostDir` behavior.
- `src/main.ts` - CORS/cookies/bootstrap behavior.
- `src/server-management/server-management.service.ts` - lifecycle, status, command execution, world selection.
- `src/server-management/strategies/server-strategy.factory.ts` - Java/Bedrock strategy selection.
- `src/docker-compose/docker-compose.service.ts` - compose generation, path-to-volume mapping, server discovery.
- `src/files/files.service.ts` - path validation and file API boundaries.
- `src/files/files.controller.ts` - upload/download API behavior.
- `src/world-discovery/world-discovery.service.ts` - `.world` library import path and
  `listLibraryWorlds()`, which the library page reads. A world is a folder holding a
  `level.dat` or a supported archive; keep that rule in step with
  `collectWorldSources` in `server-management.service.ts` or the two world lists
  disagree about what counts.
- `src/docker-compose/docker-compose.module.ts` - provides `DockerComposeService` and
  `ServerStoreService`. Import this module; never list them as providers again, or each
  module gets its own instance and the startup migration runs once per copy.
- `src/docker-compose/server-store.service.ts` - `server.json` and the server index.
  Both are written temp-then-`rename(2)`, with the temp file fsynced before the rename
  and the directory fsynced after. Do not reach for `fs.move` here: with `overwrite` it
  unlinks the destination first, leaving a window with no file at all. That matters more
  than it looks for `server.json` — `readConfig` cannot tell an empty one from a server
  that never had one, so the caller re-imports from the generated `docker-compose.yml`
  and silently drops everything compose does not round-trip.
- `src/proxy/proxy.service.ts` - proxy routes file path behavior.
- `src/proxy/proxy-router.service.ts` - generates and runs the mc-router compose project.
- `src/common/docker/host-context.service.ts` - reads the panel's own compose labels;
  used to find the panel's service name and the compose files to act on.
- `src/settings/instance-settings.service.ts` - instance-wide settings (proxy, network,
  router, Java defaults). Anything that affects every server belongs here, not in a
  user's `Settings.preferences`.
- `src/server-management/auto-scale.controller.ts` - mc-router auto-scaling webhook.
- `package.json` - backend scripts.

## Agent-Specific Instructions

General:

- Read root `AGENTS.md` before backend edits.
- Do not add dependencies/scripts unless required by the task.
- If API contract changes, update frontend usage and docs in `doc/`.
- Backend auth is private-by-default through a global JWT guard; only explicitly `@Public()` routes should bypass auth.
- Keep auth transport limited to `httpOnly` cookies and bearer headers; never add JWT support via query params.
- `POST /servers/autoscale` (`src/server-management/auto-scale.controller.ts`) is the only `@Public()` route that controls servers. It is off unless `MC_PROXY_AUTOSCALE_TOKEN` is set, authenticates mc-router with a constant-time bearer comparison, and must keep accepting only servers present in `routes.json`.
- Optional SSO is OpenID Connect via `auth/oidc/*` (provider-agnostic; configured by `OIDC_*` env in `config.ts`). It validates the IdP `id_token` then issues the same Minepanel session cookies via `auth/utils/auth-cookies.ts`; the `client_secret` stays server-side and is never exposed. `OIDC_DISABLE_PASSWORD_LOGIN=true` blocks password login server-side (only when SSO is fully configured).

Server ID and directory safety:

- Keep server ID regex constraints (`^[a-zA-Z0-9_-]+$`) for server lifecycle endpoints.
- Do not treat `.world` as a regular server.
- Do not assume every folder in `servers/` is a server; valid server requires expected structure (especially compose file).

Path model and volume mapping:

- Keep this distinction explicit in code changes:
  - Container path for backend IO: `/app/servers/...`
  - Host path for compose mount lines: `<serversHostDir>/...`
- In compose generation, `./` volume entries are expanded to host absolute paths under `<serversHostDir>/<serverId>/...`.
- Java world library mounts must remain read-only (`:ro`) when mapped to `/data/.world-library/local` and `/data/.world-library/global`.

Files module behavior:

- `serverId="_root"` maps to `/app/servers` in files API.
- `serverId=".world"` maps to `/app/servers/.world/worlds` in files API.
- Other server IDs map to `/app/servers/<serverId>/mc-data`.
- Preserve traversal protection (`normalize` + `startsWith(basePath)`).

Data migration and compatibility:

- Keep misplaced data migration logic (`server root -> mc-data`) intact when touching server creation.
- Preserve Java/Bedrock compatibility in lifecycle and command execution paths.
- Bedrock permission fix depends on host path mount and UID/GID from compose; do not break this flow.

## Required AGENTS.md Content

Every backend AGENTS update must include:

- Project purpose
- Architecture
- Key commands
- Code patterns
- Critical files
- Specific agent instructions
- Context Maintenance Rule

## Writing Tips (Mandatory)

- Be specific: prefer file paths and concrete rules over generic advice.
- Reference key files directly for high-risk areas (paths, compose, files API).
- Keep only high-signal context; remove noise.
- Add or tighten rules when recurring mistakes appear.

## Context Maintenance (Golden Rule)

The agent must keep `backend/AGENTS.md` and `backend/README.md` updated whenever backend workflow, architecture, commands, or conventions change.
