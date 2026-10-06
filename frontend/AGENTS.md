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
|  |- metrics/                  Per-server live monitoring and history endpoints
|  |- player-activity/          Player sessions, recorded playtime and session summary
|  |- players/                  Player list and profile (stats, advancements, inventory)
|  |- activity/                 Activity tracking settings, event timeline, inventory history
|  |- scheduler/                Scheduled tasks CRUD endpoints
|  |- achievements/             End Portal easter egg advancements (per user)
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
- Fonts (loaded via `next/font/google` in `app/layout.tsx`): Archivo (variable) carries the
  whole UI at its natural width (no `font-stretch`; the expanded width axis read as squashed).
  `font-minecraft` and `mc-btn` are the heading/label voice: Archivo semibold in
  natural case, never forced uppercase. Nav items drop to `font-medium`; small uppercase
  group labels use `tracking-[0.08em] text-gray-500`, never wide green tracking. Archivo Black uppercase is reserved for the one page
  title per screen (`h1.font-minecraft`) and the wordmark (`mc-display`). `mc-tag` (status
  chips) is Archivo bold small caps; `mc-count` is Archivo extra-bold tabular numbers.
  JetBrains Mono (`--font-mono`, tabular numerals) is for data, ports, paths and `mp-tag`.
  Do not reintroduce Mojang's proprietary Minecraft font, any pixel font, or Archivo Black
  on body-size text.
- Color: acid green (`emerald-*`) is the only brand accent (primary actions, active state,
  running). Semantic hues (`blue`, `cyan`, `amber`, `yellow`, `orange`, `red`, `purple`, and
  the `sky`/`indigo`/`violet` aliases) are retuned in `globals.css` `@theme` to sit on the
  green-black surfaces; `green` aliases `emerald`. Secondary actions use the neutral stone
  `mc-btn`, not extra colored fills. Save/confirm/search actions use the acid primary
  (`bg-emerald-400 text-gray-950`, also the `minepanel` Button variant); never white text on
  `emerald-600` (~3:1). Selected state (active tab, segmented toggle, nav item) is the tint
  `bg-[var(--mc-emerald)]/15 text-[var(--mc-emerald)]`, not a solid fill, so it never reads as
  a primary action. Section icon tiles are emerald (red only for danger).
  A stopped server is neutral gray, not warning yellow.
- Panels/windows: `mc-panel` (beveled stone window) + `mc-titlebar` (header strip). Inventory
  slots: `mc-slot` / `mc-slot--active`. Buttons: `mc-btn` (+ `-emerald` `-lapis` `-gold` `-amethyst`).
  Segmented bars: `mc-bar` + `mc-bar__fill` (set fill color via inline `backgroundColor`).
  Status chips: `mc-tag`. Inputs: `mc-input`.
- The base shadcn primitives are skinned to this look via helper classes so feature UI inherits it
  automatically: `Card` uses `mc-panel`; `Button` uses `mc-bevel` + `font-minecraft`; `Input` uses
  `mc-field`; `Badge` uses `mc-chip`; `Tabs` list/trigger are squared with emerald active state.
  The shadcn theme tokens in `globals.css` `:root` are dark (the panel has no light mode), so
  `outline`/`secondary` buttons, dialogs and skeletons fall back to the stone palette; the
  Radix slider is skinned by `data-slot` selectors in the same file.
  Prefer plain `Card`/`Button`/`Input`/`Badge`/`Tabs` and let the skin apply; only reach for the raw
  `mc-*` classes for bespoke layouts (dashboards, headers).
- The Tailwind `emerald-*`/`gray-*` scales are remapped in `globals.css` `@theme` onto the docs'
  acid/green-tinted palette; prefer those utilities (or `--mc-*` vars) over new raw hex values.
- Item art in `public/images/` is normalized: 128x128, transparent, content fitted to a
  124px box and centered, so every sprite reads at the same optical size in a slot. New
  sprites must follow the same rule (trim, fit, center). Full-bleed textures (`cow.jpg`,
  `villager.png`, `nether.webp`, `shield.png`, `neoforged.png`, `server-icon.png`) stay as-is.
  The `pixelated` class now means smooth downscaling (sprites are always drawn smaller than
  128px, where nearest-neighbour drops pixel rows); do not set `image-rendering: pixelated`
  on GUI surfaces, since it is inherited by the sprites inside them.
