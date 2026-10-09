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

The Files tab opens a guided editor for `server.properties`. It shows existing settings with type checks, explanations, version-aware keys (flags settings the server's Minecraft version ignores and lets you add the ones it reads), category and state filters, and links to Server Settings for panel-managed values. Guided and raw text views share unsaved edits. Before saving or restoring a backup, the editor shows changed lines for review; the backup history lets you preview and restore earlier versions. Comments and custom lines are preserved.

## References

- Frontend agent rules: `frontend/AGENTS.md`
- Root project guide: `Readme.md`

## Server monitoring

The Metrics tab combines live TPS/MSPT, container CPU/RAM and player count with
1–168 hour history. NeoForge/ATM10 uses the native overall tick report, explicitly
labelled as estimated TPS and mean MSPT. Compatible spark servers expose measured
TPS and median/P95 durations. The view identifies disabled RCON, unavailable
measurements and unsupported Bedrock ticks; resource charts remain available.
Charts show the latest sample value, labelled vertical scales and the minimum/maximum of available samples in the selected window, without sliders. Memory charts use GiB. Hover or touch a chart to inspect a sample’s date, time and value; keyboard users can focus it and use the arrow keys (Home/End for endpoints, Escape to dismiss). Existing Discord alert
settings remain below the charts.

**Players** shows persistent player profiles and paginated sessions for both editions,
including offline players: on Java inside each profile's Sessions tab (`PlayerSessions`), on
Bedrock as the session list itself (`player-activity.tsx`). Saved Java world statistics are shown separately
from recorded playtime. The tab cancels in-flight requests on navigation and refreshes every
30 seconds after completion; unknown presence is explicitly labeled.

## Command console

The Java Commands tab uses `components/molecules/commands/command-workbench.tsx` for
searchable presets, keyboard suggestions and a timestamped command/response history.
Selecting a preset or reusing a history entry fills the input; sending is explicit.
`useServerCommands` keeps at most 50 entries in memory, prevents concurrent submissions,
and discards late replies after changing servers. History survives the Commands/World
switch within the tab, but clears when leaving the tab, refreshing or changing servers.
