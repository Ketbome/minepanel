FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .

RUN npm run build

FROM node:20-alpine

RUN apk add --no-cache docker-cli docker-cli-compose

WORKDIR /app

COPY package*.json ./

RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# Set by CI so the panel can tell which release it is running.
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION

EXPOSE 8091

CMD ["npm", "run", "start:prod"]

