# AGENTS.md - Frontend

## Project Purpose

Frontend app for Minepanel built with Next.js.

- Provides dashboard UI to create and manage Minecraft servers.
- Consumes backend API for auth, lifecycle actions, files, settings, and monitoring.
- Handles client UX for Java and Bedrock flows.

## Architecture

```txt
frontend/src/
|- app/                   Next.js App Router pages
|- components/            Feature components
|- components/ui/         Base shadcn/ui primitives
|- lib/hooks/             Reusable hooks
|- lib/store/             Zustand stores
|- lib/translations/      i18n dictionaries
|- services/              API service layer
|- services/axios.service.ts Shared HTTP client
```

## Key Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Code Patterns

- Prefer server components; use client components only when needed.
- Keep components focused and small; split large views by feature.
- Use service layer in `src/services/*` for API calls.
- Always keep auth cookies in requests (`credentials: 'include'` in fetch or axios equivalent).
- Do not edit base components in `src/components/ui/*`; wrap/compose instead.

## Critical Files

- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/services/axios.service.ts`
- `src/lib/store/`
- `src/lib/translations/`
- `src/components/molecules/Tabs/ServerTypeTab.tsx`
- `src/components/molecules/Tabs/BedrockSettingsTab.tsx`
- `package.json`

## Agent-Specific Instructions

- Read root `AGENTS.md` before frontend changes.
- Keep Java/Bedrock UX parity when editing server setup and connection views.
- Preserve existing design system and interaction patterns.
- Do not introduce new state libraries or API clients.
- If API contracts change, coordinate with backend and update docs in `doc/`.

## Required AGENTS.md Content

Any frontend AGENTS update must preserve these sections:

- Project purpose
- Architecture
- Key commands
- Code patterns
- Critical files
- Specific agent instructions
- Context Maintenance Rule

## Writing Tips (Mandatory)

- Be explicit and practical.
- Point to exact files for frequent tasks.
- Keep only high-signal instructions.
- Add rules iteratively based on real mistakes.

## Context Maintenance (Golden Rule)

When frontend workflow, architecture, commands, or conventions change, update both `frontend/AGENTS.md` and `frontend/README.md` in the same task.
