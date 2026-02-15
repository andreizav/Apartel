# ---------- Stage 1: Build Angular Frontend ----------
FROM node:22-alpine AS frontend-build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY angular.json tsconfig.json tailwind.config.js proxy.conf.json ./
COPY index.html ./
COPY src/ ./src/

RUN npx ng build --configuration production

# ---------- Stage 2: Build NestJS Backend ----------
FROM node:22-alpine AS backend-build
WORKDIR /app/server-nest

# Install native build tools for better-sqlite3
RUN apk add --no-cache python3 make g++

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

COPY server-nest/package.json server-nest/package-lock.json ./
RUN npm ci

COPY server-nest/ ./
RUN npx prisma generate
RUN npm run build

# ---------- Stage 3: Production Runtime ----------
FROM node:22-alpine AS production
WORKDIR /app

# better-sqlite3 and Puppeteer needs these at runtime
RUN apk add --no-cache \
    libstdc++ \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Tell Puppeteer where to find Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Copy Angular build output
COPY --from=frontend-build /app/dist ./dist

# Copy NestJS build output and production dependencies
COPY --from=backend-build /app/server-nest/dist ./server-nest/dist
COPY --from=backend-build /app/server-nest/node_modules ./server-nest/node_modules
COPY --from=backend-build /app/server-nest/package.json ./server-nest/package.json

# Copy Prisma schema + generated client + config
COPY --from=backend-build /app/server-nest/prisma ./server-nest/prisma
COPY --from=backend-build /app/server-nest/prisma.config.ts ./server-nest/prisma.config.ts

WORKDIR /app/server-nest

# Create persistent data directory for SQLite
RUN mkdir -p /data

# Defaults (override via docker run -e or docker-compose)
ENV NODE_ENV=production
ENV PORT=4000
ENV DATABASE_URL="file:/data/prod.db"

EXPOSE 4000

# Apply schema + start server
CMD ["sh", "-c", "\
    echo '=== ApartEl Production Start ===' && \
    echo \"NODE_ENV=$NODE_ENV\" && \
    echo \"PORT=$PORT\" && \
    echo \"DATABASE_URL=$DATABASE_URL\" && \
    echo 'Files in dist/src:' && ls dist/src/main* 2>&1 && \
    echo 'Prisma schema:' && ls prisma/schema.prisma 2>&1 && \
    echo 'Data dir:' && ls -la /data/ 2>&1 && \
    echo '=== Running prisma db push ===' && \
    npx prisma db push --schema=./prisma/schema.prisma --accept-data-loss 2>&1 && \
    echo '=== Starting NestJS ===' && \
    node dist/src/main 2>&1 \
    "]
