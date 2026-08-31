# AGENTS.md - Frontend

## Project Purpose

Minepanel frontend is a Next.js dashboard for managing Minecraft servers.

- Creates and edits server configuration.
- Controls runtime actions (start, stop, restart, logs, worlds, files, settings).
- Supports both Java and Bedrock UX paths.

## Architecture

```txt
frontend/src/
|- app/                         App Router pages
|  |- dashboard/
|  |  |- servers/[server]/      Server config/details route
|  |  |- files/                 Global files browser route
|  |  |- world-library/         Global world library route
|- components/
|  |- organisms/                Complex feature sections
|  |- molecules/                Mid-level reusable UI
|  |- ui/                       Base shadcn primitives (generated)
|- services/
|  |- axios.service.ts          Shared API client config
|  |- docker/                   Server lifecycle/config endpoints
|  |- files/                    File browser endpoints
|  |- world-discovery/          World import endpoints
|  |- metrics/                  Per-server CPU/RAM history endpoints
|  |- scheduler/                Scheduled tasks CRUD endpoints
|  |- modpacks/                 Per-server modpack file upload/list/delete
|- lib/
|  |- store/                    Zustand stores
|  |- translations/             i18n dictionaries
|  |- hooks/                    Custom hooks
```

Backend integration model:

- Frontend never accesses host filesystem directly.
- Files and worlds are always mediated by backend endpoints.
- Route `serverId` values are API-level identifiers with special cases (`_root`, `.world`).

