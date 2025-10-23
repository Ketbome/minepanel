FROM node:18-alpine

# Install docker CLI (needed to execute docker commands on host)
RUN apk add --no-cache docker-cli docker-cli-compose

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose backend port
EXPOSE 8091

# Start the application
CMD ["npm", "run", "start:prod"]

