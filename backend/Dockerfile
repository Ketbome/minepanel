# Build context is the repo root (pnpm workspace): docker build -f backend/Dockerfile .
FROM node:22-alpine AS builder

ENV HUSKY=0 CI=true
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter ./backend

COPY backend/ backend/

RUN pnpm --filter ./backend build

# Self-contained production tree: package.json + dist (see "files") + prod node_modules.
RUN pnpm --filter ./backend --prod --legacy deploy /out

FROM node:22-alpine

RUN apk add --no-cache docker-cli docker-cli-compose

WORKDIR /app

COPY --from=builder /out ./

# Set by CI so the panel can tell which release it is running.
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION

EXPOSE 8091

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8091' + (process.env.BASE_PATH || '') + '/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))" || exit 1

# node directly, not via npm: npm does not forward SIGTERM so `docker stop` would wait for the kill.
CMD ["node", "dist/main"]
