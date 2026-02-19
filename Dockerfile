# Imagen single con backend + frontend
FROM node:20.11-alpine AS base
WORKDIR /app

FROM base AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

FROM base AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ ./
ARG NEXT_PUBLIC_BASE_PATH=""
ENV NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH
RUN npm run build

FROM base AS runner

RUN apk add --no-cache supervisor

WORKDIR /app

# Copiar backend build
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/package*.json ./backend/

WORKDIR /app/backend
RUN npm ci --omit=dev
WORKDIR /app

# Crear usuarios no-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    adduser --system --uid 1002 nestjs -G nodejs

# Copiar frontend build con permisos correctos
COPY --from=frontend-builder --chown=nextjs:nodejs /app/frontend/public ./frontend/public
COPY --from=frontend-builder --chown=nextjs:nodejs /app/frontend/.next/standalone ./frontend/
COPY --from=frontend-builder --chown=nextjs:nodejs /app/frontend/.next/static ./frontend/.next/static

# Dar permisos al backend
RUN chown -R nestjs:nodejs /app/backend

# Crear directorio de logs
RUN mkdir -p /var/log/supervisor && \
    chown -R nodejs:nodejs /var/log/supervisor

# Configuración de supervisor optimizada y segura
COPY <<EOF /etc/supervisord.conf
[supervisord]
nodaemon=true
user=nodejs
logfile=/var/log/supervisor/supervisord.log
pidfile=/var/run/supervisord.pid
loglevel=info

[program:backend]
command=node /app/backend/dist/main.js
directory=/app/backend
user=nestjs
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
environment=NODE_ENV=production
stopwaitsecs=30
stopsignal=TERM

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
stopwaitsecs=30
stopsignal=TERM
EOF

# Cambiar a usuario no-root (supervisord corre como nodejs, no root)
USER nodejs

EXPOSE 8091 3000

# Healthcheck para ambos servicios
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "const h=require('http');Promise.all([new Promise(r=>h.get('http://localhost:8091/health',x=>r(x.statusCode===200))),new Promise(r=>h.get('http://localhost:3000',x=>r(x.statusCode===200)))]).then(([b,f])=>process.exit(b&&f?0:1))" || exit 1

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]

