# Use Node.js 18 with full Debian base (more stable than Alpine for Next.js builds)
FROM node:18-bullseye-slim as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm i

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-bullseye-slim as runner

WORKDIR /app

# Copy built application from builder stage
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Change ownership of the app directory
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 8090

CMD ["npm", "start"]
