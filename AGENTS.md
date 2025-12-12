# AGENTS.md — Minepanel

## What is this project

Web panel for managing Minecraft servers with Docker. Create, configure, start/stop, and monitor multiple instances from a modern UI.

**Stack:**

- **Backend:** NestJS 11 + TypeORM + SQLite (sql.js)
- **Frontend:** Next.js 15 + React 19 + TailwindCSS 4 + shadcn/ui + Zustand
- **Docs:** VitePress (`doc/`)
- **Containers:** Docker + Docker Compose
- **Auth:** JWT + Passport.js + bcrypt

**Key dependencies:**

- `itzg/docker-minecraft-server` — MC server image
- `itzg/docker-mc-backup` — Automatic backups

**Repo:** https://github.com/Ketbome/minepanel

---

## Project Structure

```
minepanel/
├── backend/                 # NestJS API (see backend/AGENTS.md)
├── frontend/                # Next.js App (see frontend/AGENTS.md)
├── doc/                     # VitePress docs (see doc/AGENTS.md)
├── servers/                 # MC server data (gitignored)
├── data/                    # SQLite database (gitignored)
└── docker-compose.yml       # Main deployment
```

**Important:** When adding features or changing behavior, update the corresponding documentation in `doc/`. See `doc/AGENTS.md` for guidelines.

---

## Quick Commands

```bash
# Backend
cd backend && npm run start:dev     # Dev on :8091

# Frontend
cd frontend && npm run dev          # Dev on :3000

# Docker (full stack)
docker compose up -d                # Production
docker compose -f docker-compose.split.yml up --build  # Dev
```

---

## Global Conventions

### Naming

| Type      | Format                   | Example                        |
| --------- | ------------------------ | ------------------------------ |
| Files     | kebab-case               | `server-management.service.ts` |
| Classes   | PascalCase               | `ServerManagementService`      |
| Functions | camelCase                | `getServerStatus`              |
| Variables | camelCase, short         | `user`, `serverId`, `ctx`      |
| Constants | UPPER_SNAKE or camelCase | `MAX_SERVERS`, `defaultPort`   |

### Comments

```typescript
// ❌ BAD - Obvious
// Function to get the server
function getServer() {}

// ✅ GOOD - Explains why
// Using shell exec because dockerode doesn't support compose v2
execSync(`docker compose up -d`);
```

### Commits

```
type(scope): short description

feat(server): add Purpur support
fix(ui): button alignment on mobile
refactor(auth): simplify JWT validation
```

---

## Architecture

### Docker Socket Flow

```
UI → POST /servers → Backend generates docker-compose.yml
                   → Backend executes `docker compose up -d`
                   → Status via `docker inspect`
                   → Logs via `docker logs`
                   → Commands via RCON
```

**Important:** Minepanel accesses Docker socket (`/var/run/docker.sock`). Volume paths resolve from the **host**, not the container. That's why `BASE_DIR` exists.

### Persistence

- **Database:** `data/minepanel.db` (SQLite)
- **Server files:** `servers/{id}/mc-data/`
- **Backups:** `servers/{id}/backups/`

### Auth

- JWT in httpOnly cookie
- All routes require JWT except `/auth/login`
- Passwords hashed with bcrypt (12 rounds)

---

## Environment Variables

```bash
# Required
JWT_SECRET=              # openssl rand -base64 32
CLIENT_USERNAME=admin
CLIENT_PASSWORD=admin
BASE_DIR=$PWD            # Host absolute path

# URLs (CORS depends on this)
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_BACKEND_URL=http://localhost:8091

# Optional
NEXT_PUBLIC_DEFAULT_LANGUAGE=en  # en, es, nl
HOST_LAN_IP=                     # For LAN IP display
```

---

## Security

⚠️ **Docker socket = root access.** Only trusted users should access.

**Implemented validations:**

- Server IDs: `/^[a-zA-Z0-9_-]+$/`
- File ops limited to `servers/`
- CORS configured via `FRONTEND_URL`

**Recommendation:** Use Docker Socket Proxy in production.

---

## Common Issues

| Symptom               | Cause                           | Solution                       |
| --------------------- | ------------------------------- | ------------------------------ |
| CORS errors           | `FRONTEND_URL` mismatch         | Include exact protocol         |
| "Container not found" | Server ID ≠ container name      | Check naming                   |
| Empty mc-data         | First start generates new world | Upload data before first start |
| Windows paths broken  | Docker doesn't understand paths | Use WSL2                       |
| Port in use           | Conflict 3000/8091/25565        | Change ports                   |

---

## Links

- **Docs:** https://minepanel.ketbome.lat
- **Docker Hub:** https://hub.docker.com/r/ketbom/minepanel
- **Issues:** https://github.com/Ketbome/minepanel/issues
- **itzg/docker-minecraft-server:** https://github.com/itzg/docker-minecraft-server
