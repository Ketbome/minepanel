# Mods & Plugins Management

Automatically download and manage mods and plugins for your Minecraft servers.

## Modrinth

Automatically download and manage mods, plugins, and datapacks from [Modrinth](https://modrinth.com).

### Supported Server Types

- ✅ Fabric
- ✅ Forge
- ✅ CurseForge (AUTO_CURSEFORGE)

### Configuration

| Option | Variable | Description | Default |
|--------|----------|-------------|---------|
| Projects | `MODRINTH_PROJECTS` | List of mods/plugins to install | - |
| Dependencies | `MODRINTH_DOWNLOAD_DEPENDENCIES` | Download dependencies: `none`, `required`, `optional` | `none` |
| Version Type | `MODRINTH_PROJECTS_DEFAULT_VERSION_TYPE` | Preferred version: `release`, `beta`, `alpha` | `release` |
| Loader | `MODRINTH_LOADER` | Force specific loader type | Auto-detected |

### Project Reference Formats

The `MODRINTH_PROJECTS` variable accepts multiple formats (comma or newline separated):

**Basic formats:**
1. **Project slug** (simplest): `fabric-api`
2. **With version ID**: `fabric-api:bQZpGIz0`
3. **With version number**: `fabric-api:0.119.2+1.21.4`
4. **With release type**: `fabric-api:beta`
5. **With prefix** (loader override): `fabric:fabric-api`
6. **Datapacks**: `datapack:terralith` or `datapack:terralith:2.5.5`
7. **Using project ID**: `P7dR8mSH`
8. **From file**: `@/path/to/modrinth-mods.txt`

### Examples

**Fabric server with common mods:**

```yaml
environment:
  TYPE: FABRIC
  VERSION: 1.21.4
  MODRINTH_PROJECTS: |
    fabric-api
    cloth-config
    sodium
    lithium
  MODRINTH_DOWNLOAD_DEPENDENCIES: required
```

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

**Mixed mods with datapacks:**

```yaml
environment:
  TYPE: FABRIC
  MODRINTH_PROJECTS: |
    fabric-api
    datapack:terralith:2.5.5
    datapack:incendium
```

**Using a listing file:**

Create `/path/to/mods.txt`:

```
# Performance mods
fabric-api
sodium
lithium

# QoL mods
cloth-config
modmenu
```

Then reference it:

```yaml
volumes:
  - ./mods-list:/extras:ro
environment:
  MODRINTH_PROJECTS: "@/extras/mods.txt"
```

::: tip Auto-Removal
Mods removed from `MODRINTH_PROJECTS` will be automatically deleted from the server. Set to empty string to remove all mods.
:::

## CurseForge Files

Download specific mods/plugins from [CurseForge](https://www.curseforge.com) for any server type that supports mods.

::: warning API Key Required
You need a CurseForge API key to use this feature. Get one from [CurseForge for Studios](https://console.curseforge.com/).
:::

### Configuration

| Option | Variable | Description |
|--------|----------|-------------|
| API Key | `CF_API_KEY` | Your CurseForge API key (required) |
| Files | `CURSEFORGE_FILES` | List of project-file references |

### Project-File Reference Formats

The `CURSEFORGE_FILES` variable accepts these formats (comma or space separated):

1. **Project page URL**: `https://www.curseforge.com/minecraft/mc-mods/jei`
2. **File page URL**: `https://www.curseforge.com/minecraft/mc-mods/jei/files/4593548`
3. **Project slug**: `jei`
4. **Project ID**: `238222`
5. **Slug/ID with file ID**: `jei:4593548` or `238222:4593548`
6. **Slug/ID with partial filename**: `jei@10.2.1.1005`
7. **From listing file**: `@/path/to/cf-mods.txt`

### Examples

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
    238222:4593548
```

**Mixed formats:**

```yaml
environment:
  CURSEFORGE_FILES: |
    https://www.curseforge.com/minecraft/mc-mods/jei
    geckolib:4.2.1
    aquaculture
```

**Using listing file:**

Create `cf-mods.txt`:

```
# Core mods
jei:4593548
geckolib

# Extra mods
aquaculture
naturalist
```

Mount and reference:

```yaml
volumes:
  - ./cf-list:/extras:ro
environment:
  CURSEFORGE_FILES: "@/extras/cf-mods.txt"
```

::: tip Auto-Selection
If you don't specify a file version, the newest compatible file for your Minecraft version and server type will be selected automatically.
:::

::: info Dependencies
CurseForge Files can detect missing dependencies but cannot resolve them automatically. Make sure to include all required dependencies in your list.
:::

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

