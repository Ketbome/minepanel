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
|- server-management/       Runtime control, status, logs, commands
|  |- strategies/           Java/Bedrock strategy pattern
|- docker-compose/          Compose generation and server config persistence
|- files/                   File browser API over server directories
|- world-discovery/         World import/discovery into global world library
|- proxy/                   mc-router routes.json generation
|- system-monitoring/       Host metrics
|- metrics/                 Per-server CPU/RAM history (1-min sampler, query API)
|- scheduled-tasks/         Interval-based auto-restart and scheduled commands
|- users/                   User and settings persistence
|- database/                TypeORM/sql.js setup
```

Primary runtime relationship:

- API reads/writes local paths under `/app/servers` inside the backend container.
- Docker mounts host `${BASE_DIR}/servers` into backend `/app/servers`.
- Generated server compose files must use host absolute paths (`${BASE_DIR}/...`) for volume mounts.

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
- `baseDir` is host-side path (`BASE_DIR`) used in generated compose mounts.
- Never mix `serversDir` and `baseDir`; they are not interchangeable.
- Per-server canonical layout is:
  - `/app/servers/<serverId>/docker-compose.yml`
  - `/app/servers/<serverId>/mc-data/`
  - `/app/servers/<serverId>/worlds/`
  - `/app/servers/<serverId>/backups/` (if backup enabled)
- Global world library is reserved under `/app/servers/.world/worlds/`.
- Reserved/hidden folders must not be treated as server IDs.

## Critical Files

- `src/config.ts` - source of `serversDir` and `baseDir` behavior.
- `src/main.ts` - CORS/cookies/bootstrap behavior.
- `src/server-management/server-management.service.ts` - lifecycle, status, command execution, world selection.
- `src/server-management/strategies/server-strategy.factory.ts` - Java/Bedrock strategy selection.
- `src/docker-compose/docker-compose.service.ts` - compose generation, path-to-volume mapping, server discovery.
- `src/files/files.service.ts` - path validation and file API boundaries.
- `src/files/files.controller.ts` - upload/download API behavior.
- `src/world-discovery/world-discovery.service.ts` - `.world` library import path.
- `src/proxy/proxy.service.ts` - proxy routes file path behavior.
- `package.json` - backend scripts.

## Agent-Specific Instructions

General:

- Read root `AGENTS.md` before backend edits.
- Do not add dependencies/scripts unless required by the task.
- If API contract changes, update frontend usage and docs in `doc/`.
- Backend auth is private-by-default through a global JWT guard; only explicitly `@Public()` routes should bypass auth.
- Keep auth transport limited to `httpOnly` cookies and bearer headers; never add JWT support via query params.

Server ID and directory safety:

- Keep server ID regex constraints (`^[a-zA-Z0-9_-]+$`) for server lifecycle endpoints.
- Do not treat `.world` as a regular server.
- Do not assume every folder in `servers/` is a server; valid server requires expected structure (especially compose file).

Path model and volume mapping:

- Keep this distinction explicit in code changes:
  - Container path for backend IO: `/app/servers/...`
  - Host path for compose mount lines: `${BASE_DIR}/servers/...`
- In compose generation, `./` volume entries are expanded to host absolute paths under `${BASE_DIR}/servers/<serverId>/...`.
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