- No perpetual decorative motion in operating screens (no floating item rows or bobbing
  header icons); motion is for state changes.

Auth/session patterns:

- Axios client uses `withCredentials: true`; preserve it.
- Keep browser auth in `httpOnly` cookies; do not introduce token storage in `localStorage` or append JWTs to URLs.
- SSO: `getSetupStatus()` returns an optional `sso` field; the login page (`app/page.tsx`) shows a "Sign in with {provider}" button and, when `sso.passwordLoginDisabled`, hides the password form. SSO starts via `startSsoLogin()` (top-level navigation to the backend `/auth/oidc/login`, not axios). A `?ssoError=1` query shows a toast.

Server config tabs:

- Tabs are grouped by the question the user is asking, not by where the value is
  stored: `type`, `game`, `access`, `network`, `resources`, `lifecycle`, mods/plugins/addons,
  `backups`, `advanced`. `advanced` holds only escape hatches handed straight to Docker
  (`envVars`, `dockerVolumes`, `dockerLabels`, `composeSnippets`, log options) - anything with a real home
  belongs in its own tab.
- A config field gets exactly one control. Two controls for the same field silently
  disagree, so before adding one, grep for `updateConfig('<field>'`.
- Bedrock has no tab of its own; its fields sit beside the Java equivalents, guarded by
  `edition === 'BEDROCK'`.
- Renaming or removing a tab value means adding an entry to `RENAMED_TABS` in
  `ServerConfigTabs.tsx`: the tab value is the URL hash and people bookmark it.
- Adding any tab (config or not) means adding its value to `ALL_TAB_VALUES`. The side nav
  switches tabs by setting the hash, and a value missing there is silently ignored: the tab
  shows in the nav but clicking it does nothing.
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
  Owns the current folder's listing plus the search query and sort state; `FileList` renders
  what it is given. Filtering and sorting are client-side over the loaded folder - there is no
  recursive search endpoint, so do not fake one by walking the tree from the browser.
  Also owns the selection (`selectedPaths`, the keyboard cursor `activePath` and the Shift
  anchor `anchorPath`) and the delete / rename / upload-conflict dialogs; actions only apply to
  selected rows that are visible under the current filter.
- `src/components/molecules/FileBrowser/file-types.ts` - the single list of extensions that open
  in the text editor. Keep binary formats (`.nbt`) out: saving them back as text corrupts them.
- `src/components/molecules/FileBrowser/FileStatusBar.tsx` - footer counts (folders, files,
  total size) and the "showing X of Y" line while a filter is active.
- `src/app/dashboard/files/page.tsx` - global file browser entry (`_root`).
- `src/app/dashboard/world-library/page.tsx` - world library entry (`.world`).
- `src/app/dashboard/servers/[server]/page.tsx` - dynamic server route binding.
- `src/components/molecules/Tabs/ServerTypeTab.tsx`
- `src/components/organisms/ServerConfigTabs.tsx` - server view content. Owns the single tab metadata source + command-palette index (`paletteItems`) + the `RENAMED_TABS` hash aliases; publishes the tab list/active tab to the global sidebar via `server-nav-store`.
- `src/components/organisms/Sidebar.tsx` - global sidebar; drills into a per-server tab nav when on `/dashboard/servers/[server]` (back button + grouped tabs), otherwise shows the base navigation.
- `src/components/organisms/SidebarServerNav.tsx` - server tab nav rendered inside the sidebar drill-in (grouped config/operation/monitoring, filter input + `TabSearch` palette); selecting a tab sets the URL hash.
- `src/lib/store/server-nav-store.ts` - shares the active server's tab list and active tab between the server page and the global sidebar.
- `src/components/organisms/TabSearch.tsx` - command palette (Ctrl/Cmd+K) to jump to tabs and settings.
  Setting entries in `paletteItems` carry `field` (an element id in the tab); `ServerConfigTabs`
  scrolls to it via `server-nav-store.field`. Renaming a field `id` means updating its entry,
  and a field inside a section simple mode hides needs `advanced` set.
