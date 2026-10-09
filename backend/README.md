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
- `src/notifications/` - independent Discord, SMTP email, Telegram, ntfy and Slack delivery for lifecycle events and alerts; admin-managed instance settings and masked Telegram credentials
- `src/auth/` - authentication
- `src/system-monitoring/` - host metrics
- `src/metrics/` - live resources and tick performance, plus 7-day history. Native
  NeoForge/CurseForge TPS is an estimate from mean tick time; compatible spark
  responses provide 1-minute TPS and 10-second median/P95 MSPT. RCON stays inside
  the container. Missing measurements remain null.

Every text save of an existing `server.properties` creates a timestamped `.bak` copy beside the file before writing. A failed backup stops the save.

## References

- Backend agent rules: `backend/AGENTS.md`
- Root project guide: `Readme.md`

Player activity is collected in `src/player-activity/` every 30 seconds from bounded Docker
logs, with sessions and cursors persisted atomically in SQLite. Server-authorized list/detail
endpoints live at `/servers/:id/player-activity`. Saved Java counters are read on demand with
file-size and realpath boundaries. No game files or RCON settings are changed.

Opt-in disk and backup probes run independently every minute, with bounded Docker commands and no raw log forwarding. Recovery notifications require an observed incident followed by valid healthy state. Disk/backup repeats are configurable independently of per-server CPU/RAM rules.

`SettingsModule` exports the single shared `AuthMailService` transporter used by account emails and notification delivery. Telegram decryption failures are isolated from other channels. Backup probes use Compose service IDs; empty samples preserve active alert state. Crash log tails are included only in Discord embeds.

Notifications use bounded, single explicit-429 retries and `wait=true` for Discord. Never retry an ambiguous timeout. Per-channel outcomes are transient and fenced on configuration changes. Task failures omit command output and intentional skips; game failure stays distinct from unknown probes; backup freshness is filtered Java/restic metadata, not an integrity check.

ntfy and Slack use the shared notification fan-out and admin-only integration settings.
Keep ntfy tokens and Slack webhook URLs encrypted and write-only; preserve omitted secrets.
For ntfy, an origin change (scheme, host or port) clears an omitted token; an explicitly supplied replacement is accepted.
An unreadable ntfy token must fail the channel rather than publish anonymously. Both channels
start disabled, reject HTTP redirects and reuse bounded explicit-429 retry and delivery outcomes.
