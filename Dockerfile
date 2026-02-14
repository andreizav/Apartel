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

COPY server-nest/package.json server-nest/package-lock.json ./
RUN npm ci

COPY server-nest/ ./
RUN npx prisma generate
RUN npm run build

# ---------- Stage 3: Production Runtime ----------
FROM node:22-alpine AS production
WORKDIR /app

# Copy Angular build output
COPY --from=frontend-build /app/dist ./dist

# Copy NestJS build output and production dependencies
COPY --from=backend-build /app/server-nest/dist ./server-nest/dist
COPY --from=backend-build /app/server-nest/node_modules ./server-nest/node_modules
COPY --from=backend-build /app/server-nest/package.json ./server-nest/package.json

# Copy Prisma schema + generated client
COPY --from=backend-build /app/server-nest/prisma ./server-nest/prisma

WORKDIR /app/server-nest

# Defaults (override via docker run -e or docker-compose)
ENV NODE_ENV=production
ENV PORT=4000
ENV DATABASE_URL="file:./prisma/prod.db"

EXPOSE 4000

# Apply schema + start server
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/main"]
