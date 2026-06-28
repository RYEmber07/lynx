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

# Install production dependencies.
# prisma CLI is in dependencies (not devDependencies) so it stays here.
RUN npm ci --omit=dev

# Copy the prisma schema so we can regenerate the client and run migrations
COPY prisma ./prisma

# Regenerate the Prisma client against the production node_modules.
# The client compiled in the builder stage references the builder's node_modules.
# We must regenerate here so the client links to the production node_modules correctly.
RUN node_modules/.bin/prisma generate --schema=./prisma/schema.prisma

# Copy the compiled TypeScript output
COPY --from=builder /app/dist ./dist

# Security: Run the app as a non-root user to prevent container escape exploits
RUN addgroup -S lynx && adduser -S lynx -G lynx
USER lynx

EXPOSE 4000

# Run migrations using the local prisma binary, then start the server.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma && node dist/src/app.js"]
