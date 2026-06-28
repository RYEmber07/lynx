# ---------------------------------------
# Stage 1: Builder
# ---------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files first to leverage Docker layer caching
COPY package*.json ./

# Upgrade npm to match your local Windows version
RUN npm install -g npm@11

# Install ALL dependencies (including dev tools like TypeScript)
RUN npm ci

# Copy Prisma schema FIRST to generate the database client
COPY prisma ./prisma
RUN npx prisma generate

# Now copy all your actual source code
COPY . .

# Compile TypeScript down to raw JavaScript
RUN npm run build

# ---------------------------------------
# Stage 2: Production
# ---------------------------------------
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# Copy package files for a clean production install
COPY package*.json ./

# Upgrade npm to match lockfile
RUN npm install -g npm@11

# Install ONLY production dependencies.
# prisma CLI is in dependencies (not devDependencies) so it is kept here —
# it is required to run `prisma migrate deploy` on startup.
RUN npm ci --omit=dev

# Copy compiled output and the prisma schema (needed for migrations)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Security: Run the app as a non-root user to prevent container escape exploits
RUN addgroup -S lynx && adduser -S lynx -G lynx
USER lynx

EXPOSE 4000

# Run migrations using the local prisma binary, then start the server.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma && node dist/src/app.js"]
