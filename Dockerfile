FROM node:18-alpine AS base

# Install docker CLI (needed for backend to execute docker commands)
RUN apk add --no-cache docker-cli docker-cli-compose

WORKDIR /app

# ================================
# Build Backend
# ================================
FROM base AS backend-builder
WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend/ ./
RUN npm run build

# ================================
# Build Frontend
# ================================
FROM base AS frontend-builder
WORKDIR /app/frontend

# Install dependencies
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build arguments for Next.js environment variables
ARG NEXT_PUBLIC_FILEBROWSER_URL=http://localhost:8080
ARG NEXT_PUBLIC_BACKEND_URL=http://localhost:8091
ARG NEXT_PUBLIC_DEFAULT_LANGUAGE=en

ENV NEXT_PUBLIC_FILEBROWSER_URL=$NEXT_PUBLIC_FILEBROWSER_URL
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_DEFAULT_LANGUAGE=$NEXT_PUBLIC_DEFAULT_LANGUAGE

RUN npm run build

# ================================
# Production Image - Multi-service
# ================================
FROM base AS runner

# Install supervisor to run multiple processes
RUN apk add --no-cache supervisor

WORKDIR /app

# Copy backend build
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder /app/backend/package.json ./backend/

# Copy frontend build
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=frontend-builder /app/frontend/public ./frontend/public
COPY --from=frontend-builder /app/frontend/.next/standalone ./frontend/
COPY --from=frontend-builder /app/frontend/.next/static ./frontend/.next/static

RUN chown -R nextjs:nodejs /app/frontend

# Create supervisor config
RUN mkdir -p /var/log/supervisor
COPY <<EOF /etc/supervisord.conf
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
EOF

# Expose both ports
EXPOSE 8091 3000

# Start supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]

