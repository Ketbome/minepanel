# AGENTS.md — Minepanel

## Project Overview

Minepanel is a web-based panel for managing Minecraft servers using Docker. It allows users to create, configure, start/stop, and monitor multiple Minecraft server instances through a modern UI.

**Core stack:**

- **Backend:** NestJS 11 + TypeScript + TypeORM + SQLite (sql.js)
- **Frontend:** Next.js 15 + React 19 + TailwindCSS 4 + shadcn/ui + Zustand
- **Documentation:** VitePress (in `doc/`)
- **Containerization:** Docker + Docker Compose
- **Auth:** JWT + Passport.js + bcrypt

**Key dependencies:**

- `itzg/docker-minecraft-server` — Minecraft server container image
- `itzg/docker-mc-backup` — Backup container image

**Repository:** https://github.com/Ketbome/minepanel

---

## Directory Structure

```
minepanel/
├── backend/                 # NestJS API
│   ├── src/
│   │   ├── auth/            # JWT auth, guards, strategies
│   │   ├── server-management/  # Core server CRUD and control
│   │   ├── docker-compose/  # Docker compose file generation
│   │   ├── files/           # File browser and editor
│   │   ├── users/           # User entities and settings
│   │   ├── curseforge/      # CurseForge mod integration
│   │   ├── discord/         # Discord webhook notifications
│   │   ├── system-monitoring/  # Host system metrics
│   │   └── database/        # TypeORM + SQLite setup
│   └── test/                # e2e tests
├── frontend/                # Next.js web app
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   ├── components/      # UI components (shadcn/ui based)
│   │   ├── lib/
│   │   │   ├── hooks/       # Custom React hooks
│   │   │   ├── store/       # Zustand stores
│   │   │   ├── translations/ # i18n (en, es, nl)
│   │   │   └── utils/       # Helpers
│   │   └── services/        # API client services
│   └── electron/            # Electron desktop app wrapper
├── doc/                     # VitePress documentation site
├── servers/                 # Runtime: Minecraft server data (gitignored)
├── data/                    # Runtime: SQLite database (gitignored)
└── docker-compose.yml       # Main deployment compose
```

---

## Build & Run Commands

### Backend (NestJS)

```bash
cd backend
npm install
npm run start:dev      # Development (hot reload)
npm run build          # Production build
npm run start:prod     # Run production build
npm run lint           # ESLint
npm run test           # Unit tests
npm run test:e2e       # e2e tests
```

Runs on `http://localhost:8091`

### Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev            # Development (hot reload)
npm run dev:turbopack  # Dev with Turbopack
npm run build          # Production build
npm run start          # Run production build
npm run lint           # ESLint
```

Runs on `http://localhost:3000`

### Documentation (VitePress)

```bash
cd doc
npm install
npm run docs:dev       # Dev server at localhost:5173
npm run docs:build     # Build static site
```

### Docker (Full Stack)

```bash
# Production (single container)
docker compose up -d

# Development (split services)
docker compose -f docker-compose.split.yml up --build

# Build custom image
docker build -t minepanel:custom .

# Multi-arch build
docker buildx build --platform linux/amd64,linux/arm64 -t user/minepanel:latest --push .
```

---

## Code Style Guidelines

### General

- **Language:** TypeScript everywhere (strict mode in frontend, relaxed in backend)
- **Formatting:** Prettier (run via `npm run format` in backend)
- **Linting:** ESLint with NestJS rules (backend), Next.js rules (frontend)

### Naming Conventions

- **Files:** kebab-case (`server-management.service.ts`)
- **Classes:** PascalCase (`ServerManagementService`)
- **Functions/Methods:** camelCase (`getServerStatus`)
- **Variables:** camelCase, short and descriptive (`user`, `serverId`, `ctx`)
- **Constants:** UPPER_SNAKE_CASE for command objects, camelCase otherwise

### Backend (NestJS)

- Use standard NestJS module/controller/service pattern
- Prefer `@Injectable()` services over utility functions
- Use `Logger` from `@nestjs/common` for logging
- DTOs in `dto/` subdirectories, entities in `entities/`
- Use TypeORM decorators for database entities
- Error handling: let NestJS exception filters handle errors, throw standard HTTP exceptions

### Frontend (Next.js/React)

- Use App Router (`src/app/`)
- Components in `src/components/` — follow atomic design loosely (ui/, molecules/, organisms/)
- shadcn/ui components in `components/ui/` — don't modify directly, extend with wrapper components
- State management: Zustand stores in `lib/store/`
- API calls: services in `services/` directory
- Hooks in `lib/hooks/`
- Use `"use client"` directive only where needed
- Prefer server components when possible

### Comments

- Only comment complex logic, hacks, or non-obvious decisions
- No boilerplate comments like `// Function to get server status`
- Use JSDoc only for public APIs or complex functions

