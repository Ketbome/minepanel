# Minepanel Backend

NestJS API used by Minepanel to manage Minecraft servers through Docker.

## Stack

- NestJS 11
- TypeORM + sql.js (SQLite)
- JWT auth

## Run

```bash
npm install
npm run start:dev
```

API default port: `8091`.

## Useful Commands

```bash
npm run build
npm run lint
npm run test
npm run test:e2e
```

## Base Path

- `BASE_PATH` adds a global API prefix such as `/api`.
- When it is set, the health endpoint becomes `<BASE_PATH>/health`.
- `FRONTEND_URL` and `NEXT_PUBLIC_BACKEND_URL` should match the final browser and API URLs.

## Main Modules

- `src/server-management/` - server lifecycle and runtime actions
- `src/docker-compose/` - compose generation
- `src/files/` - file operations
- `src/auth/` - authentication
- `src/system-monitoring/` - host metrics

## References

- Backend agent rules: `backend/AGENTS.md`
- Root project guide: `Readme.md`
