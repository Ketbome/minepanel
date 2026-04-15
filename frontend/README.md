# Minepanel Frontend

Next.js dashboard for Minepanel.

## Stack

- Next.js 15 (App Router)
- React 19
- Tailwind CSS 4
- Zustand

## Run

```bash
npm install
npm run dev
```

App default URL: `http://localhost:3000`.

## Useful Commands

```bash
npm run build
npm run start
npm run lint
```

## Base Path

- `NEXT_PUBLIC_BASE_PATH` mounts the frontend under a subpath such as `/minepanel`.
- It is consumed from `next.config.ts`, so it must be set at build time.
- If you build with a subpath, keep the runtime `NEXT_PUBLIC_BASE_PATH` aligned for healthchecks and diagnostics.

## Structure

- `src/app/` - routes and layouts
- `src/components/` - UI composition
- `src/services/` - API calls
- `src/lib/store/` - global state
- `src/lib/translations/` - i18n

## References

- Frontend agent rules: `frontend/AGENTS.md`
- Root project guide: `Readme.md`
