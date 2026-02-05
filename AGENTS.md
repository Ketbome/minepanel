# AGENTS.md — Minepanel

## What is this project

Web panel for managing Minecraft servers with Docker. Create, configure, start/stop, and monitor multiple instances from a modern UI.

**Supported Editions:**

- **Java Edition** — Full support with RCON, proxy routing, mods/plugins
- **Bedrock Edition** — Full support with send-command, direct connection (no proxy)

**Stack:**

- **Backend:** NestJS 11 + TypeORM + SQLite (sql.js)
- **Frontend:** Next.js 15 + React 19 + TailwindCSS 4 + shadcn/ui + Zustand
- **Docs:** VitePress (`doc/`)
- **Containers:** Docker + Docker Compose
- **Auth:** JWT + Passport.js + bcrypt

**Key dependencies:**

- `itzg/docker-minecraft-server` — Java Edition server image
- `itzg/minecraft-bedrock-server` — Bedrock Edition server image
- `itzg/docker-mc-backup` — Automatic backups

**Repo:** https://github.com/Ketbome/minepanel

---

## Project Structure

```
minepanel/
├── .github/
│   ├── workflows/           # CI/CD pipelines
│   └── CODEOWNERS           # Auto-assign reviewers
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
docker compose up -d                           # Production
docker compose -f docker-compose.development.yml up --build  # Dev build
docker compose -f docker-compose.test.yml up -d              # Test images
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

## CI/CD

### GitHub Workflows

| Workflow             | Trigger           | Description                                           |
| -------------------- | ----------------- | ----------------------------------------------------- |
| `ci.yml`             | PRs, push to main | Lint, build, test                                     |
| `docker-publish.yml` | Push to any branch| Build Docker images (test on branches, prod on main)  |
| `deploy-docs.yml`    | Changes in `doc/` | Deploy VitePress to GitHub Pages                      |
| `stale.yml`          | Daily             | Closes inactive issues/PRs                            |

### Docker Image Publishing

| Branch     | Images                                              | Tags    |
| ---------- | --------------------------------------------------- | ------- |
| `main`     | `ketbom/minepanel-backend`, `ketbom/minepanel-frontend` | `latest`, `vX.Y.Z` |
| Other      | `ketbom/minepanel-backend-test`, `ketbom/minepanel-frontend-test` | `latest` |

**Test images** are published to separate Docker Hub repositories for pre-release testing.

### Version Bumping

Version is stored in `config.json`. When version changes on main, a new tag and release are created automatically.

### Branch Protection (Recommended)

Configure in **Settings → Branches → Add rule** for `main`:

- ☑️ Require status checks: `ci-status`
- ☑️ Require branches be up to date

### PR Process

1. Create branch: `feat/`, `fix/`, `refactor/`, `docs/`
2. Push and create PR → CI runs automatically
3. Merge when checks pass

---

## Architecture

### Docker Socket Flow

```
UI → POST /servers → Backend generates docker-compose.yml
                   → Backend executes `docker compose up -d`
                   → Status via `docker inspect`
                   → Logs via `docker logs`
                   → Commands via RCON (Java) or send-command (Bedrock)
```

**Important:** Minepanel accesses Docker socket (`/var/run/docker.sock`). Volume paths resolve from the **host**, not the container. That's why `BASE_DIR` exists.

### Server Edition Strategy Pattern

Edition-specific behavior is handled via Strategy Pattern:

```
backend/src/server-management/strategies/
├── server-strategy.interface.ts   # IServerStrategy interface
├── java-server.strategy.ts        # Java Edition implementation
├── bedrock-server.strategy.ts     # Bedrock Edition implementation
├── server-strategy.factory.ts     # Factory for strategy creation
└── index.ts                       # Exports
```

**Key differences by edition:**

| Feature        | Java Edition              | Bedrock Edition                 |
| -------------- | ------------------------- | ------------------------------- |
| Docker Image   | `itzg/minecraft-server`   | `itzg/minecraft-bedrock-server` |
| Default Port   | 25565 (TCP)               | 19132 (UDP)                     |
| Commands       | RCON                      | `docker exec send-command`      |
| Proxy Support  | Yes (mc-router)           | No                              |
| Mods/Plugins   | Forge, Fabric, Paper, etc.| Addons/Behavior Packs           |

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
# Network settings (Public IP, LAN IP, Proxy) configured via web UI
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

- **Docs:** https://minepanel.ketbome.com
- **Docker Hub:** https://hub.docker.com/r/ketbom/minepanel
- **Docker Hub (Test):** https://hub.docker.com/r/ketbom/minepanel-backend-test
- **Issues:** https://github.com/Ketbome/minepanel/issues
- **itzg/docker-minecraft-server:** https://github.com/itzg/docker-minecraft-server
- **itzg/minecraft-bedrock-server:** https://github.com/itzg/minecraft-bedrock-server