- `src/components/molecules/ModpackFilePicker.tsx` - upload/select a modpack file; used by the
  AUTO_CURSEFORGE "File" method, the deprecated CURSEFORGE `cfServerMod` field and the Modrinth
  modpack field. It inspects only the selected file and reports the result through `onInspection`.
- `src/lib/utils/curseforge-ref.ts` - single parser for "what did the user type": a pack page
  URL, a slug, a project id, or a name to slugify. `CurseForgeModpackSection` and the search
  rescue both read it; do not re-implement the URL regex.
- `src/components/molecules/modpacks/ModpackNotFoundHelp.tsx` - the empty state for both the
  Browse dialog and the templates page. Before it renders, the caller retries the query as an
  exact reference (`findModpackByQuery`), because CurseForge's fuzzy search and its slug lookup
  are different indexes.
- `src/components/molecules/modpacks/ModpackClientModsPanel.tsx` - the client-mod review for an
  uploaded archive. Shown only for archives the image unpacks as-is (`generic`, `server-pack`);
  a CurseForge client pack is filtered by the image itself, so offering it there is noise.
  Stripping writes a sibling copy and repoints the config field - it never edits the upload.
- `src/components/molecules/modpacks/ModpackZipGuidance.tsx` - turns that inspection into the one
  action the archive actually needs: switch the server type, or pick a loader and version for a
  zip that declares none (`genericPack` -> `GENERIC_PACK`). It is the only place that rewrites
  `serverType` from the Mods tab.
- `src/components/molecules/Tabs/MetricsTab.tsx` - live tick/resource overview and history.
  Uses `molecules/monitoring/monitoring-chart.tsx` for charts and `monitoring-alerts.tsx`
  for existing Discord settings. Native NeoForge TPS is explicitly estimated; mean
  MSPT and spark median/P95 stay distinct. Null samples and downtime break chart lines.
  Charts show the latest sample, labelled scales and min/max of available samples;
  memory uses GiB in cards and charts. Chart probes support hover, touch and keyboard
  navigation; keep pointer state local and never project samples into downtime gaps. Keep the history view free of sliders.
  The admin-only `monitoring/tick-command-card.tsx` picks the tick source from a preset dropdown
  (Automatic, TabTPS, NeoForge, spark, Custom); its regex patterns show only in Advanced mode, or
  whenever saved ones exist, so nothing in effect is hidden.
  Live polls run after completion (10s); history every 60s. Failed live requests clear
  values; history failures are shown without presenting old samples as current.
- `src/components/molecules/ServerRuntimeChips.tsx` - one-line live stat strip (version, players,
  uptime, CPU, RAM) for a running server's header; also exports the `RuntimeChip` primitive reused
  by `dashboard/ServerQuickView.tsx`. Labels live in `title`/`aria-label` so the strip stays one line.
- `src/lib/hooks/useServerRuntimeStats.ts` - polls `/servers/:id/runtime-stats` every 10s while the
  server is running.
- `src/lib/utils/server-runtime-stats.ts` - shared CPU/RAM percentage parsing and player formatting.
  These return `null` for unknown values on purpose: an unreachable game must render as `-`, never `0`.
