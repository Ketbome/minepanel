# AGENTS.md — Backend (NestJS)

## Overview

NestJS 11 API handling server management, authentication, file operations, and Docker orchestration.

**Port:** 8091
**Database:** SQLite via sql.js + TypeORM

---

## Module Structure

```
src/
├── auth/                 # JWT auth, guards, strategies
├── server-management/    # Core CRUD, start/stop, logs
├── docker-compose/       # Compose file generation
├── files/                # File browser, editor, upload/download
├── users/                # User entity and settings
├── curseforge/           # CurseForge mod API integration
├── discord/              # Webhook notifications
├── system-monitoring/    # Host metrics (CPU, RAM, disk)
└── database/             # TypeORM + SQLite config
```

---

## Patterns & Best Practices

### Module/Service/Controller

```typescript
// ✅ Standard NestJS pattern
@Controller('servers')
export class ServerController {
  constructor(private readonly serverService: ServerService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.serverService.findOne(id);
  }
}
```

### DTOs

- Always validate input with `class-validator`
- Place in `dto/` subdirectory per module
- Use `@IsString()`, `@IsOptional()`, `@IsInt()`, etc.

```typescript
// ✅ GOOD
export class CreateServerDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+$/)
  name: string;

  @IsOptional()
  @IsInt()
  @Min(1024)
  @Max(65535)
  port?: number;
}
```

### Entities

- Use TypeORM decorators
- Place in `entities/` subdirectory
- Primary key: `@PrimaryGeneratedColumn('uuid')` or auto-increment

```typescript
@Entity()
export class Server {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ default: 25565 })
  port: number;

  @CreateDateColumn()
  createdAt: Date;
}
```

### Error Handling

Let NestJS handle errors. Throw standard HTTP exceptions:

```typescript
// ✅ GOOD
if (!server) {
  throw new NotFoundException(`Server ${id} not found`);
}

// ❌ BAD - Manual try/catch everywhere
try {
  // ...
} catch (e) {
  return { error: e.message };
}
```

### Logging

Use NestJS Logger, not console.log:

```typescript
private readonly logger = new Logger(ServerService.name);

this.logger.log(`Starting server ${id}`);
this.logger.error(`Failed to start: ${err.message}`);
```

---

## Docker Operations

Shell exec is used for Docker Compose operations (dockerode doesn't support compose v2):

```typescript
// Compose up
execSync(`docker compose -f ${composePath} up -d`, { cwd: serverDir });

// Container status
execSync(`docker inspect ${containerId} --format '{{.State.Status}}'`);

// Logs
execSync(`docker logs ${containerId} --tail 100`);
```

**Security:** Always validate `serverId` against `/^[a-zA-Z0-9_-]+$/` before using in shell commands.

---

## Testing

```bash
npm test              # Unit tests
npm run test:watch    # Watch mode
npm run test:cov      # Coverage
npm run test:e2e      # e2e tests
```

- Unit tests: `*.spec.ts` next to source files
- e2e tests: `test/` directory
- Mock external dependencies (Docker, filesystem)

---

## Anti-patterns to Avoid

```typescript
// ❌ Business logic in controllers
@Post()
create(@Body() dto: CreateServerDto) {
  const server = this.repo.create(dto);
  // Don't do validation/logic here
}

// ❌ Raw SQL queries (use TypeORM)
this.dataSource.query('SELECT * FROM servers WHERE id = ?', [id]);

// ❌ Hardcoded values
const port = 25565; // Should be configurable

// ❌ Swallowing errors
try { ... } catch (e) { /* silent */ }

// ❌ console.log instead of Logger
console.log('Server started');
```

---

## Common Tasks

### Add new endpoint

1. Create DTO in `src/{module}/dto/`
2. Add method to `{module}.service.ts`
3. Add route to `{module}.controller.ts`
4. Add unit test in `{module}.service.spec.ts`

### Add new module

```bash
nest g module {name}
nest g service {name}
nest g controller {name}
```

### Add entity field

1. Add property with `@Column()` decorator
2. TypeORM auto-migrates on restart (dev mode)
