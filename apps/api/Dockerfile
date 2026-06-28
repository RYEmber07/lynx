# ---- Stage 1: Builder ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install -g npm@11
RUN npm ci

# Generate Prisma client so TypeScript can compile the app.
# The generated types in src/generated/prisma/ are required by tsc.
COPY prisma ./prisma
RUN node_modules/.bin/prisma generate --schema=./prisma/schema.prisma

COPY . .
RUN npm run build

# ---- Stage 2: Production ----
FROM node:20-alpine AS production
WORKDIR /app

COPY package*.json ./
RUN npm install -g npm@11

# Install production deps only (prisma is in dependencies, so it stays).
RUN npm ci --omit=dev

# Copy compiled output, the schema, and the Prisma config.
# Prisma 7 requires prisma.config.ts to be present for migrate deploy —
# it reads datasource.url from there (process.env.DATABASE_URL injected by Railway).
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Regenerate the Prisma client against THIS stage's node_modules.
# prisma generate writes query engine binaries into node_modules —
# without this, the compiled client in dist/ references engine paths
# that don't exist in the production node_modules, causing the
# "Class extends value undefined" crash.
RUN node_modules/.bin/prisma generate --schema=./prisma/schema.prisma

# Security: run as non-root user
RUN addgroup -S lynx && adduser -S lynx -G lynx
USER lynx

EXPOSE 4000

# Migrations belong in Railway's "Deploy Command" setting, not here.
# Putting them in CMD runs them on every container restart (including
# Railway health check restarts), not just actual deployments.
# Set Railway Deploy Command to:
#   node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma
CMD ["node", "dist/src/app.js"]
