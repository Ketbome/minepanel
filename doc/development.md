# Development

Want to contribute or run locally? Here's how.

## What you need

- Node.js 18+
- Docker & Docker Compose
- Git

## Setup

```bash
git clone https://github.com/Ketbome/minepanel.git
cd minepanel
```

## Project structure

```
minepanel/
├── backend/          # NestJS API
│   ├── src/
│   │   ├── auth/
│   │   ├── server-management/
│   │   ├── discord/
│   │   ├── system-monitoring/
│   │   ├── docker-compose/
│   │   ├── settings/
│   │   └── users/
│   └── test/
├── frontend/         # Next.js UI
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   └── services/
│   └── public/
└── doc/             # VitePress docs
```

## Run locally

### Backend

```bash
cd backend
npm install
npm run start:dev
```

Runs on `http://localhost:8091`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:3000`

### Environment files

**backend/.env:**

```bash
FRONTEND_URL= 'http://localhost:3000' # URL of the frontend application
# Generate a strong random secret: openssl rand -base64 32
JWT_SECRET= # Example: your-super-secret-jwt-key-change-this-in-production
CLIENT_PASSWORD= # Password for client
CLIENT_USERNAME= # Username for the client
DB_PATH=./data/minepanel.db
BASE_DIR=.

```

**frontend/.env:**

```bash
NEXT_PUBLIC_BACKEND_URL='http://localhost:8091' # URL of the backend API, it's important start with http:// or https://
NEXT_PUBLIC_DEFAULT_LANGUAGE=en # es or en
```

## Tech stack

### Backend

- NestJS
- TypeORM + SQLite (sql.js)
- Docker API
- Passport JWT

### Frontend

- Next.js 14 (App Router)
- React
- TailwindCSS
- shadcn/ui

## Build for production

```bash
# Build image
docker build -t minepanel:local .

# Run it
docker compose up -d
```

## Contributing

Check [CONTRIBUTING.md](https://github.com/Ketbome/minepanel/blob/main/CONTRIBUTING.md)

### Quick version

1. Fork the repo
2. Create a branch: `git checkout -b feature/thing`
3. Make changes
4. Test: `npm test`
5. Lint: `npm run lint`
6. Push and open PR

### Commit format

```
feat(server): add Purpur support
fix(ui): button alignment
docs: update install guide
```

## Code style

- Use TypeScript
- Follow ESLint rules
- Write meaningful variable names
- Keep functions small
- Add comments for complex logic

## Testing

```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test
```

## Documentation

Docs are in `doc/` using VitePress.

```bash
cd doc
npm install
npm run docs:dev
```

Runs on `http://localhost:5173`

## Common tasks

### Add a new server type

1. Add to `backend/src/docker-compose/docker-compose.service.ts`
2. Add to frontend dropdown
3. Test it

### Add a translation

1. Create `frontend/src/lib/translations/[lang].ts`
2. Copy from `en.ts` and translate
3. Register in `index.ts`
4. Test it

### Debug

**Backend:**

```bash
npm run start:debug
```

**Frontend:**

```bash
# Check browser console
# Check Network tab
```

**Logs:**

```bash
docker compose logs -f minepanel
```

## Troubleshooting

### Port already in use

Change ports in `.env` or docker-compose

### Docker permission errors

```bash
sudo usermod -aG docker $USER
# Log out and back in
```

### Node modules issues

```bash
rm -rf node_modules package-lock.json
npm install
```

## Release process

1. Update version in `package.json`
2. Update CHANGELOG
3. Create git tag
4. Push to main
5. GitHub Actions builds and pushes to Docker Hub

## Need help?

- [GitHub Discussions](https://github.com/Ketbome/minepanel/discussions)
- [Issues](https://github.com/Ketbome/minepanel/issues)
- [FAQ](/faq)
