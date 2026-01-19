# AGENTS.md — Documentation (VitePress)

## Overview

Public documentation site built with VitePress. Hosted at https://minepanel.ketbome.com

**Port:** 5173 (dev)

---

## File Structure

```
doc/
├── index.md              # Homepage (hero, features)
├── getting-started.md    # Quick start guide
├── installation.md       # Detailed installation
├── configuration.md      # Environment variables
├── server-types.md       # Vanilla, Paper, Forge, etc.
├── features.md           # UI features overview
├── administration.md     # Server management
├── mods-plugins.md       # Mod/plugin installation
├── networking.md         # Ports, reverse proxy
├── architecture.md       # Technical details
├── development.md        # Contributing guide
├── troubleshooting.md    # Common issues
├── faq.md                # Frequently asked
├── roadmap.md            # Planned features
└── public/
    └── img/              # Screenshots and diagrams
```

---

## Writing Style

### Tone

- **Direct and practical** — No fluff, get to the point
- **Second person** — "You can...", "Run this command..."
- **Casual but professional** — Like explaining to a colleague

```markdown
<!-- ✅ GOOD -->

Create a `docker-compose.yml` file and run:

<!-- ❌ BAD -->

In order to proceed with the installation process, you will first need to create a Docker Compose configuration file...
```

### Structure

- Start with **what**, then **how**
- Use code blocks for commands
- Add tips/warnings with VitePress containers:

```markdown
::: tip
Quick helpful hint
:::

::: warning
Something to watch out for
:::

::: danger
This can break things
:::
```

### Code Blocks

Always specify language:

````markdown
```bash
docker compose up -d
```
````

```yaml
version: "3.8"
services:
  minepanel:
    image: ketbom/minepanel
```

````

---

## When to Update Documentation

### ALWAYS update docs when:

| Code Change | Update In |
|-------------|-----------|
| New feature added | `features.md` + relevant page |
| New env variable | `configuration.md` |
| New server type supported | `server-types.md` |
| API endpoint changed | `architecture.md` |
| New UI functionality | Add screenshot to `public/img/` |
| Bug fix for common issue | `troubleshooting.md` |
| Installation steps changed | `installation.md`, `getting-started.md` |

### Screenshots

- Format: PNG
- Location: `public/img/`
- Naming: `{feature}-{description}.png` (e.g., `server-creation.png`)
- Keep file size reasonable (<500KB)

---

## Commands

```bash
cd doc
npm run docs:dev      # Dev server at localhost:5173
npm run docs:build    # Build static site
npm run docs:preview  # Preview build
````

---

## Adding New Page

1. Create `{page-name}.md` in `doc/`
2. Add frontmatter:

```markdown
---
title: Page Title
description: Brief description for SEO
---

# Page Title

Content here...
```

3. Add to sidebar in `.vitepress/config.js` (if exists) or it auto-generates

---

## Sync Checklist

When making significant code changes, check:

- [ ] `getting-started.md` — Still accurate?
- [ ] `configuration.md` — All env vars documented?
- [ ] `features.md` — New features mentioned?
- [ ] `troubleshooting.md` — Known issues updated?
- [ ] `index.md` — "Coming soon" section current?
- [ ] Screenshots — Still match current UI?

---

## Anti-patterns

```markdown
<!-- ❌ Outdated screenshots -->

![Old UI](old-screenshot.png)

<!-- ❌ Vague instructions -->

Configure the settings as needed.

<!-- ❌ Missing code language -->
```

docker compose up

```

<!-- ❌ Wall of text without structure -->
First you need to install Docker and then you can...

<!-- ✅ Use headings, lists, code blocks -->
```
