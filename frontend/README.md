# Minepanel Frontend

Next.js dashboard for Minepanel.

## Stack

- Next.js 16 (App Router, Turbopack)
- React 19
- Tailwind CSS 4
- Zustand

`next lint` was removed in Next.js 16; linting uses the ESLint CLI (`eslint src`)
with the flat config from `eslint-config-next` in `eslint.config.mjs`.

## Run

```bash
pnpm install          # at the repo root (pnpm workspace)
pnpm dev:frontend     # or: cd frontend && pnpm dev
```

App default URL: `http://localhost:3000`.

## Useful Commands

```bash
# from frontend/ (or prefix with `pnpm --filter ./frontend` at the root)
pnpm build
pnpm start
pnpm lint
```

## Base Path

- `NEXT_PUBLIC_BASE_PATH` mounts the frontend under a subpath such as `/minepanel`.
- It is consumed from `next.config.ts`, so it must be set at build time.
- If you build with a subpath, keep the runtime `NEXT_PUBLIC_BASE_PATH` aligned for healthchecks and diagnostics.

## Structure

- `src/app/` - routes and layouts
- `src/components/` - UI composition
  - `src/components/molecules/Tabs/ModWatchTab.tsx` - Mod Watch tab: notes, target-version compatibility checks, and changelog history for every configured mod (pinned or not); never edits the mod list
- `src/services/` - API calls
- `src/lib/store/` - global state
- `src/lib/translations/` - i18n

## References

- Frontend agent rules: `frontend/AGENTS.md`
- Root project guide: `Readme.md`

## Server monitoring

The Metrics tab combines live TPS/MSPT, container CPU/RAM and player count with
1–168 hour history. NeoForge/ATM10 uses the native overall tick report, explicitly
labelled as estimated TPS and mean MSPT. Compatible spark servers expose measured
TPS and median/P95 durations. The view identifies disabled RCON, unavailable
measurements and unsupported Bedrock ticks; resource charts remain available.
Chart cursors support keyboard and touch. Existing Discord alert settings remain
below the charts.
