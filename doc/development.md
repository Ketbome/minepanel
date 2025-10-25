# Development Guide

Contributing to Minepanel or running it in development mode.

## Getting Started

### Prerequisites

Before you start, make sure you have:

- **Node.js** 18+ and npm
- **Docker** and Docker Compose
- **Git**
- **Code editor** (VS Code recommended)

### Clone the Repository

```bash
git clone https://github.com/Ketbome/minepanel.git
cd minepanel
```

### Project Structure

```
minepanel/
├── backend/                 # NestJS backend
│   ├── src/
│   │   ├── auth/            # Authentication module
│   │   ├── server-management/ # Server management
│   │   ├── docker-compose/  # Docker integration
│   │   ├── app.module.ts    # Root module
│   │   └── main.ts          # Entry point
│   ├── test/                # E2E tests
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                # Next.js frontend
│   ├── src/
│   │   ├── app/             # Next.js 14 App Router
│   │   ├── components/      # React components
│   │   ├── lib/             # Utilities & hooks
│   │   └── services/        # API clients
│   ├── public/              # Static assets
│   ├── package.json
│   └── tsconfig.json
│
├── docker-compose.yml       # Production compose
├── docker-compose.split.yml # Split services
├── Dockerfile               # Multi-stage build
└── README.md
```

---

## Development Setup

### Option 1: Local Development (Recommended)

Run frontend and backend directly on your machine for the best development experience.

#### Step 1: Install Dependencies

**Backend:**

```bash
cd backend
npm install
```

**Frontend:**

```bash
cd frontend
npm install
```

#### Step 2: Configure Environment

**Backend** - Create `backend/.env`:

```bash
# Backend environment
SERVERS_DIR=../servers
FRONTEND_URL=http://localhost:3000
CLIENT_USERNAME=admin
CLIENT_PASSWORD=$2a$12$kvlrbEjbVd6SsbD8JdIB.OOQWXTPL5dFgo5nDeIXgeW.BhIyy8ocu
DEFAULT_LANGUAGE=en
```

**Frontend** - Create `frontend/.env.local`:

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:8091
NEXT_PUBLIC_FILEBROWSER_URL=http://localhost:8080
NEXT_PUBLIC_DEFAULT_LANGUAGE=en
```

#### Step 3: Create Servers Directory

```bash
# From project root
mkdir -p servers
```

#### Step 4: Start Development Servers

**Terminal 1 - Backend:**

```bash
cd backend
npm run start:dev
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

**Terminal 3 - Filebrowser (optional):**

```bash
docker run -d \
  --name filebrowser-dev \
  -p 8080:8080 \
  -v $(pwd)/servers:/data \
  -v ./filebrowser-data:/config \
  hurlenko/filebrowser
```

#### Step 5: Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8091
- **Filebrowser**: http://localhost:8080

::: tip Hot Reload
Both frontend and backend have hot reload enabled. Changes are reflected immediately!
:::

### Option 2: Docker Development

Use Docker Compose for a production-like environment.

```bash
# Build images
docker compose build

# Start services
docker compose up

# Or in detached mode
docker compose up -d

# View logs
docker compose logs -f
```

---

## Development Workflow

### Making Changes

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**

   - Edit code in `backend/` or `frontend/`
   - Follow the coding standards (below)

3. **Test your changes**

   ```bash
   # Backend tests
   cd backend
   npm run test
   npm run test:e2e

   # Frontend (tests coming soon)
   cd frontend
   npm run build  # Check for build errors
   ```

4. **Commit your changes**

   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   # Then create a Pull Request on GitHub
   ```

---

## Coding Standards

### TypeScript

- **Use TypeScript** for all new code
- **Enable strict mode**
- **Define interfaces** for all data structures
- **Avoid `any`** - use proper types

**Example:**

```typescript
// ❌ Bad
function createServer(config: any) {
  // ...
}

// ✅ Good
interface ServerConfig {
  name: string;
  type: ServerType;
  version: string;
  memory: string;
  port: number;
}

function createServer(config: ServerConfig) {
  // ...
}
```

### React Components

- **Use functional components** with hooks
- **Use TypeScript** for props
- **Extract reusable logic** into custom hooks
- **Keep components small** and focused

**Example:**

```tsx
// ✅ Good component
interface ServerCardProps {
  server: Server;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
}

export function ServerCard({ server, onStart, onStop }: ServerCardProps) {
  return (
    <div className="card">
      <h3>{server.name}</h3>
      <button onClick={() => onStart(server.id)}>Start</button>
      <button onClick={() => onStop(server.id)}>Stop</button>
    </div>
  );
}
```

### File Naming

- **React components**: PascalCase (`ServerCard.tsx`)
- **Hooks**: camelCase with `use` prefix (`useServerStatus.tsx`)
- **Services**: camelCase (`authService.ts`)
- **Utils**: camelCase (`formatBytes.ts`)

### Code Style

We use ESLint and Prettier for code formatting.

```bash
# Backend
cd backend
npm run lint
npm run format

