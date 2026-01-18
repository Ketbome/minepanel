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
├── .github/
│   ├── workflows/           # CI/CD pipelines
│   ├── dependabot.yml       # Dependency updates
│   ├── CODEOWNERS           # Auto-assign reviewers
│   └── labeler.yml          # PR auto-labeling
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

## CI/CD

### GitHub Workflows

| Workflow | Trigger | Description |
|----------|---------|-------------|
| `ci.yml` | PRs, push to main | Lint, build, test + version check |
| `docker-publish.yml` | Push to main, tags | Build and push Docker images |
| `auto-merge.yml` | Dependabot PRs | Auto-approve minor, auto-merge patches |
| `pr-labeler.yml` | PRs | Auto-labels by files changed + size |
| `stale.yml` | Daily | Closes inactive issues/PRs |
| `deploy-docs.yml` | Changes in `doc/` | Deploy VitePress to GitHub Pages |
| `sonarcloud.yml` | PRs, push to main | Code quality analysis |

### Version Bumping

Version is stored in `config.json`. **PRs must update the version** or CI will fail.

```bash
# Before creating PR, update config.json:
# feat: bump minor (1.7.0 → 1.8.0)
# fix: bump patch (1.7.0 → 1.7.1)
# breaking: bump major (1.7.0 → 2.0.0)
```

### Dependabot

Configured for weekly updates:
- `backend/` — npm packages (grouped: nestjs, typescript, testing)
- `frontend/` — npm packages (grouped: react, nextjs, radix, tailwind)
- `doc/` — npm packages (monthly)
- GitHub Actions — workflow dependencies

### Branch Protection (Recommended)

Configure in **Settings → Branches → Add rule** for `main`:
- ☑️ Require status checks: `ci-status`
- ☑️ Require review from CODEOWNERS
- ☑️ Require branches be up to date

### PR Process

1. Create branch: `feat/`, `fix/`, `refactor/`, `docs/`
2. Push and create PR → CI runs automatically
3. Labels assigned automatically (backend, frontend, size/S, etc.)
4. Coverage report posted as comment
5. Merge when checks pass + approved

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
HOST_PUBLIC_IP=                  # For public IP/domain display (VPS deployments)
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
