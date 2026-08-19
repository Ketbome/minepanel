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
  - `src/components/molecules/Tabs/ModWatchTab.tsx` - Mod Watch tab: notes, desired-version compatibility checks, changelog history, and queued mod add/remove for pinned mods
- `src/services/` - API calls
  - `src/services/mod-metadata/` - notes, desired version, and queued mod changes (`mod-metadata` API)
- `src/lib/store/` - global state
- `src/lib/translations/` - i18n

## References

- Frontend agent rules: `frontend/AGENTS.md`
- Root project guide: `Readme.md`
