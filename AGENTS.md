# AGENTS.md - Minepanel (root)

## Project Purpose

Minepanel is a web control panel to create and operate Minecraft servers (Java and Bedrock) with Docker.

- Backend: NestJS API for orchestration, auth, files, and runtime control.
- Frontend: Next.js dashboard for server management.
- Docs: VitePress documentation for users and contributors.

## Architecture

```txt
minepanel/
|- backend/      NestJS API (read backend/AGENTS.md first)
|- frontend/     Next.js app (read frontend/AGENTS.md first)
|- doc/          VitePress documentation
|- servers/      Runtime server data (gitignored)
|  |- servers.json      Derived index of all servers (cache, rebuildable)
|  |- <id>/server.json  Source of truth for one server's config
|  |- <id>/docker-compose.yml  Generated from server.json
|- data/         SQLite data (gitignored)
|- pnpm-workspace.yaml
|- docker-compose.yml
|- docker-compose.development.yml
|- docker-compose.test.yml
|- .env.example
|- config.json
```

Main flow: UI -> API -> `server.json` -> compose generation -> `docker compose up/down`
-> status/logs/commands.

The mc-router proxy is also a panel-managed compose project (`data/proxy/`), not a
service in the root compose file.

## Key Commands

The repo is a pnpm workspace (`pnpm-workspace.yaml`: `backend`, `frontend`, `doc`). `doc/`
is built by Cloudflare Workers Builds from its own directory; it keeps `doc/package-lock.json`
so an npm-based build still works, and its `vite` override is mirrored in the root
`pnpm.overrides` (pnpm ignores overrides declared in non-root packages). Node 22+, pnpm 10 via corepack.
Filter packages by path (`--filter ./backend`), never by name: the frontend package is
named `minepanel`, and a name filter that matches nothing exits 0 without running anything.

```bash
# root
pnpm install        # installs both apps and the git hooks
pnpm verify         # lint + typecheck + tests (same gate as pre-push and CI)
pnpm lint
pnpm typecheck
pnpm test           # backend jest with a 90% coverage threshold
pnpm lint:fix       # the only script that rewrites files

# backend
pnpm dev:backend            # = pnpm --filter ./backend start:dev
pnpm --filter ./backend build
pnpm --filter ./backend test

# frontend
pnpm dev:frontend           # = pnpm --filter ./frontend dev
pnpm --filter ./frontend build
pnpm --filter ./frontend lint

# docs
pnpm docs:dev               # = pnpm --filter ./doc docs:dev
pnpm docs:build

# docker stack
docker compose up -d
docker compose -f docker-compose.development.yml up --build
docker compose -f docker-compose.test.yml up -d
```

## Verification Gate

`pnpm verify` (lint + typecheck + backend tests, ~30s) is the single gate. It runs:

- on every `git push`, via `.husky/pre-push`
- in CI (`.github/workflows/ci.yml`, on every branch push; it additionally builds both apps)

Docker images are only published by `docker-publish.yml` after a green CI run
(`workflow_run`), so a red `main` never ships `latest`.

The `git push` half only works once husky has claimed the hooks. Any `pnpm install` (root or
inside `backend/`/`frontend/`) runs the root `prepare` script that does it; the repo `.npmrc`
sets `ignore-scripts=false` so a user-level `ignore-scripts=true` cannot silently skip it.
Check with `git config core.hooksPath` (expected `.husky/_`). An empty value means the local
gate is inert and only CI is catching things.

`pnpm test` enforces `coverageThreshold` in `backend/package.json` (90% lines/statements/
functions). Adding code without tests fails the gate; keep the threshold, add tests.

`pnpm lint` only checks; `pnpm lint:fix` is the one that rewrites files and is what
`lint-staged` runs on `git commit`. Keep them separate: a gate that silently fixes what it is
meant to catch is not a gate.

`.claude/settings.json` holds a `PreToolUse` hook that blocks `git commit` / `git push` with
`--no-verify`, so an agent cannot skip the gate. Fix what `pnpm verify` reports instead.

Docker images build from the repo root (`docker build -f backend/Dockerfile .`): the pnpm
lockfile lives there. `backend/Dockerfile` uses `pnpm deploy --legacy` to produce a flat
production tree, and `frontend/Dockerfile` copies the Next standalone output.

## Code Patterns

- Naming: files `kebab-case`, classes `PascalCase`, functions/variables `camelCase`.
- Comments: only for non-obvious decisions.
- Scope: make minimal, task-focused changes; no unrelated refactors.
- Commits: `type(scope): short description`.

## Critical Files

- `AGENTS.md`
- `Readme.md`
- `.env.example`
- `pnpm-workspace.yaml` / `.npmrc`
- `docker-compose.yml`
- `docker-compose.development.yml`
- `docker-compose.test.yml`
- `config.json`
- `backend/src/config.ts`
- `backend/src/server-management/strategies/server-strategy.factory.ts`
- `frontend/src/services/axios.service.ts`

## Agent-Specific Instructions

- Before changing code, read the module file: `backend/AGENTS.md` or `frontend/AGENTS.md`.
- If behavior, endpoints, env vars, or user flow changes, update `doc/`.
- Do not touch `servers/` or `data/` unless explicitly requested.
- Do not add dependencies or scripts unless directly required.
- Do not edit autogenerated base UI components in `frontend/src/components/ui/*` unless explicitly requested.
- Keep Java/Bedrock compatibility for provisioning, networking, and command execution changes.
- `server.json` is the source of truth for server config; generated `docker-compose.yml`
  files must never be parsed to read it back.

## Required AGENTS.md Content

Every AGENTS file in this repo must include:

- Project purpose
- Architecture
- Key commands
- Code patterns
- Critical files
- Specific agent instructions
- Context Maintenance Rule

## Writing Tips (Mandatory)

- Be specific: "use comments only for complex logic" is better than "comment well".
- Reference key files directly to reduce search overhead.
- Keep only relevant context; avoid noise.
- Iterate when recurring mistakes appear.

## Context Maintenance (Golden Rule)

The agent must keep `AGENTS.md` and `README.md` updated whenever workflow, architecture, commands, or conventions change.
