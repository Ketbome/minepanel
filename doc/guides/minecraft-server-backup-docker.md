---
title: How to Back Up a Minecraft Server in Docker (mc-backup)
description: Automatic Minecraft server backups with Docker Compose and itzg/mc-backup - scheduled tar backups, retention, on-demand backups, restic to S3, and restoring a world.
head:
  - - meta
    - name: keywords
      content: minecraft server backup docker, mc-backup, itzg mc-backup, minecraft docker backup, minecraft world backup, restic minecraft backup, minecraft backup s3, restore minecraft backup docker
---

# How to Back Up a Minecraft Server in Docker

Copying the world folder while the server is running can save a half-written chunk. The
safe way is to tell the server to flush and pause saving, copy, then resume.
[`itzg/mc-backup`](https://github.com/itzg/docker-mc-backup) does exactly that on a schedule,
talking to the server over RCON, and runs as a sidecar next to
[`itzg/minecraft-server`](/guides/minecraft-server-docker-compose).

::: info Java Edition only
mc-backup coordinates saves over RCON, which Bedrock doesn't have. For a
[Bedrock server](/guides/bedrock-server-docker), stop the container before copying `./data`.
:::

## 1. Add the backup sidecar

```yaml
# compose.yaml
services:
  mc:
    image: itzg/minecraft-server:latest
    container_name: mc
    tty: true
    stdin_open: true
    restart: unless-stopped
    ports:
      - "25565:25565"
    environment:
      EULA: "TRUE"
      TYPE: PAPER
      MEMORY: 4G
      RCON_PASSWORD: ${RCON_PASSWORD}
    volumes:
      - ./data:/data

  backups:
    image: itzg/mc-backup
    restart: unless-stopped
    depends_on:
      mc:
        condition: service_healthy
    environment:
      RCON_HOST: mc
      RCON_PASSWORD: ${RCON_PASSWORD}
      BACKUP_INTERVAL: 6h
      INITIAL_DELAY: 0
      PRUNE_BACKUPS_DAYS: 7
    volumes:
      - ./data:/data:ro
      - ./backups:/backups
```

```bash
# .env
RCON_PASSWORD=change-me-to-something-long
```

Both containers must share the RCON password: the server generates a random one by default,
which the sidecar can't know. Setting it once in `.env` keeps them in sync.

```bash
docker compose up -d
docker compose logs -f backups
```

Every 6 hours a new `world-<date>.tgz` archive appears in `./backups`, and archives older
than 7 days are deleted.

## 2. Tune the schedule

| Variable | Default | Meaning |
| --- | --- | --- |
| `BACKUP_INTERVAL` | `24h` | Time between backups (`30m`, `6h`, `1d`…) |
| `INITIAL_DELAY` | `2m` | Wait before the first backup |
| `PRUNE_BACKUPS_DAYS` | `7` | Delete archives older than this |
| `PAUSE_IF_NO_PLAYERS` | `false` | Skip backups while the server is empty |
| `EXCLUDES` | `*.jar,cache,logs,*.tmp` | Patterns left out of the archive |
| `TAR_COMPRESS_METHOD` | `gzip` | `gzip`, `bzip2`, `zstd`… (`zstd` is much faster) |
| `LINK_LATEST` | `false` | Keep a `latest.tgz` symlink to the newest archive |

`PAUSE_IF_NO_PLAYERS: "true"` is worth turning on for small servers: an empty world doesn't
change, so there's nothing new to back up.

## 3. Back up right now

Before an update or a risky plugin change:

```bash
docker compose exec backups backup now
```

## 4. Off-site backups with restic (S3, B2, MinIO)

A backup on the same disk won't survive that disk dying. With `BACKUP_METHOD: restic`,
mc-backup sends deduplicated, encrypted snapshots to any restic repository, including
S3-compatible storage:

```yaml
  backups:
    image: itzg/mc-backup
    hostname: mc-backups
    environment:
      RCON_HOST: mc
      RCON_PASSWORD: ${RCON_PASSWORD}
      BACKUP_METHOD: restic
      BACKUP_INTERVAL: 6h
      RESTIC_REPOSITORY: s3:https://s3.us-west-002.backblazeb2.com/my-bucket/minecraft
      RESTIC_PASSWORD: ${RESTIC_PASSWORD}
      AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}
      AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}
      PRUNE_RESTIC_RETENTION: --keep-daily 7 --keep-weekly 4
    volumes:
      - ./data:/data:ro
```

::: warning
Set a fixed `hostname` as above. Restic groups snapshots by host, and Compose gives the
container a new random hostname on every recreate, which breaks retention. And store
`RESTIC_PASSWORD` somewhere safe: without it the snapshots can't be decrypted.
:::

## 5. Restore a backup

The image includes `restore-tar-backup`, which extracts the newest archive into an **empty**
data folder:

```bash
docker compose stop mc
mv data data.broken   # keep the old world until you've checked the restore
mkdir data

docker run --rm \
  -v "$PWD/data:/data" \
  -v "$PWD/backups:/backups:ro" \
  --entrypoint restore-tar-backup \
  itzg/mc-backup

docker compose start mc
```

This runs a one-off container with `./data` writable (the sidecar mounts it read-only).

To restore an older archive than the newest, extract it by hand into the empty folder:

```bash
tar -xzf backups/<archive>.tgz -C data
```

For restic, list snapshots and restore one with the restic CLI inside the container:

```bash
docker compose exec backups restic snapshots
docker compose exec backups restic restore latest --target /tmp/restore
```

::: tip Test your restores
A backup you have never restored is a guess. Restore into a scratch folder once, start a
test server on it, and check the world loads.
:::

## Common problems

**`Failed to connect to RCON`.** The passwords don't match, or the server isn't up yet. The
`depends_on: condition: service_healthy` above waits for the server's healthcheck.

**Backups are huge.** Old worlds, dynmap tiles or log folders are being archived. Add them to
`EXCLUDES`, e.g. `*.jar,cache,logs,*.tmp,plugins/dynmap/web/tiles`.

## Backups from a button

[Minepanel](/) is a free, open-source web panel that runs this same sidecar for each server:
schedule, tar or restic to S3, one-click backup and restore, and download archives from the
browser.

→ [Install Minepanel](/installation) · [Backups in Minepanel](/features#backups)

## Related guides

- [Run a Java server with Docker Compose](/guides/minecraft-server-docker-compose)
- [Run a modded server with Docker](/guides/modded-minecraft-server-docker)
