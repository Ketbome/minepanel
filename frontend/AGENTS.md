# AGENTS.md — Frontend (Next.js)

## Overview

Next.js 15 app with App Router, React 19, TailwindCSS 4, shadcn/ui components, and Zustand for state.

**Port:** 3000  
**Also:** Electron wrapper for desktop builds

---

## Directory Structure

```
src/
├── app/                  # App Router pages
│   ├── (auth)/           # Auth routes (login)
│   ├── (dashboard)/      # Protected routes
│   └── layout.tsx        # Root layout
├── components/
│   ├── ui/               # shadcn/ui primitives (don't modify)
│   └── {feature}/        # Feature-specific components
├── lib/
│   ├── hooks/            # Custom React hooks
│   ├── store/            # Zustand stores
│   ├── translations/     # i18n (en, es, nl)
│   └── utils/            # Helpers (cn, etc.)
├── services/             # API client functions
└── types/                # TypeScript interfaces
```

---

## Patterns & Best Practices

### Components

```tsx
// ✅ GOOD - Short, functional, typed
interface ServerCardProps {
  server: Server;
  onStart: () => void;
}

export function ServerCard({ server, onStart }: ServerCardProps) {
  return (
    <Card>
      <CardHeader>{server.name}</CardHeader>
      <Button onClick={onStart}>Start</Button>
    </Card>
  );
}
```

### Server vs Client Components

```tsx
// ✅ Default: Server Component (no directive needed)
export default async function ServersPage() {
  const servers = await getServers(); // Server-side fetch
  return <ServerList servers={servers} />;
}

// ✅ Client Component: Only when needed
'use client';

export function ServerControls() {
  const [status, setStatus] = useState('stopped');
  // Interactive logic here
}
```

Use `"use client"` only for:
- useState, useEffect, useRef
- Event handlers (onClick, onChange)
- Browser APIs (localStorage, window)
- Third-party client libraries

### Zustand Stores

```typescript
// lib/store/server-store.ts
interface ServerStore {
  servers: Server[];
  loading: boolean;
  fetchServers: () => Promise<void>;
}

export const useServerStore = create<ServerStore>((set) => ({
  servers: [],
  loading: false,
  fetchServers: async () => {
    set({ loading: true });
    const servers = await serverService.getAll();
    set({ servers, loading: false });
  },
}));
```

### API Services

```typescript
// services/server.service.ts
const API = process.env.NEXT_PUBLIC_BACKEND_URL;

export const serverService = {
  getAll: () => 
    fetch(`${API}/servers`, { credentials: 'include' }).then(r => r.json()),
  
  start: (id: string) =>
    fetch(`${API}/servers/${id}/start`, { 
      method: 'POST',
      credentials: 'include' 
    }),
};
```

**Always use `credentials: 'include'`** for auth cookies.

### shadcn/ui Components

- Located in `components/ui/`
- **Don't modify directly** — they get overwritten on updates
- Extend via wrapper components:

```tsx
// ✅ GOOD - Wrapper component
export function PrimaryButton({ children, ...props }: ButtonProps) {
  return (
    <Button variant="default" size="lg" {...props}>
      {children}
    </Button>
  );
}

// ❌ BAD - Modifying ui/button.tsx directly
```

### Forms

Use react-hook-form + zod:

```tsx
const schema = z.object({
  name: z.string().min(1).regex(/^[a-zA-Z0-9_-]+$/),
  port: z.number().min(1024).max(65535),
});

export function CreateServerForm() {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });

  return (
    <Form {...form}>
      <FormField name="name" render={({ field }) => (
        <Input {...field} />
      )} />
    </Form>
  );
}
```

---

## i18n (Translations)

Files: `lib/translations/{en,es,nl}.ts`

```typescript
// Usage
import { useTranslation } from '@/lib/hooks/useTranslation';

function Component() {
  const { t } = useTranslation();
  return <p>{t.servers.create}</p>;
}
```

Add new language:
1. Copy `en.ts` to `{lang}.ts`
2. Translate all strings
3. Register in `translations/index.ts`

---

## Anti-patterns to Avoid

```tsx
// ❌ Prop drilling through many levels
<Parent data={data}>
  <Child data={data}>
    <GrandChild data={data} />

// ✅ Use Zustand store instead

// ❌ useEffect for data fetching (prefer server components or SWR)
useEffect(() => {
  fetch('/api/servers').then(...)
}, []);

// ❌ Inline styles
<div style={{ marginTop: 10 }}>

// ✅ Tailwind classes
<div className="mt-2.5">

// ❌ Direct DOM manipulation
document.getElementById('x').innerHTML = '...';

// ❌ Massive components (>200 lines)
// Split into smaller, focused components
```

---

## Common Tasks

### Add new page

1. Create `src/app/{route}/page.tsx`
2. Add components in `src/components/{feature}/`
3. Add API calls to `src/services/`
4. Add translation keys to all language files

### Add new component

```bash
# If shadcn/ui has it:
npx shadcn@latest add {component}

# Otherwise create in components/
```

### Add translation key

1. Add to `lib/translations/en.ts`
2. Add same key to `es.ts` and `nl.ts`
3. Use via `t.section.key`