# Frontend
cd frontend
npm run lint
npm run format
```

---

## Backend Development

### NestJS Architecture

Minepanel backend follows NestJS best practices:

```
src/
├── main.ts                      # Bootstrap
├── app.module.ts                # Root module
├── auth/                        # Feature module
│   ├── auth.module.ts           # Module definition
│   ├── auth.controller.ts       # HTTP endpoints
│   ├── auth.service.ts          # Business logic
│   ├── jwt.strategy.ts          # JWT strategy
│   └── local.strategy.ts        # Local strategy
└── server-management/           # Feature module
    ├── server-management.module.ts
    ├── server-management.controller.ts
    ├── server-management.service.ts
    └── dto/
        └── server-config.model.ts
```

### Creating a New Module

```bash
cd backend
nest generate module my-feature
nest generate controller my-feature
nest generate service my-feature
```

### Adding an Endpoint

**Controller:**

```typescript
import { Controller, Get, Post, Body, Param } from "@nestjs/common";

@Controller("api/servers")
export class ServerManagementController {
  constructor(private readonly serverService: ServerManagementService) {}

  @Get()
  async getAllServers() {
    return this.serverService.listServers();
  }

  @Post()
  async createServer(@Body() config: CreateServerDto) {
    return this.serverService.createServer(config);
  }

  @Get(":id")
  async getServer(@Param("id") id: string) {
    return this.serverService.getServer(id);
  }
}
```

**Service:**

```typescript
import { Injectable } from "@nestjs/common";

@Injectable()
export class ServerManagementService {
  async listServers() {
    // Implementation
  }

  async createServer(config: CreateServerDto) {
    // Implementation
  }

  async getServer(id: string) {
    // Implementation
  }
}
```

### Testing Backend

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

---

## Frontend Development

### Next.js 14 App Router

Minepanel uses the new App Router:

```
app/
├── layout.tsx              # Root layout
├── page.tsx                # Home page (/)
└── dashboard/
    ├── layout.tsx          # Dashboard layout
    ├── page.tsx            # Dashboard home (/dashboard)
    └── [server]/
        └── page.tsx        # Server details (/dashboard/:server)
```

### Creating a New Page

```tsx
// app/dashboard/settings/page.tsx
export default function SettingsPage() {
  return (
    <div>
      <h1>Settings</h1>
      {/* Content */}
    </div>
  );
}
```

### Creating a Component

```tsx
// components/molecules/ServerCard.tsx
interface ServerCardProps {
  server: Server;
}

export function ServerCard({ server }: ServerCardProps) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="font-bold">{server.name}</h3>
      <p className="text-sm text-muted-foreground">{server.type}</p>
    </div>
  );
}
```

### Creating a Custom Hook

```tsx
// lib/hooks/useServerStatus.tsx
import { useQuery } from "@tanstack/react-query";

export function useServerStatus(serverId: string) {
  return useQuery({
    queryKey: ["server-status", serverId],
    queryFn: () => fetchServerStatus(serverId),
    refetchInterval: 5000, // Refetch every 5 seconds
  });
}
```

### API Client

```typescript
// services/axios.service.ts
import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
  withCredentials: true,
});

export default api;
```

```typescript
// services/server.service.ts
import api from "./axios.service";

export async function fetchServers() {
  const { data } = await api.get("/api/servers");
  return data;
}

export async function createServer(config: ServerConfig) {
  const { data } = await api.post("/api/servers", config);
  return data;
}
```

---

## Docker Development

### Building Images

**Development Build:**

```bash
docker build -t minepanel:dev .
```

**Multi-architecture Build:**

```bash
# Create builder
docker buildx create --name multiplatform --use --bootstrap

# Build for multiple platforms
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t ketbom/minepanel:latest \
  --push .
```

### Dockerfile Structure

```dockerfile
# Stage 1: Backend build
FROM node:18-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# Stage 2: Frontend build
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 3: Production
FROM node:18-alpine
WORKDIR /app

# Copy built files
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=frontend-builder /app/frontend/.next ./frontend/.next

# Install production dependencies
RUN npm ci --production

EXPOSE 3000 8091
CMD ["npm", "start"]
```

---

## Debugging

### VS Code Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "start:debug"],
      "cwd": "${workspaceFolder}/backend",
      "console": "integratedTerminal"
    },
    {
      "name": "Debug Frontend",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/frontend",
      "console": "integratedTerminal"
    }
  ]
}
```

