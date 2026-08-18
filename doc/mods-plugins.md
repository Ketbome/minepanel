---
title: Mods, Plugins & Addons - Minepanel Guide
description: Complete mod and addon management guide - Automatic installation from Modrinth and CurseForge for Java Edition. Behavior packs and resource packs for Bedrock Edition. Step-by-step tutorials.
head:
  - - meta
    - name: keywords
      content: minecraft mods, minecraft plugins, modrinth, curseforge, spiget, minecraft addons, behavior packs, resource packs, mod installation, plugin manager
  - - meta
    - property: og:title
      content: Mods, Plugins & Addons - Minepanel
  - - meta
    - property: og:description
      content: Install mods from Modrinth and CurseForge for Java. Bedrock addon installation guide.
---

# Mods, Plugins & Addons

Manage mods for Java Edition and addons for Bedrock Edition from the same Minepanel workflow.

![Mods Tab](/img/mods-tab.webp)

## Overview

| Edition     | Platforms / Sources                    | Automation                                  |
| ----------- | -------------------------------------- | ------------------------------------------- |
| **Java**    | Modrinth, CurseForge, Spiget           | ✅ Automatic                                |
| **Bedrock** | Upload `.mcaddon` / `.mcpack` / `.zip`, CurseForge | ✅ Import, enable/disable, sync to world |

```mermaid
flowchart LR
    subgraph Java["Java Edition"]
        MR["🟢 Modrinth"]
        CF["🟠 CurseForge"]
        SP["🔵 Spiget"]
    end

    subgraph Bedrock["Bedrock Edition"]
        BP["📦 Behavior Packs"]
        RP["🎨 Resource Packs"]
    end

    MP["🎮 Minepanel"] --> Java
    MP --> Bedrock

    style MP fill:#1f2937,stroke:#22c55e,color:#fff
    style Java fill:#065f46,stroke:#22c55e,color:#fff
    style Bedrock fill:#d97706,stroke:#fbbf24,color:#fff
```

---

## Java Edition Platforms

| Platform       | Best For                 | API Key Required |
| -------------- | ------------------------ | ---------------- |
| **Modrinth**   | Mods, datapacks, plugins | ❌ No            |
| **CurseForge** | Modpacks, mods           | ✅ Yes           |
| **Feed The Beast** | FTB modpacks          | ❌ No            |
| **Spiget**     | Spigot/Paper plugins     | ❌ No            |