## Key Commands

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
```

From repo root:

```bash
pnpm dev:frontend
pnpm --filter ./frontend lint
```

## Code Patterns

- Prefer server components by default; use client components when state/effects/browser APIs are required.
- Keep API calls in `src/services/*`; do not scatter ad-hoc fetch calls across UI.
- Reuse `src/services/axios.service.ts` for auth/session behavior.
- Keep components focused; split large feature blocks into molecules/organisms.
- Maintain existing visual/system patterns; do not redesign unrelated UI.

Design system (Minecraft GUI, converged with the docs brand):

- The app uses a pixel/inventory "Minecraft GUI" look defined in `src/app/globals.css`, sharing
  brand DNA with the docs site (`doc/.vitepress/theme/style.css`): acid green `#9dff3f` on
  near-black `#0a0e08`, hard offset shadows, and a blueprint-grid backdrop (`mp-blueprint`).
- Fonts (loaded via `next/font/google` in `app/layout.tsx`): Archivo Black uppercase is the
  display font (`font-minecraft`, `mc-btn`, `mc-tag`, `mc-count`); Archivo is the body font
  (`--font-sans`); JetBrains Mono is the mono font (`--font-mono`, mono labels via `mp-tag`).
  Do not reintroduce Mojang's proprietary Minecraft font or any pixel font.
- Panels/windows: `mc-panel` (beveled stone window) + `mc-titlebar` (header strip). Inventory
  slots: `mc-slot` / `mc-slot--active`. Buttons: `mc-btn` (+ `-emerald` `-lapis` `-gold` `-amethyst`).
  Segmented bars: `mc-bar` + `mc-bar__fill` (set fill color via inline `backgroundColor`).
  Status chips: `mc-tag`. Inputs: `mc-input`.
- The base shadcn primitives are skinned to this look via helper classes so feature UI inherits it
  automatically: `Card` uses `mc-panel`; `Button` uses `mc-bevel` + `font-minecraft`; `Input` uses
  `mc-field`; `Badge` uses `mc-chip`; `Tabs` list/trigger are squared with emerald active state.
  Prefer plain `Card`/`Button`/`Input`/`Badge`/`Tabs` and let the skin apply; only reach for the raw
  `mc-*` classes for bespoke layouts (dashboards, headers).
- The Tailwind `emerald-*`/`gray-*` scales are remapped in `globals.css` `@theme` onto the docs'
  acid/green-tinted palette; prefer those utilities (or `--mc-*` vars) over new raw hex values.
- Use the existing pixel item art in `public/images/*.webp` with the `pixelated` class for icons.

Auth/session patterns:

- Axios client uses `withCredentials: true`; preserve it.
- Keep browser auth in `httpOnly` cookies; do not introduce token storage in `localStorage` or append JWTs to URLs.
- SSO: `getSetupStatus()` returns an optional `sso` field; the login page (`app/page.tsx`) shows a "Sign in with {provider}" button and, when `sso.passwordLoginDisabled`, hides the password form. SSO starts via `startSsoLogin()` (top-level navigation to the backend `/auth/oidc/login`, not axios). A `?ssoError=1` query shows a toast.

Server config tabs:

- Tabs are grouped by the question the user is asking, not by where the value is
  stored: `type`, `game`, `access`, `network`, `resources`, `lifecycle`, mods/plugins/addons,
  `backups`, `advanced`. `advanced` holds only escape hatches handed straight to Docker
  (`envVars`, `dockerVolumes`, `dockerLabels`, log options) - anything with a real home
  belongs in its own tab.
- A config field gets exactly one control. Two controls for the same field silently
  disagree, so before adding one, grep for `updateConfig('<field>'`.
- Bedrock has no tab of its own; its fields sit beside the Java equivalents, guarded by
  `edition === 'BEDROCK'`.
- Renaming or removing a tab value means adding an entry to `RENAMED_TABS` in
  `ServerConfigTabs.tsx`: the tab value is the URL hash and people bookmark it.
- Every `config` tab is disabled while the server runs, `worlds` included: a world
  swapped underneath a live server is a data hazard, and the rule only holds if it
  has no exceptions. Adding a config tab means adding it to `tabsMeta` with
  `disabled: isServerRunning` **and** to the `disabledTabs` list that bounces you
  off a tab the server just made unreachable.
- Simple/Advanced mode is a filter over the same tabs, never a second tab tree.
  Mark a tab `advanced: true` in `tabsMeta` and give it a predicate in
  `src/lib/server-config/advanced-tabs.ts`. The predicate is not optional: simple
  mode must never hide a setting that already has a non-default value, or the user
  looks for it, fails to find it, and cannot tell it is still being applied.
- Read the mode through `useConfigMode()`, not the store directly — it reports the
  default until mount so the persisted value cannot break hydration.

Java/Bedrock UI parity:

- Preserve edition-aware behavior in tabs and settings.
- Do not expose Java-only controls for Bedrock by mistake (proxy/RCON-specific behavior).

Tooling / build (Next.js 16):

- Turbopack is the default bundler for `next dev` and `next build`. `next.config.ts`
  uses a `turbopack` block; do not reintroduce a `webpack` config (it errors under Turbopack).
- `next lint` was removed. The `lint` script is `eslint src`, using the flat config
  exported by `eslint-config-next` in `eslint.config.mjs`. ESLint stays on 9.x until
  `eslint-config-next` supports 10 (its bundled `eslint-plugin-react` breaks on 10).
- `lucide-react` 1.x dropped brand icons; the GitHub mark in `GitHubStarButton.tsx` is an
  inline SVG on purpose.
- `next.config.ts` points `turbopack.root` and `outputFileTracingRoot` at the pnpm
  workspace root (`..`), where the lockfile and hoisted `node_modules` live. Because of
  that the standalone output keeps the `frontend/` prefix (`.next/standalone/frontend/server.js`
  next to a root `node_modules`); `frontend/Dockerfile` and the root `Dockerfile` rely on it.
- The React Compiler `react-hooks/*` rules shipped by eslint-config-next 16 are
  disabled in `eslint.config.mjs` to preserve the pre-upgrade baseline; revisit as a
  dedicated cleanup, not inside unrelated changes.

## Critical Files

- `src/services/axios.service.ts` - baseURL and credential behavior.
- `src/services/docker/fetchs.ts` - core server API calls.
- `src/services/files/files.service.ts` - files API contract.
- `src/components/molecules/FileBrowser/FileBrowser.tsx` - file management UX and upload/download behavior.
- `src/app/dashboard/files/page.tsx` - global file browser entry (`_root`).
- `src/app/dashboard/world-library/page.tsx` - world library entry (`.world`).
- `src/app/dashboard/servers/[server]/page.tsx` - dynamic server route binding.
- `src/components/molecules/Tabs/ServerTypeTab.tsx`
- `src/components/organisms/ServerConfigTabs.tsx` - server view content. Owns the single tab metadata source + command-palette index (`paletteItems`) + the `RENAMED_TABS` hash aliases; publishes the tab list/active tab to the global sidebar via `server-nav-store`.
- `src/components/organisms/Sidebar.tsx` - global sidebar; drills into a per-server tab nav when on `/dashboard/servers/[server]` (back button + grouped tabs), otherwise shows the base navigation.
- `src/components/organisms/SidebarServerNav.tsx` - server tab nav rendered inside the sidebar drill-in (grouped config/operation/monitoring, filter input + `TabSearch` palette); selecting a tab sets the URL hash.
- `src/lib/store/server-nav-store.ts` - shares the active server's tab list and active tab between the server page and the global sidebar.
- `src/components/organisms/TabSearch.tsx` - command palette (Ctrl/Cmd+K) to jump to tabs and settings.
- `src/components/molecules/ModpackFilePicker.tsx` - upload/select a modpack file; used by the AUTO_CURSEFORGE "File" method and the Modrinth modpack field.
- `src/components/molecules/Tabs/MetricsTab.tsx` - per-server CPU/RAM history chart.
- `src/components/molecules/ServerRuntimeChips.tsx` - one-line live stat strip (version, players,
  uptime, CPU, RAM) for a running server's header; also exports the `RuntimeChip` primitive reused
  by `dashboard/ServerQuickView.tsx`. Labels live in `title`/`aria-label` so the strip stays one line.
- `src/lib/hooks/useServerRuntimeStats.ts` - polls `/servers/:id/runtime-stats` every 10s while the
  server is running.
- `src/lib/utils/server-runtime-stats.ts` - shared CPU/RAM percentage parsing and player formatting.
  These return `null` for unknown values on purpose: an unreachable game must render as `-`, never `0`.
- `src/components/molecules/Tabs/ScheduledTasksTab.tsx` - scheduled tasks CRUD.
- `src/components/molecules/Tabs/ModWatchTab.tsx` - mod notes, target-version compatibility check, and on-demand changelog history; stays enabled while the server is running (unlike the Mods tab), and is read-only with respect to the mod list.
- `src/lib/store/servers-store.ts`
- `src/lib/translations/index.ts` and language files (`en.ts`, `es.ts`, `nl.ts`, `de.ts`, `fr.ts`, `pl.ts`, `ru.ts`, `pt.ts`)
- `eslint.config.mjs` - flat ESLint config (eslint-config-next 16).
- `next.config.ts` - Turbopack config, standalone output, image/compiler options.
- `package.json`

## Agent-Specific Instructions

General:

- Read root `AGENTS.md` before frontend edits.
- Do not add new state/API libraries unless explicitly required.
- If backend API contracts change, sync frontend services and update docs in `doc/`.

Path and serverId semantics (important):

- `serverId="_root"` means "all servers root" in files UI (maps backend to `/app/servers`).
- `serverId=".world"` means global world library (maps backend to `/app/servers/.world/worlds`).
- Any normal server ID maps to that server data directory in backend files module.
- Do not normalize or rewrite these IDs on frontend; pass them exactly as expected by backend.

File browser and uploads:

- Keep current upload semantics (`path` + optional `relativePath(s)`) because backend preserves folder structures using these fields.
- Keep encoding and query parameter usage stable for download URLs.
- Avoid frontend-side path sanitization that can conflict with backend path validation rules.

Routing and data flow:

- `dashboard/servers/[server]` route param is the source of truth for selected server ID.
- Keep service hooks (`useServerConfig`, `useServerStatus`) aligned with API endpoints.
- Do not move API logic into presentation components.

i18n:

- Any new user-facing key must be added to all active dictionaries (`en`, `es`, `nl`, `de`, `fr`, `pl`, `ru`, `pt`); the build fails if a dictionary is missing a key.
- Register a new locale only in `src/lib/translations/index.ts`; `languageOptions` updates both selectors and the settings service uses `Language` from that registry.
- Keep key naming consistent; avoid one-off names that break translation structure.

UI base components:

- Do not edit autogenerated base components in `src/components/ui/*` unless explicitly requested.
- Extend behavior through wrappers/composition in feature components.

## Required AGENTS.md Content

Every frontend AGENTS update must include:

- Project purpose
- Architecture
- Key commands
- Code patterns
- Critical files
- Specific agent instructions
- Context Maintenance Rule

## Writing Tips (Mandatory)

- Be explicit and concrete.
- Reference exact files for sensitive flows (auth, files, worlds, route params).
- Keep only relevant context.
- Iterate and tighten rules based on recurring mistakes.

## Context Maintenance (Golden Rule)

The agent must keep `frontend/AGENTS.md` and `frontend/README.md` updated whenever frontend workflow, architecture, commands, or conventions change.
