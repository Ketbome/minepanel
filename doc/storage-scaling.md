---
title: Storage & Scaling - Minepanel | Architecture Decision Record
description: How Minepanel stores Minecraft server data today, why bind mounts are preferred over named volumes, and the strategy for scaling across multiple machines with Docker Swarm and a shared filesystem.
head:
  - - meta
    - name: keywords
      content: minepanel storage, docker bind mounts vs named volumes, docker swarm minecraft, nfs shared filesystem, multi-node minecraft panel, minecraft server scaling, velocity proxy fleet
---

# Storage & Scaling (ADR)

> Status: **Accepted** — strategy/decision record. No code changes are described here; the
> implementation phases are tracked separately.

This document explains how Minepanel stores server data today, why we keep **bind mounts**
instead of moving to named Docker volumes, and the direction for running servers across
**multiple machines** without breaking existing single-host installs.

## Context & problem

Today every server's data lives as **bind mounts** under `${BASE_DIR}/servers/<id>/...` on the
host, and Docker is controlled through the **local socket** (`/var/run/docker.sock`).

Two path concepts drive the whole model (`backend/src/config.ts`):

- `serversDir` (`/app/servers`) — container-side path the backend reads/writes.
- `baseDir` (`BASE_DIR`) — host-side path written into the generated compose mounts.

When a server is generated, `./` volume entries are expanded to absolute host paths under
`${BASE_DIR}/servers/<id>/...` (`backend/src/docker-compose/docker-compose.service.ts`,
`parseVolumes`). A typical generated mount:

```yaml
volumes:
  - /home/user/minepanel/servers/survival/mc-data:/data
  - /home/user/minepanel/servers/survival/worlds:/data/.world-library/local:ro
  - /home/user/minepanel/servers/.world/worlds:/data/.world-library/global:ro
```

**Goal:** be able to spread servers across several machines (Docker Swarm) while every existing
single-host installation keeps working unchanged.

## The two real coupling points

The thing that blocks multi-machine is **not** the volume type. It is two assumptions baked into
the code:

1. **The backend shares a filesystem with the server data.** The file manager
   (`backend/src/files/files.service.ts`) does direct `fs` reads/writes on
   `/app/servers/<id>/mc-data`. World discovery, the `mc-data` migration, and the Bedrock
   permission fix all assume the backend process can "see" those files on disk.
2. **Docker is always local.** `backend/src/server-management/server-management.service.ts` runs
   `docker compose ...` via `execAsync` with `cwd` set to the server directory. There is no
   `DOCKER_HOST`, no remote context, and no notion of a node.

Swarm across machines breaks **both**: the container runs on node B, but the backend — with its
socket and its file manager — runs on node A.

## Why not named volumes

A common instinct is to "move to named Docker volumes." For Minepanel this is a step backwards:

- A named volume stores data under `/var/lib/docker/volumes/<name>/_data` (root-owned, fragile),
  so the **file manager stops working** — there is no clean host path the backend can read with
  `fs`.
- Named volumes only help across hosts when paired with a **driver** (NFS / CSI). At that point a
  shared filesystem is doing the real work, and the "named volume" is just a thin wrapper.

The current **bind mount + mirrored path (`BASE_DIR`)** model is actually *friendlier* for a panel
that needs to browse and edit files. Named volumes are therefore **not recommended as the primary
mechanism**.

## Options considered

| Option | What it is | Pros | Cons | Effort |
| --- | --- | --- | --- | --- |
| **A — Shared filesystem** (NFS / GlusterFS / CephFS) | `${BASE_DIR}/servers` is a network FS mounted at the **same path on every node** | Keeps bind mounts and the file manager almost untouched; Swarm can place a container on any node | Backend still needs Docker control on each node; UID/GID and I/O latency over the network FS | Low–Medium |
| **B — Per-node agent** | Each machine runs an agent exposing Docker **and** file operations over HTTP; backend becomes an orchestrator | Solves both coupling points at the root; no shared FS required | Large rewrite of file + lifecycle paths | High |
| **C — Stay single-host** | Keep today's model, document the limit | Zero work | No multi-machine scaling | None |

## Decision

Adopt **Option A — a shared filesystem (NFS / GlusterFS / CephFS) mounted at the same absolute
path on all nodes**, keeping the current bind mount + `BASE_DIR` model.

This preserves the file manager, world discovery, and per-server compose generation with minimal
change. The **Docker control plane** for multi-node (Swarm `stack deploy` or a per-node agent) is
addressed in a later phase and is **out of scope for the data decision** above.

Named volumes remain explicitly rejected as the primary mechanism, for the reasons in
[Why not named volumes](#why-not-named-volumes).

## Migration & compatibility strategy (legacy stays intact)

To evolve without breaking existing installs, the future code change introduces two abstractions
whose **default implementation is exactly today's behavior** (zero change for single-host):

- **`NodeDriver`** — runs Docker. Current impl: local socket. Future: remote / per-node agent.
- **`StorageDriver`** — file operations. Current impl: local `fs` over `/app/servers`. Future:
  shared FS or agent.

Everything points at the local implementation today, so existing deployments behave identically.
New drivers are opt-in. **This is the next code phase, not part of this document.**

## Phased roadmap

- **Phase 0 — Shared-FS deployment (possible today).** Mount NFS/Gluster at `${BASE_DIR}` with the
  same path on every node. No code change required; bind mounts and the file manager keep working.
- **Phase 1 — Driver abstractions.** Introduce `NodeDriver` / `StorageDriver` with the local
  implementation as default. *Legacy criterion: single-host behavior is byte-for-byte unchanged.*
- **Phase 2 — Multi-node Docker control.** Add remote/agent `NodeDriver` and a placement model so
  servers can run on a chosen node. *Legacy criterion: omitting node config falls back to local.*

## Open questions & risks

- **UID/GID over NFS** — the Bedrock permission fix in `server-management.service.ts` chowns the
  host `mc-data` path; network filesystems handle ownership/`root_squash` differently and need
  validation.
- **World I/O latency** — Minecraft world saves are I/O heavy; NFS latency must be measured before
  recommending it for active worlds.
- **Locking / concurrency** — only one node should run a given server at a time; placement must
  guarantee this.
- **Swarm compose mismatch** — `docker stack deploy` does **not** consume the current per-server
  compose files as-is (different volume model, overlay network, placement constraints). The
  control plane phase must account for this.

## Scaling model: fleet vs single world

It is important to separate two things that sound alike:

**A single world does NOT scale horizontally.** Minecraft Java is monolithic — the world tick loop
is essentially single-threaded. You cannot split one world across containers or machines. The only
levers are:

- **Vertical** — more CPU/RAM for the container. Caps quickly because the limit is one core's
  tick rate.
- **Folia** (a Paper fork) — region-threaded ticking that scales **within a single machine** with
  many cores, at the cost of breaking many plugins. No cross-node sharding of one world exists.

**A network of servers DOES scale.** The real "Minecraft at scale" model is **proxy + N
independent servers** (Velocity / BungeeCord): one entry point in front of many small/medium
instances (lobby, survival, minigames, regions). Minepanel already has the seed of this with
mc-router (`backend/src/proxy/proxy.service.ts`).

**Recommended positioning:** Minepanel is a **fleet manager for small/medium servers** spread
across nodes — which is exactly what Swarm + a shared filesystem enables — **not** a system for
making one server bigger. This reinforces Decision A: each instance is small/medium, and the panel
must be able to browse its files over the shared filesystem.

## See also

- [Architecture](/architecture) — overall system design and the `BASE_DIR` path model.
- [Networking](/networking) — proxy / mc-router routing for multi-server setups.
