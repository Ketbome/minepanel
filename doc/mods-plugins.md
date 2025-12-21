# Mods & Plugins Management

Automatically download and manage mods and plugins for your Minecraft servers.

![Mods Tab](/public/img/mods-tab.png)

## Modrinth

Automatically download and manage mods, plugins, and datapacks from [Modrinth](https://modrinth.com).

### Supported Server Types

- ✅ Fabric
- ✅ Forge
- ✅ CurseForge (AUTO_CURSEFORGE)

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

Modrinth also hosts datapacks. To install them, use the `datapack:` prefix:

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
  MODRINTH_PROJECTS: "@/extras/mods.txt"
```

</details>

## CurseForge Modpacks {#curseforge-modpacks}

Install complete modpacks from [CurseForge](https://www.curseforge.com) using the **AUTO_CURSEFORGE** server type.

::: warning API Key Required
You need a CurseForge API key. Get one from [CurseForge for Studios](https://console.curseforge.com/).
:::

### Installation Methods in Minepanel

When creating/editing a server with type **AUTO_CURSEFORGE**, you can choose between 3 methods:

| Method   | Auto-updates? | Use case                                 |
| -------- | ------------- | ---------------------------------------- |
| **URL**  | ✅ Yes        | Always get the latest compatible version |
| **Slug** | ❌ No         | Lock to a specific file version          |
| **File** | ❌ No         | Use a local modpack zip file             |

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

1. Select **File** as installation method
2. Upload/mount your modpack zip to the server
3. Enter the file pattern (e.g., `*.zip`)

Useful for modpacks downloaded manually or custom modpacks.

### Browse Modpacks

Minepanel includes a **Browse** button to search CurseForge modpacks directly from the UI. Click it to find and select modpacks without leaving the panel.

---

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
  CURSEFORGE_FILES: "@/extras/cf-mods.txt"
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

## Best Practices

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
