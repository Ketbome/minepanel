# Contributing

Want to help? Cool! Here's how.

Check the [documentation](https://minepanel.ketbome.com) first if you're new to the project.

## Code of Conduct

Don't be a jerk. That's it.

- Be respectful
- Give constructive feedback
- Help others when you can

## What you need

- Node.js 18+
- Docker & Docker Compose v2.0+
- Git
- Any code editor (VS Code works great)

## Setup

1. Fork the repo
2. Clone it:

   ```bash
   git clone https://github.com/YOUR_USERNAME/minepanel.git
   cd minepanel
   ```

3. Add upstream:

   ```bash
   git remote add upstream https://github.com/Ketbome/minepanel.git
   ```

4. Create a branch:
   ```bash
   git checkout -b feature/my-thing
   ```

## Ways to help

- Fix bugs
- Add features
- Improve docs
- Translate to other languages
- Write tests
- Make the UI better

## Running locally

### Backend

```bash
cd backend
npm install
npm run start:dev
```

Runs on `http://localhost:3000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:3001`

### Documentation

```bash
cd doc
npm install
npm run docs:dev
```

Runs on `http://localhost:5173`

### Docker

```bash
# Full stack
docker-compose -f docker-compose.split.yml up --build

# Logs
docker-compose logs -f

# Stop
docker-compose down
```

## Project Structure

```
minepanel/
├── backend/              # NestJS backend API
│   ├── src/
│   │   ├── auth/        # Authentication module
│   │   ├── server-management/  # Server management logic
│   │   └── docker-compose/     # Docker operations
│   │   └── settings/           # User Settings
│   │   └── users/              # User
│   └── test/
├── frontend/            # Next.js frontend
│   ├── src/
│   │   ├── app/        # App router pages
│   │   ├── components/ # React components
│   │   ├── lib/        # Utilities and hooks
│   │   └── services/   # API services
│   └── public/
├── doc/                # VitePress documentation
│   ├── .vitepress/
│   └── *.md
└── servers/           # Minecraft server data (created at runtime)
```

## Pull Requests

### Before submitting

1. Update from upstream:

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. Run tests:

   ```bash
   cd backend && npm test
   cd frontend && npm test
   ```

3. Lint:

   ```bash
   cd backend && npm run lint
   cd frontend && npm run lint
   ```

4. Test manually

### Submitting

1. Push:

   ```bash
   git push origin feature/my-thing
   ```

2. Open a PR on GitHub

3. Fill out the template:
   - What changed
   - Related issues
   - Screenshots for UI stuff
   - How to test

### Title format

```
feat(server): add Purpur support
fix(ui): correct button alignment
docs: update installation guide
```

### Review

- Someone will review it
- Make requested changes
- It gets merged

## Bug reports

Before opening an issue:

- Check if it's already reported
- Try the latest version
- Get logs and screenshots

### Format

```markdown
## What's wrong

Clear description of the bug

## How to reproduce

1. Do this
2. Do that
3. See error

## Expected vs actual

Expected: X should happen
Actual: Y happened instead

## Environment

- OS: Ubuntu 22.04
- Docker: 24.0.0
- Minepanel: 1.0.0
- Browser: Chrome 120

## Logs

[Paste logs here]

## Screenshots

[If you have any]
```

## Feature requests

Before suggesting:

- Check the roadmap
- Check existing issues
- Make sure it fits the project

### Format

```markdown
## What

Brief description

## Why

What problem does it solve?

## How

Detailed explanation

## Implementation ideas

(Optional) How it could work

## Alternatives

(Optional) Other solutions considered

## Context

(Optional) Screenshots, mockups, examples
```

## Translations

Want to add a new language?

1. Create `frontend/src/lib/translations/fr.ts`:

   ```typescript
   export const fr = {
     // Copy from en.ts and translate
   };
   ```

2. Register it in `frontend/src/lib/translations/index.ts`:

   ```typescript
   import { fr } from "./fr";

   export const translations = {
     en,
     es,
     fr,
   };
   ```

3. Test it

## Documentation

Docs are at [minepanel.ketbome.com](https://minepanel.ketbome.com) and built with VitePress (in `doc/`).

Types of docs needed:

- API endpoints
- User guides
- Examples
- Troubleshooting

Keep it:

- Simple and clear
- With code examples
- Updated with changes
- With screenshots when helpful

## Questions?

- [GitHub Discussions](https://github.com/Ketbome/minepanel/discussions)
- Open an issue
- Check the [FAQ](https://minepanel.ketbome.com/faq)

---

Thanks for helping!