::: tip Learn More
For advanced options and all environment variables, see the [docker-minecraft-server mods documentation](https://docker-minecraft-server.readthedocs.io/en/latest/mods-and-plugins/).
:::

### Paper Cross-Play Template

If you want a Java server that also accepts Bedrock players, Minepanel now includes a **Paper Cross-Play** template in **Create Server -> From Template**.

It preconfigures:

- `Geyser`
- `Floodgate`
- `ViaVersion`
- `19132:19132/udp` as an extra port for Bedrock connections

This is a preset for faster setup. You can still edit the plugin URLs or extra ports later from the server configuration tabs.

## Integrated Mod Search in Minepanel

Minepanel includes an integrated search dialog in the **Mods** tab for both **CurseForge Files** and **Modrinth Projects**.

### What it does

- Searches directly from Minepanel (no need to manually browse first)
- Filters results by current server compatibility:
  - Minecraft version
  - Loader (Forge/Neoforge/Fabric/Quilt) when available
- Accepts a mod name or a pasted slug (for example `moogs-end-structures`)
- On Modrinth, a **Mods / Datapacks** selector switches the search to datapacks; picked
  entries are written with the `datapack:` prefix and resolved against the datapack loader
- Sorts results by **Relevance**, **Downloads** or **Recently updated**
- Filters by provider category (CurseForge and Modrinth expose their own category lists)
- Adds entries in one click as:
  - **Slug** (default)
  - **ID**
- Adds mods unpinned (no `:fileId` suffix), so the image resolves the newest compatible
  version on every start. Pinning a specific version is done afterward from the mod list
  editor, where every entry has a version dropdown

### How to use it

1. Open **Create Server** or **Edit Server**
2. Go to the **Mods** tab
3. In either **CurseForge Files** or **Modrinth Projects**, click **Search mods**
4. On Modrinth, choose **Mods** or **Datapacks**
5. Optionally narrow the results with the sort and category selectors
6. Pick insertion format (Slug or ID)
7. Click **Add mod**

The selected entries are appended to the same existing fields (`CURSEFORGE_FILES` and `MODRINTH_PROJECTS`) using newline format, preserving manual entries and avoiding duplicates.

### Mod list editor

Both fields render their content as a list instead of raw text:

- Each mod shows its icon, name and the pinned version
- The version dropdown lists every compatible version and includes **Latest available**
  (which removes the pin and lets the image resolve it at startup)
- An **Update available** badge appears next to a pinned mod when a newer compatible
  version exists; clicking it re-pins the mod to that version
- The trash icon removes the mod
- **Manual** switches back to the raw text area (`slug`, `slug:fileId`, URLs, `datapack:slug`),
  which is still the way to paste a list or use formats the list editor does not model
- **Optional** (Modrinth only) marks a mod with itzg's `?` suffix: the server logs a
  warning and keeps starting when no compatible version exists, and the mod is left out
  of the version calculation done by `VERSION_FROM_MODRINTH_PROJECTS`
- Past 8 mods the list shows a filter box (matches name or ID) and paginates at 10 per page

### Where the list is stored

There is no separate mods file. The list is one string per provider —
`modrinthProjects` and `cfFiles` — inside `servers/<server-id>/server.json`, written in
itzg's own comma-separated syntax and passed to the container as `MODRINTH_PROJECTS` and
`CURSEFORGE_FILES`.

The list editor is a view over that string: pinning a version writes `slug:version`,
unpinning drops the suffix. Anything the editor cannot model — a URL, an `@file`
reference — is left exactly as typed and shown as-is, which is why **Manual** is always
one click away.

Editing `server.json` by hand works and survives, as long as the panel is stopped while
you do it. Editing the generated `docker-compose.yml` does not: it is rebuilt from
`server.json` on the next start.

### CurseForge API key

The key is read from **Settings -> Integrations** and injected into the generated compose
on save, so the Mods tab no longer asks for a per-server key. Modrinth needs no key at all.

## Mod Watch tab

For Java servers with mod pinning available (Forge/Neoforge/Fabric/AUTO_CURSEFORGE/CurseForge/Modrinth/GTNH/FTBA),
Minepanel adds a **Mod Watch** tab that stays available even while the server is running (unlike the
**Mods** tab, which locks while the server is up). It is a read/browse dashboard, not an editor for
the pinned mod list itself — that stays in the **Mods** tab.

### What it shows

- Every currently pinned mod (parsed from `CURSEFORGE_FILES`/`MODRINTH_PROJECTS`) with its pinned version
- A free-text **note** per mod, saved automatically and independent of the docker-compose config
- A **desired Minecraft version** for the whole server — a single target version you're considering
  upgrading to, used only to check mod compatibility ahead of time. It does not change the server's
  live version
- A compatibility badge per mod against the desired version, once one is set
- An on-demand **changelog history** per mod, available at any time: every version released between
  the currently pinned version and the latest (or desired-version-compatible) version, concatenated
  so you can see everything you'd pick up on an update

### Where this data is stored

Notes and the desired version are stored in `servers/<server-id>/mod-metadata.json`, separate from
`docker-compose.yml`. Deleting a server removes this file with it; it has no effect on server startup
or mod resolution.

---

## Modrinth

Automatically download and manage mods, plugins, and datapacks from [Modrinth](https://modrinth.com).

### Supported Server Types

- ✅ Fabric
- ✅ Forge
- ✅ Neoforge
- ✅ CurseForge (AUTO_CURSEFORGE)
- ✅ Modrinth Modpacks

### How to Add Mods from Minepanel

1. Go to **Create Server** or **Edit Server**
2. Open the **Mods** tab
3. Find the **Modrinth Projects** field (blue border)
4. Enter project slugs separated by commas or new lines
5. Configure dependencies and version type if needed
6. Save the server

**Example input:**

```
fabric-api
sodium
lithium
cloth-config
```

### Datapacks from Modrinth {#datapacks}

Modrinth also hosts datapacks. The fastest way to add them is the integrated search:
click **Search mods** in **Modrinth Projects** and switch the selector to **Datapacks**.
Minepanel writes the entry with the `datapack:` prefix and pins the latest compatible
datapack version. To write them by hand, use the same prefix:

**In Minepanel (Modrinth Projects field):**

```
fabric-api
sodium
datapack:terralith
datapack:incendium
datapack:nullscape:1.2.4
```

**Syntax:**

| Format                  | Example                    | Description      |
| ----------------------- | -------------------------- | ---------------- |
| `datapack:slug`         | `datapack:terralith`       | Latest version   |
| `datapack:slug:version` | `datapack:terralith:2.5.5` | Specific version |
| `datapack:slug:beta`    | `datapack:terralith:beta`  | Latest beta      |

::: tip Vanilla Servers
For vanilla servers, the `datapack:` prefix is optional. The system auto-detects datapacks.
:::

::: warning
Datapacks require a compatible Minecraft version. Check the datapack page on Modrinth for compatibility.
:::

### Project Reference Formats

The **Modrinth Projects** field accepts multiple formats:

| Format              | Example                     | Description       |
| ------------------- | --------------------------- | ----------------- |
| Slug                | `fabric-api`                | Latest release    |
| Slug + version      | `fabric-api:0.119.2+1.21.4` | Specific version  |
| Slug + version ID   | `fabric-api:bQZpGIz0`       | By version ID     |
| Slug + release type | `fabric-api:beta`           | Latest beta/alpha |
| Project ID          | `P7dR8mSH`                  | Using Modrinth ID |
| Loader override     | `fabric:fabric-api`         | Force loader type |
| Datapack            | `datapack:terralith`        | Install datapack  |
| Optional            | `fabric-api?`               | Never blocks startup |

### Configuration Options

| Field                 | Description                       | Default   |
| --------------------- | --------------------------------- | --------- |
| **Modrinth Projects** | List of mods/plugins/datapacks    | -         |
| **Dependencies**      | `none`, `required`, or `optional` | `none`    |
| **Version Type**      | `release`, `beta`, or `alpha`     | `release` |

::: tip Auto-Removal
Mods removed from the list will be automatically deleted on next server start.
:::

### Docker Compose Reference

If you prefer to configure via docker-compose directly:

```yaml
environment:
  TYPE: FABRIC
  VERSION: 1.21.4
  MODRINTH_PROJECTS: |
    fabric-api
    sodium
    datapack:terralith
  MODRINTH_DOWNLOAD_DEPENDENCIES: required
  MODRINTH_PROJECTS_DEFAULT_VERSION_TYPE: release
```

<details>
<summary>More docker-compose examples</summary>

**Forge server with specific versions:**

```yaml
environment:
  TYPE: FORGE
  VERSION: 1.20.1
  MODRINTH_PROJECTS: |
    jei:10.2.1.1005
    geckolib
    create
```

**Using a listing file:**

Create `/path/to/mods.txt`:

```
# Performance mods
fabric-api
sodium
lithium

# Datapacks
datapack:terralith
datapack:incendium
```

Then mount and reference:

```yaml
volumes:
  - ./mods-list:/extras:ro
environment:
  MODRINTH_PROJECTS: '@/extras/mods.txt'
```

</details>

## Modrinth Modpacks {#modrinth-modpacks}

Install complete modpacks from [Modrinth](https://modrinth.com) using the **MODRINTH_MODPACK** server type.

### Installation Methods in Minepanel

When creating/editing a server with type **MODRINTH_MODPACK**, there is one method which can be used in several ways.

| Method                | Auto-updates? | Use case                                  |
| --------------------- | ------------- | ----------------------------------------- |
| **Slug**              | ✅ Yes         | Always gets the latest compatible version |
| **URL**               | ✅ Yes         | Always gets the latest compatible version |
| **URL with verison**  | ✅ No          | Locks to the specified version            |
| **Uploaded .mrpack**  | ❌ No          | Install a modpack that is not published   |

**Slug**

1. Enter the modpack project slug (e.g., `surface-living`) into the Modrinth Modpack field
3. On each server start, it downloads the **latest compatible version**

**Url**

1. Enter the modpack project URL (e.g., `https://modrinth.com/modpack/surface-living`)
2. On each server start, it downloads the **latest compatible version**

**Url (version locked)**

1. Enter the modpack project URL for a specific version (e.g., `https://modrinth.com/modpack/surface-living/version/1.2.1`)
2. On each server start, it will **ignore any updated version** of the modpack

**Uploaded `.mrpack`**

1. Click **Upload modpack** and pick the `.mrpack` file
2. Select it in the list; the field is filled with its path (e.g., `/modpacks/my-pack.mrpack`)

This is the way to run a pack that is not published on Modrinth. It also covers instances exported
from **Prism Launcher**, MultiMC or the Modrinth app: mods that are not on Modrinth are bundled into
the pack's `overrides`, so nothing is lost. Remove client-only mods before exporting, or exclude
them with `MODRINTH_EXCLUDE_FILES` in the **Advanced** tab.

## CurseForge Modpacks {#curseforge-modpacks}

Install complete modpacks from [CurseForge](https://www.curseforge.com) using the **AUTO_CURSEFORGE** server type.

::: warning API Key Required
You need a CurseForge API key. Get one from [CurseForge for Studios](https://console.curseforge.com/).
:::

### Installation Methods in Minepanel

When creating/editing a server with type **AUTO_CURSEFORGE**, you can choose between 3 methods:

| Method   | Auto-updates? | Use case                                     |
| -------- | ------------- | -------------------------------------------- |
| **URL**  | ✅ Yes         | Always get the latest compatible version     |
| **Slug** | ❌ No          | Lock to a specific file version              |
| **File** | ❌ No          | Install an unpublished modpack zip you upload |

### Method: URL (Recommended for auto-updates)

1. Select **URL** as installation method
2. Paste the modpack page URL from CurseForge
3. On each server start, it downloads the **latest compatible version**

**Example URL:**

```
https://www.curseforge.com/minecraft/modpacks/all-the-mods-9
```

::: tip
Use URL method if you want automatic updates when the modpack releases new versions.
:::

### Method: Slug (Lock specific version)

1. Select **Slug** as installation method
2. Enter the modpack slug (e.g., `all-the-mods-9`)
3. Enter the **File ID** for the specific version you want

**How to find the File ID:**

1. Go to the modpack page on CurseForge
2. Click on "Files" tab
3. Click on the version you want
4. The File ID is in the URL: `.../files/5765432` → File ID is `5765432`

::: warning
With Slug method, the version **never updates automatically**. You must manually change the File ID to update.
:::

### Method: File (Local modpack)

For modpacks that are not published on CurseForge: your own pack, one a friend sent you, or a
private pack exported from the CurseForge app.

1. Select **File** as installation method
2. Click **Upload modpack** and pick the `.zip`
3. Select the uploaded file in the list

The file is stored in `servers/<server-id>/modpacks/` and mounted read-only at `/modpacks`, and the
panel sets `CF_MODPACK_ZIP` to it. It must be a **client** modpack zip containing `manifest.json`;
a server-files zip has no manifest and fails. A CurseForge API key is still required, because the
mods listed in the manifest are downloaded from CurseForge.

::: tip Not a CurseForge zip?
Prism Launcher and MultiMC do not export CurseForge packs — they export Modrinth `.mrpack`. Use the
[Modrinth modpack](#modrinth-modpacks) flow for those.
:::

### Use the modpack URL, not the server-file URL

`AUTO_CURSEFORGE` always expects the **modpack (client) page or file** — it reads the manifest
and builds the server side from it. Pointing it at a dedicated "server files" download breaks
with:

```
Invalid parameter provided for "install-curseforge" command:
The modpack's manifest file was not valid - did you make sure to reference a client, not server file?
```

So use the modpack page URL (e.g. `https://www.curseforge.com/minecraft/modpacks/<pack>`) or a
specific modpack file (`.../files/<id>`), never the server-files variant.

If the install then loops or crashes on start because of a client-only mod, exclude it with the
**Exclude mods** field (`CF_EXCLUDE_MODS`), which accepts a comma-separated list of mod slugs or
filenames, e.g. `optifine,client-only-mod`.

### World source conflict with Worlds tab

For `AUTO_CURSEFORGE`, `CF_SET_LEVEL_FROM` and the Java **Worlds** tab are alternative world-source mechanisms.

- If you use the **Worlds** tab (`WORLD`/`LEVEL`), Minepanel clears `CF_SET_LEVEL_FROM`.
- If you need modpack-provided world data (`WORLD_FILE` or `OVERRIDES`), keep using `CF_SET_LEVEL_FROM` and do not select an external world source.

### Automatic version from the modpack

Picking a modpack in the browser also reads the Minecraft version from the selected file
and applies it to the server: it sets the Minecraft version and the matching java tag
(`java8` up to 1.16, `java17` up to 1.20.4, `java21` above). Changing the **Modpack version**
selector does the same, since another modpack file often targets another Minecraft version.

Creating a server from the **Modpack templates** page does the same: the file chosen in the
dialog decides the Minecraft version and the java tag of the new server. Its **Create server**
tab shows exactly what it is about to write — server type, file, Minecraft version and Docker
image — before you press the button.

The dialog's **Modpack details** tab reads the rest of what CurseForge publishes about the
pack: downloads, likes, popularity rank, categories, every Minecraft version it has a build
for, and the newest file with its release channel, size and date.

::: warning Packs that block automatic downloads
Some authors opt their pack out of the CurseForge API. The dialog says so, because
`AUTO_CURSEFORGE` cannot download those: the install fails partway through provisioning.
Download the `.zip` yourself and upload it from the server's **Mods** tab instead.
:::

The modpack itself is always pinned to the file that was picked: a pack that updates on its
own can break an existing world, so moving to a newer release is a manual step. When a newer
file exists, an **Update available** badge appears next to the version selector and re-pins
the modpack when clicked, the same way the mod list flags outdated pins. The **Docker Image** field in
the **Server type** tab is a selector with the known tags plus an **Other tag (manual)**
option for tags released after this version of the panel.

### Browse Modpacks

Minepanel includes a **Browse** button to search CurseForge modpacks directly from the UI.
The browser uses the same layout as the mod search: a card grid, debounced search, a sort
selector (Relevance / Downloads / Recently updated) and infinite scroll over the results.

## GTNH {#gtnh}

Minepanel also supports **GT New Horizons** through the dedicated **GTNH** server type.

Use it when you want the container to handle GTNH-specific install and update behavior without manually entering env vars.

Available GTNH fields in Minepanel:

- `GTNH_PACK_VERSION`
- `GTNH_DELETE_BACKUPS`
- `SKIP_GTNH_UPDATE_CHECK`

Recommended workflow:

1. Keep a fixed pack version such as `2.8.1`
2. Leave update check enabled for the first install
3. Only enable `SKIP_GTNH_UPDATE_CHECK` after the server has been installed once

## Feed The Beast (FTBA) {#ftba}

Minepanel supports [Feed The Beast](https://www.feed-the-beast.com/) modpacks through the dedicated **FTBA** server type. No CurseForge API key is needed — FTB serves the packs directly. The pack pins its own Minecraft and loader version, so you don't set a Minecraft version by hand.

Available FTBA fields in Minepanel:

- `FTB_MODPACK_ID` — the numeric modpack ID from the pack's page on feed-the-beast.com (required)
- `FTB_MODPACK_VERSION_ID` — a specific version ID; leave it empty to always install the latest

How to set it up:

1. Create/edit a server and pick **Feed The Beast** as the server type (under **Others**)
2. Open the **Mods** tab and enter the **FTB Modpack ID**
3. Optionally set a **FTB Version ID** to lock the pack to a specific version

## CurseForge Files (Individual Mods) {#curseforge-files}

Download specific mods/plugins from [CurseForge](https://www.curseforge.com) to add to any modded server.

::: warning API Key Required
Same API key as modpacks. Get one from [CurseForge for Studios](https://console.curseforge.com/).
:::

### How to Add Mods from Minepanel

1. Go to **Create Server** or **Edit Server** (Forge, Fabric, or AUTO_CURSEFORGE)
2. Open the **Mods** tab
3. Find the **CurseForge Files** field (green border)
4. Enter mod slugs separated by commas or new lines
5. Save the server

**Example input:**

```
jei
geckolib
aquaculture
```

### Reference Formats

| Format         | Example                          | Description               |
| -------------- | -------------------------------- | ------------------------- |
| Slug           | `jei`                            | Latest compatible version |
| Slug + File ID | `jei:4593548`                    | Specific version          |
| Slug + version | `jei@10.2.1.1005`                | By partial filename       |
| Project ID     | `238222`                         | Using CurseForge ID       |
| URL            | `https://curseforge.com/.../jei` | From page URL             |

::: tip Auto-Selection
Without a File ID, the newest compatible file for your Minecraft version is selected automatically.
:::

### Docker Compose Reference

<details>
<summary>Docker-compose examples</summary>

**Basic mod list:**

```yaml
environment:
  CF_API_KEY: $2a$10$Iao...
  CURSEFORGE_FILES: |
    jei
    geckolib
    aquaculture
```

**Specific versions:**

```yaml
environment:
  CURSEFORGE_FILES: |
    jei:4593548
    geckolib@4.2.1
```

**Using listing file:**

```yaml
volumes:
  - ./cf-list:/extras:ro
environment:
  CURSEFORGE_FILES: '@/extras/cf-mods.txt'
```

</details>

## Combining Modrinth and CurseForge

You can use both Modrinth and CurseForge Files together:

```yaml
environment:
  TYPE: FABRIC
  VERSION: 1.21.4

  # Modrinth mods (preferred for performance)
  MODRINTH_PROJECTS: |
    fabric-api
    sodium
    lithium
  MODRINTH_DOWNLOAD_DEPENDENCIES: required
  # CurseForge exclusive mods
  CF_API_KEY: your_key
  CURSEFORGE_FILES: |
    some-cf-exclusive-mod
    another-cf-mod
```

::: warning Version Compatibility
Always ensure mods from both sources are compatible with your Minecraft version and loader type.
:::

## Plugin Management (Spigot/Paper/etc)

For plugin-based servers (Spigot, Paper, Bukkit, etc.), you can use Spiget:

```yaml
environment:
  TYPE: PAPER
  VERSION: 1.21.4
  SPIGET_RESOURCES: |
    9089
    28140
    34315
```

Where the numbers are Spigot resource IDs from [SpigotMC](https://www.spigotmc.org/resources/).

## Bedrock Addons

Bedrock Edition uses **behavior packs** and **resource packs** instead of traditional mods.

Minepanel now includes an **Addons** tab for Bedrock servers with two sources:

- **Manual upload** of `.mcaddon`, `.mcpack`, or `.zip`
- **CurseForge import** using your configured API key

Downloaded addon files are stored under `servers/<server-id>/addons/` and Minepanel syncs enabled packs into `mc-data/behavior_packs/` and `mc-data/resource_packs/`.

When you enable an addon, Minepanel also updates:

- `worlds/<level-name>/world_behavior_packs.json`
- `worlds/<level-name>/world_resource_packs.json`

### Understanding Bedrock Addons

| Type          | Extension  | Purpose                 | Client Download |
| ------------- | ---------- | ----------------------- | --------------- |
| Behavior Pack | `.mcaddon` | Changes game mechanics  | No              |
| Resource Pack | `.mcpack`  | Changes textures/sounds | Yes (prompted)  |

Both `.mcaddon` and `.mcpack` files are actually **renamed ZIP files**.

::: info Resource Pack vs Behavior Pack
Many Bedrock projects publish the **resource pack (RP)** and **behavior pack (BP)** as separate downloads.

- If you import only the **RP**, Minepanel can activate it, but gameplay logic will not exist.
- If the addon changes mechanics, entities, scripts, UI interactions, or world logic, you usually also need the **BP** companion.
- The Addons tab shows which packs were detected for each import (`RP`, `BP`, or both).
:::

### Installation Steps

#### 1. Open the Addons Tab

Go to your Bedrock server and open **Addons**.

#### 2. Choose a Source

You can:

- Upload a local `.mcaddon`, `.mcpack`, or `.zip` file
- Search CurseForge and import directly from the UI

If you use CurseForge, configure your API key first in **Settings**.

#### 3. Enable the Addon

Imported addons are stored first, then you can enable or disable each one from the list.

When enabled, Minepanel:

- Extracts and registers pack metadata from each `manifest.json`
- Copies behavior packs into `mc-data/behavior_packs/<uuid>/`
- Copies resource packs into `mc-data/resource_packs/<uuid>/`
- Rebuilds the world pack JSON files for the active Bedrock world

#### 4. Restart the Server

Restart the server to apply the enabled addons.

If you want clients to be forced to download enabled **resource packs**, also enable `TEXTUREPACK_REQUIRED` or set it from the **Bedrock** settings tab.

#### 5. Force Resource Packs (Optional)

To require clients to download resource packs:

```yaml
environment:
  TEXTUREPACK_REQUIRED: 'true'
```

Or set it in Minepanel's **Bedrock** settings tab.

Players will be prompted to download resource packs when connecting.

### Addon Priority

When two addons modify the same content, their order decides which one wins. The **Addons** tab lets you reorder installed addons just like the pack screen in vanilla Minecraft:

- **Drag** an addon by its handle, or use the **up/down arrows**.
- The addon at the **top of the list has the highest priority** and overrides the packs below it.
- Each card shows its current priority (`#1`, `#2`, ...).

When you change the order, Minepanel rewrites the world pack files for the active world:

- `worlds/<level-name>/world_behavior_packs.json`
- `worlds/<level-name>/world_resource_packs.json`

Managed addon packs are written first, in priority order. Packs you installed manually (outside the Addons tab) are preserved after them, with lower priority.

::: tip
Restart the server after reordering so the new priority takes effect in-game. Priority applies to the active world only.
:::

### Example: Installing One Player Sleep

1. Open the server's **Addons** tab
2. Upload `ops.mcaddon` or import it from a supported source
3. Wait for Minepanel to detect the contained behavior/resource packs
4. Click **Enable** on the addon
5. Restart the server

### Troubleshooting Bedrock Addons

| Issue                         | Solution |
| ----------------------------- | -------- |
| `Pack Stack - None` in Bedrock logs | Check `world_behavior_packs.json` / `world_resource_packs.json` in the active world and restart after enabling addons |
| Addon appears enabled but has no gameplay effect | Verify you imported the **BP** companion and not only the RP |
| Version error                 | Verify the addon contains a valid `manifest.json` |
| Resource pack not downloading | Set `TEXTUREPACK_REQUIRED: "true"` |
| Pack conflicts                | Check for duplicate UUIDs |
| Server data was cleared       | Minepanel keeps downloaded addon files, but applied runtime packs are reset. Re-enable the addons you want to use again |

### Notes About Server Data Reset

If you use **Clear server data** in Minepanel:

- `mc-data/` is recreated from scratch
- downloaded addon archives remain in `servers/<server-id>/addons/`
- previously applied Bedrock addons are marked as inactive to avoid a broken "enabled but not applied" state

After a reset, go back to **Addons** and enable the packs you want to apply again.

---

## Best Practices (Java Edition)

1. **Use Modrinth when possible** - Generally faster and more reliable
2. **Specify versions** for production servers to avoid unexpected updates
3. **Test in development** before applying to production
4. **Keep API keys secure** - Use environment variables, never commit them
5. **Use listing files** for easier management of large mod lists
6. **Document your mods** - Add comments in listing files to explain what each mod does

## Troubleshooting

### Mods not downloading

- Check API key is correct
- Verify project slugs/IDs are correct
- Check server logs for specific errors
- Ensure network connectivity

### Version conflicts

- Make sure all mods are compatible with your Minecraft version
- Check mod loader compatibility (Fabric vs Forge)
- Review dependency requirements

### Missing dependencies

- For Modrinth: Set `MODRINTH_DOWNLOAD_DEPENDENCIES: required`
- For CurseForge: Manually add dependencies to your list

## Next Steps

- Learn about [Server Types](/server-types)
- See all [Configuration Options](/configuration)
