# AGENTS.md - Backend

## Project Purpose

Backend API for Minepanel built with NestJS.

- Manages Minecraft servers lifecycle (create/start/stop/delete).
- Generates and executes Docker Compose runtime config.
- Handles auth, file operations, monitoring, and integrations.

## Architecture

```txt
backend/src/
|- auth/                 JWT auth, guards, strategies
|- server-management/    Core server operations
|- server-management/strategies/ Java/Bedrock strategy pattern
|- docker-compose/       Compose generation
|- files/                File browser and file actions
|- users/                User and settings
|- system-monitoring/    Host metrics
|- proxy/                Proxy/network support
|- database/             TypeORM + sql.js setup
|- config.ts             Runtime config mapping
```

Key pattern: edition-specific behavior is in `server-management/strategies/*`.

## Key Commands

```bash
npm run start:dev
npm run build
npm run lint
npm run test
npm run test:e2e
```

## Code Patterns

- Keep controllers thin; business logic in services.
- Validate all DTO input with `class-validator`.
- Use Nest exceptions (`NotFoundException`, `BadRequestException`, etc).
- Use `Logger` instead of `console.log`.
- Keep naming consistent: `kebab-case` files, `PascalCase` classes, `camelCase` methods.

## Critical Files

- `src/config.ts`
- `src/main.ts`
- `src/app.module.ts`
- `src/server-management/server-management.service.ts`
- `src/server-management/server-management.controller.ts`
- `src/server-management/strategies/server-strategy.factory.ts`
- `src/docker-compose/docker-compose.service.ts`
- `src/files/files.service.ts`
- `package.json`

## Agent-Specific Instructions

- Read root `AGENTS.md` before backend changes.
- Keep Java and Bedrock behavior parity when changing server lifecycle logic.
- Do not hardcode ports, paths, or image names already driven by config/DTO.
- Validate values used in shell execution paths/commands.
- Do not add dependencies or scripts unless explicitly required by the task.
- If backend contract changes, update frontend usage and docs in `doc/`.

## Required AGENTS.md Content

Any backend AGENTS update must preserve these sections:

- Project purpose
- Architecture
- Key commands
- Code patterns
- Critical files
- Specific agent instructions
- Context Maintenance Rule

## Writing Tips (Mandatory)

- Be specific and operational.
- Reference concrete files used often.
- Keep instructions short and relevant.
- Add new rules only when recurring errors justify them.

## Context Maintenance (Golden Rule)

When backend workflow, architecture, commands, or conventions change, update both `backend/AGENTS.md` and `backend/README.md` in the same task.
