---
title: Worlds - Minepanel Guide
description: Run a specific Minecraft world on a Java server with Minepanel - the per-server Worlds tab, the shared World Library, importing worlds from CurseForge or a URL, level names and force world copy.
head:
  - - meta
    - name: keywords
      content: minecraft world, world library, level name, world switching, curseforge worlds, world import, FORCE_WORLD_COPY, level.dat, minepanel worlds
  - - meta
    - property: og:title
      content: Worlds - Minepanel
  - - meta
    - property: og:description
      content: Pick which world a Java server runs, keep a shared world library, and import worlds from CurseForge or a direct URL.
---

# Worlds

Minepanel keeps the worlds you *can* run separate from the world a server *is*
running. You drop worlds into a library, pick one from the server's **Worlds** tab,
and the server copies it into its data directory on the next start.

::: warning Java Edition only
World switching uses `WORLD`, `LEVEL` and `FORCE_WORLD_COPY` from
`itzg/docker-minecraft-server`, which Bedrock does not support. Bedrock servers have
no Worlds tab; put the world in `mc-data/worlds/` yourself.
:::

## The two libraries

| Library | Path | Scope |
| --- | --- | --- |
| Server | `servers/<server-id>/worlds/` | Only that server sees it |
| Shared | `servers/.world/worlds/` | Every server sees it |

Both are mounted **read-only** into the container (`/data/.world-library/local` and
`/data/.world-library/global`), so a running server can never write back into a
library. The world it plays is a copy under `mc-data/<level-name>/`.

Use the shared library for anything you might run twice — a downloaded adventure
map, a fresh survival seed you keep re-rolling. Use the per-server one for worlds
that only make sense on that server.

### What counts as a world

- A **folder** containing `level.dat`, at any depth. Subfolders are just grouping:
  `skyblock/atm10/` and `minigames/bedwars/` both show up as worlds, listed under
  their folder.
- An **archive**: `.zip`, `.tar`, `.tar.gz` or `.tgz`.

Anything else is ignored, so a `README.md` or a screenshot sitting in the library
does not turn into a broken entry.

## Picking a world

The server's **Worlds** tab lists both libraries, with a search across them and a
badge saying whether that world has already been copied into the server.

::: warning The server has to be stopped
Like every other configuration tab, **Worlds** is disabled while the server is
running. Swapping the world underneath a live server means the running one is
still holding files it is about to lose. Stop the server, pick the world, start it
again.
:::

1. Stop the server.
2. Open **Worlds** and pick a world. The **level name** is filled in from the
   world's own name — that is the folder it will live in under `mc-data/`, and what
   `level-name` in `server.properties` points at.
3. Apply, then start the server. The copy happens on that start.

**Already copied** on a world means `mc-data/<level-name>/level.dat` exists. From
then on the server plays that copy; the library still holds the pristine original.

### Force world copy

Off by default. When on, the world is copied over the target level **on every
start**, so any progress made since the last start is gone.

Turn it on to hand out a fixed map that resets each restart (minigames, a lobby).
Leave it off for anything anyone is meant to keep playing.

## Filling the library

### From the panel

**World Library** in the sidebar lists what you already have as searchable cards,
filtered by name or by the folder an import landed in. The file browser is still
there, folded away, for uploading a `.zip`, renaming, or deleting.

### Discover Worlds

The same page can pull worlds in from outside:

- **CurseForge search** — browse and import worlds directly. Needs a CurseForge API
  key in **Settings → Integrations**. Imports land in
  `servers/.world/worlds/curseforge/`.
- **Direct URL** — any HTTPS link to a `.zip`, `.tar`, `.tar.gz` or `.tgz`. Imports
  land in `servers/.world/worlds/url/`.

### By hand

Copy the folder or archive into `servers/.world/worlds/` (shared) or
`servers/<server-id>/worlds/` (that server only). It shows up on the next load of
the Worlds tab — nothing to register.

## Worlds that come with a modpack

CurseForge modpacks that ship their own world (the "To The Sky" style packs) do not
need the library at all. Set **CF_SET_LEVEL_FROM** (`WORLD_FILE` or `OVERRIDES`)
under the CurseForge options so the pack's bundled world is used. Picking a world in
the Worlds tab clears that setting, because the two would fight over the same level.

World *generation* is a separate thing from world *selection*: the level type
(flat, amplified, a modpack's custom generator) lives in the **Game** tab. See
[Server Types](/server-types#world-type-level-type).

## Where the files are

```txt
servers/
├── .world/worlds/            shared library (read-only to servers)
│   ├── curseforge/           CurseForge imports
│   └── url/                  URL imports
└── my-server/
    ├── worlds/               this server's library (read-only to servers)
    └── mc-data/
        └── <level-name>/     the world actually being played
```

## Troubleshooting

**The world I picked is not the one that loaded.** The copy only happens when the
target level does not exist yet. If `mc-data/<level-name>/` is already there, the
server keeps playing it. Either pick a different level name or turn on force world
copy.

**My world is not in the list.** A folder needs a `level.dat` directly inside it —
if your archive unpacked into `MyWorld/MyWorld/level.dat`, point at the inner
folder or re-zip it. Archives must be one of the four supported extensions.

**I lost progress after a restart.** Force world copy overwrites the level on every
start. Turn it off; the copy under `mc-data/` is what holds the progress.

## Next Steps

- [Server Types](/server-types) — level types and modpack world options
- [Features](/features) — file management and backups
- [Backups](/features#backups) — keep the world you are playing safe
