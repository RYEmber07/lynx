# Lynx

A production-grade URL shortener built as a learning project covering the full spectrum of backend engineering — auth, caching, queuing, analytics, security, containerisation, and CI/CD.

[![CI Pipeline](https://github.com/RYEmber07/lynx/actions/workflows/ci.yml/badge.svg)](https://github.com/RYEmber07/lynx/actions/workflows/ci.yml)

> **Note:** Backend is hosted on a free-tier server and may take 30–60 seconds to wake up after a period of inactivity. Please be patient on the first load!

---

## Features

- **JWT Auth** with refresh token rotation, concurrent refresh deduplication (mutex pattern), and zombie session cap (5 active sessions per user)
- **Redis cache-aside** on the redirect hot path — DB load reduced to cache misses only
- **Async click analytics** via BullMQ queue (fire-and-forget), keeping redirect latency under 1ms regardless of analytics processing time
- **Sliding window rate limiting** per endpoint with NAT-aware `userId` key strategy on authenticated routes
- **GDPR-compliant SHA256 HMAC fingerprinting** — raw IPs are never persisted
- **SSRF protection** blocking private IP ranges and cloud metadata endpoints
- **Password-protected short links** with brute-force limiting keyed by IP + short code
- **Custom slugs** with namespace collision protection across both `shortCode` and `customSlug` columns
- **Link expiry**, active/inactive toggling, and full CRUD for links
- **Analytics dashboard** — click history, devices, browsers, countries
- **Dockerized full stack** with multi-stage builds, Nginx reverse proxy, gzip compression, and immutable static asset caching
- **CI/CD via GitHub Actions** — TypeScript type check gates Docker build; images pushed to GHCR on merge to `main` with automated GHCR storage cleanup
- **Cursor-based pagination** preventing duplicate rows on concurrent inserts

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 20, Express 5, TypeScript (Hosted on Render) |
| Frontend | Next.js 16 (App Router), Tailwind CSS v4 (Hosted on Vercel) |
| Database | PostgreSQL 16 via Prisma 7 (Hosted on Neon.tech) |
| Cache / Queue | Redis 7, ioredis, BullMQ (Hosted on Upstash) |
| Proxy | Nginx |
| Auth | JWT (access + refresh), bcryptjs |
| Validation | Zod 4 |
| CI/CD | GitHub Actions, GitHub Container Registry (GHCR) |
| Containers | Docker, Docker Compose |

---

## Project Structure

```
lynx/
├── apps/
│   ├── api/          ← Express + Prisma backend  (Node 20, ESM, TypeScript)
│   └── web/          ← Next.js 16 frontend       (App Router, Tailwind v4)
├── nginx/
│   └── nginx.conf    ← Reverse proxy config
├── .github/
│   └── workflows/
│       ├── ci.yml      ← Type check + Docker build on every PR
│       ├── cleanup.yml ← Manual workflow to delete old GHCR package versions
│       └── deploy.yml  ← Build + push to GHCR on merge to main
├── docker-compose.yml        ← Local development
├── docker-compose.prod.yml   ← Production (full stack with Nginx)
├── API.md            ← Full API reference
└── AGENTS.md         ← Architecture rules and conventions
```

---

## Getting Started (Local Development)

### Prerequisites

- Docker Desktop
- Node.js 20+

### 1. Clone and configure environment

```bash
git clone https://github.com/your-username/lynx.git
cd lynx

# Backend
cp apps/api/.env.example apps/api/.env
# Fill in JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, FINGERPRINT_SALT, FRONTEND_URL
```

### 2. Start infrastructure (Postgres + Redis)

```bash
docker compose up -d postgres redis
```

### 3. Run the backend

```bash
cd apps/api
npm install
npx prisma migrate dev
npm run dev
# API running on http://localhost:4000
```

### 4. Run the frontend

```bash
cd apps/web
npm install
# Create apps/web/.env.local with:
# NEXT_PUBLIC_API_URL=http://localhost:4000
npm run dev
# Frontend running on http://localhost:3000
```

---

## Running the Full Stack with Docker

```bash
# Start everything (API + Web + Postgres + Redis + Nginx)
docker compose -f docker-compose.prod.yml up -d

# App available at http://localhost
```

---

## Required Environment Variables

### Backend (`apps/api/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Postgres connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_ACCESS_SECRET` | Min 32 chars |
| `JWT_REFRESH_SECRET` | Min 32 chars |
| `FINGERPRINT_SALT` | Min 16 chars, for SHA256 HMAC IP hashing |
| `FRONTEND_URL` | e.g. `http://localhost:3000` |
| `JWT_ACCESS_EXPIRES_IN` | Default `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Default `7d` |
| `CACHE_TTL_SECONDS` | Default `3600` |

### Frontend (`apps/web/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | e.g. `http://localhost:4000` |

---

## CI/CD

Every push and pull request to `main` triggers the CI pipeline:

1. **Type check** — `npx tsc --noEmit` for both `apps/api` and `apps/web`
2. **Docker build** (no push) — verifies the Dockerfile compiles correctly

Every merge to `main` additionally triggers the deploy pipeline:

1. Builds production Docker images for API and web
2. Pushes to GitHub Container Registry (GHCR) tagged with both `latest` and the git SHA

---

## API Reference

See [API.md](./API.md) for the full endpoint reference including request/response shapes and error formats.
