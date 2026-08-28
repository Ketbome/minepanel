# Fullstack image (backend + frontend under supervisord). Build context is the repo root.
FROM node:22-alpine AS base

ENV HUSKY=0 CI=true NEXT_TELEMETRY_DISABLED=1
RUN corepack enable

WORKDIR /app

FROM base AS builder

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter ./backend --filter ./frontend

COPY backend/ backend/
COPY frontend/ frontend/

RUN pnpm --filter ./backend build && pnpm --filter ./frontend build:turbopack
RUN pnpm --filter ./backend --prod --legacy deploy /out/backend

FROM base AS runner

RUN apk add --no-cache docker-cli docker-cli-compose supervisor

# Set by CI so the panel can tell which release it is running.
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /out/backend ./backend

# The standalone output is traced from the workspace root, so it keeps the frontend/ prefix:
# /app/node_modules + /app/frontend/{server.js,.next}. The backend tree is self-contained.
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/static ./frontend/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/frontend/public ./frontend/public

RUN mkdir -p /var/log/supervisor
COPY <<EOT /etc/supervisord.conf
[supervisord]
nodaemon=true
user=root
logfile=/var/log/supervisor/supervisord.log
pidfile=/var/run/supervisord.pid

[program:backend]
command=node /app/backend/dist/main.js
directory=/app/backend
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
environment=NODE_ENV=production

[program:frontend]
command=node /app/frontend/server.js
directory=/app/frontend
user=nextjs
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
environment=NODE_ENV=production,PORT=3000,HOSTNAME="0.0.0.0"
EOT

EXPOSE 8091 3000

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
