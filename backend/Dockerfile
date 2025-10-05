FROM node:22-alpine

WORKDIR /app

# Install Docker CLI and docker-compose
RUN apk add --no-cache \
    docker-cli \
    docker-cli-compose \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm i

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Create servers directory
RUN mkdir -p /app/servers

EXPOSE 8091

CMD ["node", "dist/main"]