- `src/components/molecules/Tabs/ScheduledTasksTab.tsx` - scheduled tasks CRUD.
- `src/components/molecules/Tabs/ModWatchTab.tsx` - mod notes, target-version compatibility check, and on-demand changelog history; stays enabled while the server is running (unlike the Mods tab), and is read-only with respect to the mod list.
- `src/components/organisms/settings/end/` - the Danger Zone easter egg: a first-person
  Minecraft-like run. Only `settings/EndPortalEasterEgg.tsx` is in the settings bundle; it loads
  the store, audio and story text (`lore/`) and then the journey (`EndJourney`, `JourneyScene`,
  `panels/`) on click, so `three`, the store and the story never reach the page. At page load it
  reads only `store/persist.ts` and `store/admins.ts`: import those files directly, never the
  `store` index. The start screen's Play unlocks the audio, since the button's click came before
  the audio module loaded. Nothing outside this
  folder may import from it, except `AchievementsTrophy.tsx`: the dashboard header's trophy slot.
  It carries only the key catalog (`achievements.ts`) and the egg icon; its list, badges and lore
  load with `next/dynamic` when it opens. `advance()` reports each key through
  `lib/store/achievements-store.ts` (`POST /achievements`, per user). A new advancement key goes
  in `achievements.ts` and in `backend/src/achievements/dto/unlock-achievement.dto.ts`.
  - `engine/`: the block grid (`world.ts`, one `World` per zone, buried blocks are not drawn;
    `WorldMesh` draws it per 32x32-column chunk, so a mined block rebuilds only its chunk, three culls
    chunks out of view and chunks past the fog are hidden; `floor` skips faces pointing down into
    the ground), the day clock (`clock.ts`: a ten-minute day that pause, windows and death stop;
    the Overworld's sky, fog and lights follow it, and its camp bed skips the night),
    AABB physics (`physics.ts`), voxel/target raycasts, input, `Player.tsx` (movement, pointer
    lock, crosshair, mining, bow, eating, damage), `Hand.tsx` (the first-person arm and held item,
    drawn in a drei `Hud` pass with the game's swing/bow/eat poses), projectiles and particle
    effects. Anything the crosshair can use or hit registers a `Target` (`runtime.ts`); R3F pointer
    events are not used. `BLOCKS` (`world.ts`) says how long a block takes by hand (`mine`) or with the
    pickaxe (`pick`) and what it `drop`s; an item with a `block` in `ITEMS` is placed with right click
    (hold to repeat), one with `food` is eaten by holding it. `Drops.tsx` holds item entities (mob
    loot, barters, your shot arrows) that you pick up by walking over them; a monster's loot table is
    the `loot` option of `useMonster`, rolled by `dropLoot` when it dies. Armor is four gold pieces
    (`ARMOR` in `items.tsx`, the store's `armor`), 4% less damage per point; any piece calms piglins.
    Holding right click with the shield sets the store's `blocking`, which `hurt()` honours for
    every cause outside `UNBLOCKABLE` (`store/health.ts`); a totem anywhere in the inventory takes a
    death. The store never imports `end-audio` (it would be a cycle): `Player.tsx` plays the block
    and totem sounds when `blockedAt`/`savedAt` change. `lockPointer()` also takes the screen full
    screen and locks `KeyW`, so every caller must be a click. `runtime.hooks.vibration` is how steps, landings, blocks, chests
    and arrows reach the ancient city's noise and the Warden.
  - Graphics (the shader-pack look): `engine/quality.ts` has three tiers the drei
    `PerformanceMonitor` in `engine/Graphics.tsx` steps between (high: 2048 shadows plus the
    `@react-three/postprocessing` composer with N8AO, bloom, grading and SMAA; medium: 1024
    shadows; low: none, DPR 1). Never turn on `multisampling` in the composer: it cost more than the AO.
    Zones with a sun use `engine/Sun.tsx` instead of a bare `directionalLight` (its position is a
    direction; it follows the player for shadows). Bloom only catches values past 1: register a
    glowing singleton material with `glow(material, boost)` (`engine/shading.ts`), which only
    brightens it while bloom runs; `sway()` makes foliage move in the wind. A hand-written
    `ShaderMaterial` must end with `outputColor()` (`OUTPUT_GLSL`) or it looks washed out inside the
    composer. Water is not a cube per block: `WorldMesh` builds one mesh of its visible faces per
    chunk (`engine/water.ts`), and the zone feeds its sky to `waterSky`/`setWaterSky`. With the
    composer on, the hand's `Hud` renders at priority 2 so the scene is not drawn twice.
  - `acts/`: one scene per zone (`Overworld`, `AncientCity`, `Sift`, `Nether`, `Stronghold`, `End`,
    `EndCity`), plus shared props. The Sift is an optional side trip, never a split: `SiftGate.tsx`
    puts four note blocks at the ancient city's frame; the sign's tune plays the Sift's song
    (`playSong` in `end-audio.ts`, an original composition, never a Minecraft track), freezes the
    noise meter while it plays, and sets `siftOpen`, after which the frame leads to `acts/Sift.tsx`.
    The spirit is `acts/SiftSpirit.tsx`, timed off the note and kick times `playSong` returns. The
    Sift's regions, heights and spots live in `acts/sift-layout.ts` (pure, shared by the builder and
    the scene); Blubs, Sifters and turtles in `mobs/sift.tsx`; ichor hurts like lava. The diamond
    sword has no recipe: it is The Sift's reward, and the camp's iron makes the run's sword. `mobs/`: models built from pixel-sized boxes with their AI;
    walking mobs move through `useMob` (`mobs/parts.tsx`: wander, chase, panic, knockback, gravity,
    step-up, climbing out when buried, never into lava) on the same physics as the player. Mobs a
    run depends on for supplies (endermen for pearls, piglins for barters) come back through
    `useRespawns` (`mobs/parts.tsx`), keyed by life, so no run can run dry. Natural spawns go through
    `useSpawner` (`mobs/spawner.ts`: a cap, a distance band around the player, a condition such as
    night, and unloading far away); the Overworld's skeletons spawn that way at night and burn by day.
    Monsters mark their target `hostile`, which is what the bed checks. `acts/NightMobs.tsx` holds
    every Overworld night spawner by biome; `useMonster` (`mobs/monsters.tsx`) takes `burns`
    (`mobs/sunburn.ts`), `calm` (spiders by day) and `onHurt` (zombified piglins call each other).
    `useMob` hides a mob past the fog. A wide mob's home must clear walls and props by its half
    width, or it climbs out on top of them (the golem did).
  - Secret achievements are ordinary keys at the end of `achievements.ts` (the trophy shows every
    missing key as `???`); the flags they look back on (`endermanKilled`, `kevinHit`, `glided`...)
    are set where it happens, and the islet ones are granted at the end of the islet script.
    `store/persist.ts` keeps what outlives a run in `localStorage` (the egg, the death count behind
    `{deaths}`) and `season()` (Halloween pumpkins, Christmas chests). `acts/Server48.tsx` is the
    epilogue the thanks screen opens.
  - The Overworld is 257×257: `acts/overworld-layout.ts` keeps the story core (plains, inside 50
    blocks) and bends four biomes around it with `simplex-noise` (`biomeAt`, `groundHeight`,
    `FLAT` spots for every structure); `acts/overworld-biomes.ts` builds their columns, trees and
    structures, and `acts/Biomes.tsx` holds their props (ruin signs, chests, the TNT plate, cactus
    damage). `engine/explode.ts` is the shared blast (Kevin, TNT). Blocks whose four sides share a
    texture are drawn with a three-group box (`WorldMesh`), so they cost three draw calls per chunk.
  - Replay modes (`store` `mode`: normal, speedrun, hardcore, bfuuny) are picked on the start screen
    once `advFreeEnd` is earned. `engine/RunClock.tsx` records splits and the finish from
    `runtime.playTime` and sends timed runs through `services/end-runs/` (`POST /end-runs`); the
    records window is `panels/LeaderboardPanel.tsx`. `run.ts` holds BlasterDaster's time and the
    formatter so the thanks screen does not pull in the 3D engine. `engine/Screenshot.tsx` is F2.
  - The start screen and the pause menu are `PauseMenu` (`hud/Screens.tsx`): a title (the start
    one with the game's yellow splash), the main button, pairs of smaller ones, and the controls
    on their own page (Escape goes back to the menu there, not into the game).
  - Signs paint their text on the board (`acts/props.tsx`), like the game's; the click still opens
    them large. The text of every sign lives in `signs.ts`.
  - Story text is for players, not sysadmins: Minepanel is for people who want an easy server.
    Every joke must land in all 9 languages without knowing a meme, a game tribute or server jargon. Skins are painted in code
    (`mobs/skins.tsx`: a `SkinArt` of palettes and face rows per box, unfolded into one atlas per mob
    like the game's model textures; `useSkin` gives each mob its own material). `useDamage` is the
    shared red hurt flash and the topple-and-poof death. Boxes, pivots and rotations follow the
    vanilla Java entity models converted to +y up, +z forward (x kept, y and z negated; rotation y/z
    negated, order `ZYX`). Passive mobs share `useAnimal` (`overworld.tsx`); the next phase's
    monsters (`monsters.tsx`, `nether-monsters.tsx`, `endermite.tsx`) share `useMonster` (hunt,
    melee hit, death cause), `useHop` (slimes, magma cubes) and `Glow` (unlit eye layers).
  - `store/`: one zustand store from slices (game, inventory, health, hud). A zone change goes
    through `travel()` + `arrive()` so it swaps behind the veil. `flags` hold one-shot story beats.
    A zone's `useFrame` waits for `checkpoint` (its mount effect sets it): until the player is placed,
    `runtime.player.pos` is still the previous zone's. Read `entry` once at mount, never subscribe to it.
    The Overworld replays `mined` and `placed` when you come back to it; other zones rebuild fresh.
    Windows follow the game's clicks: `clickSlot` (left/right/shift with a held `cursor` stack),
    `spread` (drag), `takeOutput` (result slot); `closePanel` returns grid and cursor to the
    inventory. Escape closes a window or the pause menu; the pointer is relocked only after the
    Escape key comes back up (Chrome otherwise treats that key as leaving the fresh lock). When the
    browser refuses to relock, `resume` shows a click-to-play prompt instead of the pause menu.
  - `lore/<lang>.ts`: every string of the run, typed `Record<LoreKey, string>`; add a key to all
    9 files. Render it with `useLore()` (fills `{player}`, `{ghost}` = Ketbome, `{days}`), never with the
    global `t()`. The global dictionaries keep only the page's `dangerEgg*` keys.
  - The story is the three admins (`store/admins.ts`): Ketbome builds servers he never finishes,
    BlasterDaster is the pro who got everywhere first, Bfuuny is the good-natured troll who keeps
    dying. They talk in the chat as themselves (`say(key, author)`) and wait on the End City islet,
    where the run ends on their thanks (`Thanks.tsx`, also shown after the poem). The button in the
    ancient city lets The Rake (`mobs/rake.tsx`) loose: from then on, in any zone, it can follow you
    unseen (only its breathing shows in the subtitles); looking at it triggers the screamer
    (`hud/Screamer.tsx`), a few seconds with its hands over its face, and then the chase.
  - Sounds: CC0 clips in `public/sounds` (credited in `CREDITS.md`), each cue with a synth fallback
    in `end-audio.ts`. Block textures are painted at runtime (`voxels.tsx` End,
    `overworld-voxels.tsx` Overworld and deep dark, `nether-voxels.tsx`, `sift-voxels.tsx`).
  - The overlay is exempt from the no-perpetual-motion rule; it is not an operating screen. Reduced
    motion still plays, with a steady camera (`runtime.reducedMotion`: no bobbing, no FOV kicks, no
    hand sway) and the poem without scrolling; only a browser without WebGL2 falls back to the
    poem, with a notice on enabling hardware acceleration.
- `src/lib/store/servers-store.ts`
- `src/lib/translations/index.ts` and language files (`en.ts`, `es.ts`, `nl.ts`, `de.ts`, `fr.ts`, `pl.ts`, `ru.ts`, `pt.ts`, `tr.ts`)
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

- Any new user-facing key must be added to all active dictionaries (`en`, `es`, `nl`, `de`, `fr`, `pl`, `ru`, `pt`, `tr`); the build fails if a dictionary is missing a key.
- Register a new locale only in `src/lib/translations/index.ts`; `languageOptions` updates both selectors and the settings service uses `Language` from that registry.
- Only `en` is bundled (it is the prerendered first render); every other dictionary is its own chunk,
  loaded by `loadDictionary` when picked, and `useLanguage` switches only once it has arrived. Never
  import a dictionary file from UI code: it would ship in every page's initial JS again.
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

The Files tab opens `server.properties` in `src/components/molecules/FileBrowser/ServerPropertiesEditor.tsx`. It edits existing properties only, preserves comments and unknown lines, and leaves properties backed by `server.json` to Server Settings. `server-properties-model.ts` owns parsing, line replacement and the save/restore change summary. Guided and raw views share one draft; switching must preserve unsaved text. Backups are listed through the files service from the same folder, and restoring one uses the ordinary file write so the current file is backed up first.


Player profiles: the Players tab renders `PlayersTab` on Java (sessions live in the profile's
Sessions sub-tab, `PlayerSessions`) and `src/components/molecules/players/player-activity.tsx`
on Bedrock; both read the same API and work on stopped servers. API calls live in
`src/services/player-activity/`. Show stale presence as unknown and interrupted departures
as last observations. Keep saved Java world totals distinct from panel-recorded playtime.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
