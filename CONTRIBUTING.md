# Contributing to Minepanel

First off, thank you for considering contributing to Minepanel! 🎉

It's people like you that make Minepanel such a great tool for managing Minecraft servers.

**📖 Before contributing, please check out our [complete documentation](https://minepanel.ketbome.lat) to understand the project better.**

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Guidelines](#coding-guidelines)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Enhancements](#suggesting-enhancements)

## Code of Conduct

This project and everyone participating in it is governed by our commitment to providing a welcoming and inspiring community for all. Please be respectful and constructive in all interactions.

### Our Standards

- **Be respectful** of differing viewpoints and experiences
- **Be constructive** when giving or receiving feedback
- **Focus on what is best** for the community
- **Show empathy** towards other community members

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **Docker** and **Docker Compose** (v2.0+)
- **Git**
- A code editor (we recommend [VS Code](https://code.visualstudio.com/))

### First Time Setup

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:

   ```bash
   git clone https://github.com/YOUR_USERNAME/minepanel.git
   cd minepanel
   ```

3. **Add the upstream remote**:

   ```bash
   git remote add upstream https://github.com/Ketbome/minepanel.git
   ```

4. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/my-awesome-feature
   ```

## How Can I Contribute?

### Ways to Contribute

There are many ways to contribute to Minepanel:

- 🐛 **Report bugs** - Help us identify issues
- 💡 **Suggest features** - Share your ideas for improvements
- 📝 **Improve documentation** - Fix typos, clarify instructions, add examples
- 🌍 **Translate** - Help make Minepanel available in more languages
- 💻 **Write code** - Fix bugs, implement features
- 🧪 **Write tests** - Improve test coverage
- 🎨 **Improve UI/UX** - Make the interface more intuitive

## Development Setup

### Backend Setup (NestJS)

```bash
cd backend

# Install dependencies
npm install

# Start development server
npm run start:dev
```

The backend API will be available at `http://localhost:3000`

### Frontend Setup (Next.js)

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:3001`

### Documentation Setup (VitePress)

```bash
cd doc

# Install dependencies
npm install

# Start documentation server
npm run docs:dev
```

The documentation will be available at `http://localhost:5173`

### Docker Development

For testing the full stack with Docker:

```bash
# Build and start all services
docker-compose -f docker-compose.split.yml up --build

# View logs
docker-compose logs -f

# Stop services
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

## Pull Request Process

### Before Submitting

1. **Update from upstream**:

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run tests**:

   ```bash
   # Backend tests
   cd backend && npm test

   # Frontend tests (if available)
   cd frontend && npm test
   ```

3. **Lint your code**:

   ```bash
   # Backend
   cd backend && npm run lint

   # Frontend
   cd frontend && npm run lint
   ```

4. **Test manually** - Ensure your changes work as expected

### Submitting the PR

1. **Push your changes**:

   ```bash
   git push origin feature/my-awesome-feature
   ```

2. **Create a Pull Request** on GitHub

3. **Fill out the PR template** with:

   - Clear description of changes
   - Related issue numbers (if applicable)
   - Screenshots/GIFs for UI changes
   - Testing instructions

4. **Wait for review** - Be patient and responsive to feedback

### PR Title Format

Use the same format as commit messages:

```
feat(server): add support for Purpur server type
```

### Review Process

- At least one maintainer will review your PR
- Address any requested changes
- Once approved, a maintainer will merge your PR

## Reporting Bugs

### Before Submitting a Bug Report

- **Check existing issues** - Your bug may already be reported
- **Try the latest version** - The bug might be fixed
- **Gather information** - Logs, screenshots, steps to reproduce

### How to Submit a Bug Report

Create an issue on GitHub with:

**Title**: Brief, descriptive summary

**Description**:

```markdown
## Description

A clear description of the bug.

## Steps to Reproduce

1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## Expected Behavior

What you expected to happen.

## Actual Behavior

What actually happened.

## Environment

- OS: [e.g. Ubuntu 22.04]
- Docker version: [e.g. 24.0.0]
- Minepanel version: [e.g. 1.0.0]
- Browser: [e.g. Chrome 120]

## Logs
```

[Paste relevant logs here]

```

## Screenshots
[If applicable]
```

## Suggesting Enhancements

### Before Submitting an Enhancement

- **Check the roadmap** - It might be planned
- **Check existing issues** - It might be suggested already
- **Consider if it fits** - Does it align with project goals?

### How to Submit an Enhancement

Create an issue on GitHub with:

```markdown
## Summary

Brief description of the enhancement.

## Motivation

Why should this feature be added? What problem does it solve?

## Detailed Description

Detailed explanation of the feature.

## Possible Implementation

(Optional) How you think it could be implemented.

## Alternatives Considered

(Optional) Other solutions you've considered.

## Additional Context

(Optional) Screenshots, mockups, examples.
```

## Translation Contributions

Help make Minepanel available in more languages!

### Adding a New Language

1. Create a new file in `frontend/src/lib/translations/`:

   ```typescript
   // frontend/src/lib/translations/fr.ts
   export const fr = {
     // Copy from en.ts and translate
   };
   ```

2. Register in `frontend/src/lib/translations/index.ts`:

   ```typescript
   import { fr } from "./fr";

   export const translations = {
     en,
     es,
     fr, // Add new language
   };
   ```

3. Test thoroughly in the UI

## Documentation Contributions

Documentation improvements are always welcome!

**📖 View the live documentation at [https://minepanel.ketbome.lat](https://minepanel.ketbome.lat)**

The documentation is built with VitePress and located in the `doc/` directory. Changes are automatically deployed when merged to main.

### Types of Documentation

- **API documentation** - Endpoint descriptions
- **User guides** - How to use features
- **Developer guides** - How to contribute
- **Examples** - Real-world use cases
- **Troubleshooting** - Common issues and solutions

### Documentation Style

- Use clear, simple language
- Include code examples
- Add screenshots for UI features
- Keep it up-to-date with code changes

## Questions?

Don't hesitate to ask! You can:

- Open a [GitHub Discussion](https://github.com/Ketbome/minepanel/discussions)
- Open an issue with the `question` label
- Check the [FAQ](https://minepanel.ketbome.lat/faq)
- Read the [complete documentation](https://minepanel.ketbome.lat)

---

## Recognition

Contributors will be recognized in:

- GitHub contributors page
- Release notes (for significant contributions)
- Our hearts ❤️

Thank you for contributing to Minepanel! 🎮✨