### Browser DevTools

Use React Developer Tools and Redux DevTools:

```bash
# Chrome extensions
- React Developer Tools
- Redux DevTools (if using Redux)
```

### Docker Logs

```bash
# View logs
docker compose logs -f

# Specific service
docker compose logs -f minepanel

# Last 100 lines
docker compose logs --tail=100 minepanel
```

---

## Testing

### Backend Testing

**Unit Tests:**

```typescript
// server-management.service.spec.ts
describe("ServerManagementService", () => {
  let service: ServerManagementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServerManagementService],
    }).compile();

    service = module.get<ServerManagementService>(ServerManagementService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should list servers", async () => {
    const servers = await service.listServers();
    expect(Array.isArray(servers)).toBe(true);
  });
});
```

**E2E Tests:**

```typescript
// app.e2e-spec.ts
describe("AppController (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it("/api/servers (GET)", () => {
    return request(app.getHttpServer())
      .get("/api/servers")
      .expect(200)
      .expect("Content-Type", /json/);
  });
});
```

### Frontend Testing (Coming Soon)

```typescript
// ServerCard.test.tsx
import { render, screen } from "@testing-library/react";
import { ServerCard } from "./ServerCard";

describe("ServerCard", () => {
  it("renders server name", () => {
    const server = { id: "1", name: "Test Server", type: "PAPER" };
    render(<ServerCard server={server} />);
    expect(screen.getByText("Test Server")).toBeInTheDocument();
  });
});
```

---

## Contributing Guidelines

### Before You Start

1. **Check existing issues** - Maybe someone is already working on it
2. **Create an issue** - Discuss your idea before coding
3. **Follow conventions** - Use our coding standards
4. **Write tests** - Add tests for new features
5. **Update docs** - Document your changes

### Pull Request Process

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Commit with conventional commits**
   ```bash
   git commit -m "feat: add amazing feature"
   ```
5. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```
6. **Create a Pull Request**
7. **Wait for review**

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): subject

body

footer
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance

**Examples:**

```bash
feat(backend): add server backup endpoint
fix(frontend): resolve memory leak in logs component
docs(readme): update installation instructions
refactor(backend): simplify Docker integration
```

### Code Review

All PRs must pass:

- ✅ CI/CD tests
- ✅ Code review by maintainer
- ✅ No merge conflicts
- ✅ Follows coding standards

---

## Common Development Tasks

### Add a New Server Type

1. Update backend type definition
2. Add UI option in frontend
3. Configure Docker Compose template
4. Test server creation
5. Update documentation

### Add a New Language

1. Create translation file: `frontend/src/lib/translations/fr.ts`
2. Add language to index: `frontend/src/lib/translations/index.ts`
3. Update language switcher component
4. Test all translations
5. Update documentation

### Add a New API Endpoint

1. Create/update controller method
2. Implement service logic
3. Add DTOs for validation
4. Write unit tests
5. Update API documentation

### Add a New Feature

1. Create issue on GitHub
2. Discuss approach
3. Implement backend (if needed)
4. Implement frontend (if needed)
5. Add tests
6. Update documentation
7. Create pull request

---

## Troubleshooting Development Issues

### Port Already in Use

```bash
# Find process using port
lsof -i :3000
kill -9 <PID>

# Or use different ports
cd frontend
PORT=3001 npm run dev
```

### Docker Permission Denied

```bash
# Add user to docker group
sudo usermod -aG docker $USER
# Log out and back in
```

### Module Not Found

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Frontend Build Errors

```bash
# Clear Next.js cache
cd frontend
rm -rf .next
npm run build
```

### Backend Won't Start

```bash
# Check environment variables
cd backend
cat .env

# Check if port is available
lsof -i :8091
```

---

## Resources

### Official Documentation

- [NestJS](https://docs.nestjs.com/)
- [Next.js](https://nextjs.org/docs)
- [Docker](https://docs.docker.com/)
- [TypeScript](https://www.typescriptlang.org/docs/)
- [itzg/minecraft-server](https://github.com/itzg/docker-minecraft-server)

### Useful Links

- [GitHub Repository](https://github.com/Ketbome/minepanel)
- [Docker Hub](https://hub.docker.com/r/ketbom/minepanel)
- [Issue Tracker](https://github.com/Ketbome/minepanel/issues)
- [Discussions](https://github.com/Ketbome/minepanel/discussions)

### Community

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and ideas
- **Pull Requests**: Code contributions

---

## Next Steps

- 🏗️ [Understand Architecture](/architecture)
- 📖 [Explore Features](/features)
- ❓ [Read FAQ](/faq)
