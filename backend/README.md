# Minepanel Backend

NestJS API used by Minepanel to manage Minecraft servers through Docker.

## Stack

- NestJS 12
- TypeORM + sql.js (SQLite)
- JWT auth

## Run

```bash
pnpm install          # at the repo root (pnpm workspace)
pnpm dev:backend      # or: cd backend && pnpm start:dev
```

API default port: `8091`.

## Useful Commands

```bash
# from backend/ (or prefix with `pnpm --filter ./backend` at the root)
pnpm build
pnpm lint
pnpm test
pnpm test:e2e
```

## Base Path

- `BASE_PATH` adds a global API prefix such as `/api`.
- When it is set, the health endpoint becomes `<BASE_PATH>/health`.
- `FRONTEND_URL` and `NEXT_PUBLIC_BACKEND_URL` should match the final browser and API URLs.

## Main Modules

- `src/server-management/` - server lifecycle and runtime actions
- `src/docker-compose/` - compose generation
- `src/files/` - file operations
- `src/auth/` - authentication
- `src/system-monitoring/` - host metrics
- `src/metrics/` - live resources and tick performance, plus 7-day history. Native
  NeoForge/CurseForge TPS is an estimate from mean tick time; compatible spark
  responses provide 1-minute TPS and 10-second median/P95 MSPT. RCON stays inside
  the container. Missing measurements remain null.

## References

- Backend agent rules: `backend/AGENTS.md`
- Root project guide: `Readme.md`

Player activity is collected in `src/player-activity/` every 30 seconds from bounded Docker
logs, with sessions and cursors persisted atomically in SQLite. Server-authorized list/detail
endpoints live at `/servers/:id/player-activity`. Saved Java counters are read on demand with
file-size and realpath boundaries. No game files or RCON settings are changed.
