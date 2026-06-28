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

# Copy package files again for the clean production environment
COPY package*.json ./

# Upgrade npm here as well
RUN npm install -g npm@11

# Install ONLY production dependencies
RUN npm ci --omit=dev

# Copy the strictly necessary compiled artifacts from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Prisma migrate deploy needs the schema file — we point to it directly
# via DATABASE_URL env var (injected by Railway at runtime)

# Security: Run the app as a non-root user to prevent container escape exploits
RUN addgroup -S lynx && adduser -S lynx -G lynx
USER lynx

EXPOSE 4000

# Run migrations then start the server.
# --schema flag points directly to the schema file, no prisma.config.ts needed.
CMD ["sh", "-c", "npx prisma migrate deploy --schema=./prisma/schema.prisma && node dist/src/app.js"]


