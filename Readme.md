# Minepanel

Web panel to create and operate Minecraft servers (Java and Bedrock) with Docker.

## Quick Start

```bash
git clone https://github.com/Ketbome/minepanel.git
cd minepanel
docker compose up -d
```

Open `http://localhost:3000`.

## Local Development

```bash
# backend
npm run start:dev --prefix backend

# frontend
npm run dev --prefix frontend

# quality checks
npm run lint
npm run test
```

## Repo Layout

```txt
minepanel/
|- backend/
|- frontend/
|- doc/
|- docker-compose.yml
|- env.example
```

## Docs and References

- Product docs: https://minepanel.ketbome.com
- Backend guide: `backend/README.md`
- Frontend guide: `frontend/README.md`
- Agent instructions: `AGENTS.md`