### Commits

```
type(scope): short description

feat(server): add Purpur server support
fix(ui): correct button alignment on mobile
docs: update installation guide
refactor(auth): simplify JWT validation
chore: update dependencies
```

---

## Testing Instructions

### Backend

```bash
cd backend
npm test              # Unit tests (Jest)
npm run test:watch    # Watch mode
npm run test:cov      # Coverage report
npm run test:e2e      # e2e tests
```

Test files: `*.spec.ts` alongside source files, e2e in `test/`

### Frontend

```bash
cd frontend
npm run lint          # Currently no test suite, lint only
```

### Manual Testing

1. Start backend: `cd backend && npm run start:dev`
2. Start frontend: `cd frontend && npm run dev`
3. Access `http://localhost:3000`, login with `admin/admin`
4. Create a test server, start it, check logs, stop, delete

---

## Environment Variables

Copy `env.example` to `.env` and configure:

```bash
# Required
JWT_SECRET=           # openssl rand -base64 32
CLIENT_USERNAME=admin
CLIENT_PASSWORD=admin

# Directories
BASE_DIR=$PWD         # Host path for Docker socket operations

# URLs (critical for CORS and API calls)
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_BACKEND_URL=http://localhost:8091

# Language
NEXT_PUBLIC_DEFAULT_LANGUAGE=en  # en, es, nl

# Optional
HOST_LAN_IP=          # For LAN play display
```

**Important:** `BASE_DIR` must be the absolute host path when running in Docker, as volume mounts are resolved from the host perspective.

---

## Architecture Notes

### Docker Socket Communication

Minepanel communicates with Docker via `/var/run/docker.sock`. When creating Minecraft server containers, paths are resolved from the **host's perspective**, not the container's. This is why `BASE_DIR` exists — it maps internal container paths to host paths.

### Server Management Flow

1. User creates server via UI → POST to `/servers`
2. Backend generates `docker-compose.yml` in `servers/{serverId}/`
3. Backend executes `docker compose up -d` via shell
4. Container status polled via `docker inspect`
5. Logs fetched via `docker logs`
6. Commands sent via RCON (`rcon-cli` inside container)

### Data Persistence

- **Database:** SQLite stored at `data/minepanel.db`
- **Server files:** `servers/{serverId}/mc-data/` (world, plugins, mods, configs)
- **Backups:** `servers/{serverId}/backups/`

### Authentication

- Login returns JWT token stored in httpOnly cookie
- All API routes except `/auth/login` require valid JWT
- Passwords hashed with bcrypt (12 rounds)

---

## Security Considerations

- **Docker socket access = root access.** Only trusted users should access Minepanel.
- Input validation on server IDs: `/^[a-zA-Z0-9_-]+$/`
- File operations scoped to `servers/` directory
- CORS configured via `FRONTEND_URL` env var
- Consider using Docker Socket Proxy for additional isolation

---

## Translations (i18n)

Supported languages: English (`en`), Spanish (`es`), Dutch (`nl`)

Files: `frontend/src/lib/translations/{lang}.ts`

To add a new language:

1. Copy `en.ts` to `{lang}.ts`
2. Translate all strings
3. Register in `translations/index.ts`
4. Add to `NEXT_PUBLIC_DEFAULT_LANGUAGE` options in env

---

## Common Tasks

### Add a new API endpoint

1. Create DTO in `backend/src/{module}/dto/`
2. Add method to service (`{module}.service.ts`)
3. Add route to controller (`{module}.controller.ts`)
4. If new module needed, generate with `nest g module {name}`

### Add a new UI page

1. Create route in `frontend/src/app/{route}/page.tsx`
2. Create components in `frontend/src/components/`
3. Add API service in `frontend/src/services/`
4. Add translations keys to all language files

### Add a new server type

Server types are handled by `itzg/docker-minecraft-server`. Check their docs for supported `TYPE` values. The frontend dropdown is in the server creation form.

---

## Gotchas

- **Windows paths:** WSL2 required. Native Windows paths break Docker volume mounts.
- **Port conflicts:** Default ports 3000, 8091, 25565. Check for conflicts.
- **CORS errors:** Usually means `FRONTEND_URL` doesn't match browser URL exactly (include protocol).
- **"Container not found":** Server ID must match container name exactly. Check for naming mismatches.
- **Empty mc-data:** First server start generates new world. Upload existing data before first start if migrating.

---

## Links

- **Docs:** https://minepanel.ketbome.lat
- **Docker Hub:** https://hub.docker.com/r/ketbom/minepanel
- **Issues:** https://github.com/Ketbome/minepanel/issues
- **itzg/docker-minecraft-server:** https://github.com/itzg/docker-minecraft-server
