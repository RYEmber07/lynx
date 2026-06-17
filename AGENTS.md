# Lynx — AI Agent Guide

> **Lynx** is a production-grade URL shortener.  
> This file contains the complete orientation and rules for the entire project. Read it completely before touching any code.

## Repo Layout

```
lynx/
├── apps/
│   ├── api/          ← Express + Prisma 7 backend  (Node 20+, ESM)
│   └── web/          ← Next.js 16 frontend  (App Router, Tailwind v4)
├── docker-compose.yml
├── API.md            ← API success/error formats
└── AGENTS.md         ← you are here
```

## Services (docker-compose)

| Service  | Internal port | Mapped host port |
|----------|---------------|-----------------|
| Postgres | 5432          | **5433**        |
| Redis    | 6379          | **6379**        |

Start infra: `docker compose up -d`

## Working in this Repo

- Backend code lives under `apps/api/`. Frontend code lives under `apps/web/`.
- There is currently **no monorepo tooling** (no turborepo, no pnpm workspaces).  
  Run `npm` / `npx` commands from the relevant app directory (`apps/api/` or `apps/web/`).
- Never commit `.env` or `.env.local` — copy `.env.example` and fill in values.
- Always reference [API.md](file:///c:/Users/risha/OneDrive/Documents/Padhai/Development/lynx/API.md) for API success/error formats, endpoints, and status codes. Do not hallucinate API specifications.

---

# API Rules (`apps/api/`)

This section governs **every file written or edited** inside `apps/api/`.

## 1. Project Overview

| Item | Value |
|------|-------|
| Runtime | Node 20 + (ESM) |
| Language | TypeScript 6 |
| Framework | Express 5 |
| ORM | **Prisma 7** (`@prisma/client ^7`, `prisma ^7`) |
| DB adapter | `@prisma/adapter-pg` (Postgres connection pool) |
| Cache | ioredis → Redis 7 |
| Validation | Zod 4 |
| Password hashing | bcryptjs |
| Dev runner | nodemon + tsx |
| Build | `tsc` → `dist/` |

---

## 2. Module System — CRITICAL

```json
// package.json
{ "type": "module" }
```

```jsonc
// tsconfig.json
{ "compilerOptions": { "module": "NodeNext" } }
```

**Rule: every local import MUST use the `.js` extension.**

```ts
// ✅ Correct
import prisma from "../lib/db.js";
import { generateShortCode } from "../utils/shortCode.js";

// ❌ Wrong — will crash at runtime
import prisma from "../lib/db";
import { generateShortCode } from "../utils/shortCode";
```

This applies to **all** `.ts` source files, seed scripts, and any new utility.

---

## 3. TypeScript Configuration

File: [`tsconfig.json`](../tsconfig.json)

Key flags that affect how you write code:

| Flag | Value | Implication |
|------|-------|-------------|
| `module` | `NodeNext` | `.js` extensions required (see §2) |
| `target` | `ESNext` | Use modern JS freely |
| `strict` | `true` | Strict null checks, etc. |
| `exactOptionalPropertyTypes` | `true` | Never pass `field: undefined` to a type that expects `field?: string`. Use spread conditionals instead |
| `noUncheckedIndexedAccess` | `true` | Array/object index access returns `T \| undefined`. Use `!` or guard before use |
| `verbatimModuleSyntax` | `true` | Use `import type` for type-only imports |
| `isolatedModules` | `true` | No `const enum`, no ambient namespaces |
| `skipLibCheck` | `true` | Generated Prisma files are excluded from lib checks |

### exactOptionalPropertyTypes pattern

```ts
// ✅ Spread conditionals — safe with exactOptionalPropertyTypes
await prisma.url.create({
  data: {
    shortCode,
    originalUrl,
    userId,
    ...(customSlug   !== undefined && { customSlug }),
    ...(expiresAt    !== undefined && { expiresAt }),
    ...(passwordHash !== undefined && { passwordHash }),
  },
});

// ❌ Wrong — passes `undefined` for an optional field
await prisma.url.create({
  data: { shortCode, originalUrl, userId, customSlug: input.customSlug },
});
```

### Type-only imports

```ts
// ✅
import type { Request, Response } from "express";
import type { UrlModel } from "../generated/prisma/models/Url.js";

// ❌ (verbatimModuleSyntax will error)
import { Request, Response } from "express";
```

### noUncheckedIndexedAccess pattern

```ts
const items = ["a", "b", "c"];
const first = items[0]!;          // ✅ non-null assertion when you're sure
const safe  = items[0] ?? "default"; // ✅ nullish coalesce
```

---

## 4. Prisma 7 Standards

### 4.1 Client location

The generated client lives at:

```
src/generated/prisma/
  client.ts          ← PrismaClient import
  models/
    Url.ts           ← UrlModel type
    User.ts          ← UserModel type
    Click.ts         ← ClickModel type
    RefreshToken.ts  ← RefreshTokenModel type
  models.ts          ← barrel re-export of all models
  enums.ts
```

**Always import from the generated path, never from `@prisma/client` directly:**

```ts
// ✅
import { PrismaClient } from "../generated/prisma/client.js";
import type { UrlModel } from "../generated/prisma/models/Url.js";

// ❌
import { PrismaClient, Url } from "@prisma/client";
```

### 4.2 Model type names

Prisma 7 generates model types as `<Model>Model`, not `<Model>`:

```ts
// ✅
import type { UrlModel } from "../generated/prisma/models/Url.js";
export type Url = UrlModel;   // re-export with a clean alias if needed

// ❌ — this type does not exist in Prisma 7
import type { Url } from "@prisma/client";
```

### 4.3 Singleton client (db.ts)

```ts
// src/lib/db.ts
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

declare global { var prisma: PrismaClient | undefined; }

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

const prisma = globalThis.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
export default prisma;
```

Always import the singleton — never instantiate `new PrismaClient()` elsewhere.

### 4.4 Schema file

- Location: `prisma/schema.prisma`
- Generator output: `../src/generated/prisma`
- Migrations path: `prisma/migrations`

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}
```

After any schema change run:

```bash
npx prisma migrate dev --name <description>
npx prisma generate
```

### 4.5 prisma.config.ts

```ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"] || "",
  },
});
```

- `process` is a global in Node — **do not** import it.  
- Use `|| ""` fallback on `DATABASE_URL` to satisfy `exactOptionalPropertyTypes`.
- The `prisma.config.ts` must be included in `tsconfig.json`'s `include` array.

### 4.6 Seeding

```bash
npx prisma db seed
```

Seed command is configured in `prisma.config.ts` (`migrations.seed`), **not** in `package.json`'s `"prisma"` key (that was the Prisma 5/6 pattern).

---

## 5. Project Structure

```
apps/api/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts               ← uses .js extensions for local imports
│   └── migrations/
├── prisma.config.ts          ← Prisma 7 config (must be in tsconfig include)
├── src/
│   ├── app.ts                ← Express app bootstrap + server start
│   ├── config/
│   │   └── env.ts            ← Zod-validated env, exits on invalid config
│   ├── generated/
│   │   └── prisma/           ← DO NOT EDIT — Prisma generated output
│   ├── lib/
│   │   ├── db.ts             ← Prisma singleton
│   │   └── redis.ts          ← ioredis singleton
│   ├── routes/
│   │   └── health.ts         ← GET /api/health
│   ├── services/             ← Pure DB/business logic, no HTTP
│   │   └── url.service.ts
│   └── utils/
│       └── shortCode.ts      ← nanoid-based Base62 code generator
├── .env                      ← never committed
├── .env.example
├── nodemon.json
├── package.json
└── tsconfig.json
```

### Layer responsibilities

| Layer | Folder | Rule |
|-------|--------|------|
| Config | `config/` | Zod schema, validated at startup, exported as typed object |
| DB client | `lib/db.ts` | Singleton only |
| Cache client | `lib/redis.ts` | Singleton only |
| Business logic | `services/` | Pure async functions — **no** `req`/`res`, **no** HTTP status codes |
| HTTP layer | `routes/` | Express `Router`, calls services, maps errors to HTTP responses |
| Utilities | `utils/` | Pure functions with zero side-effects |

---

## 6. Environment Variables

Defined in `src/config/env.ts` and validated with Zod at startup.  
**The app exits (`process.exit(1)`) if any required variable is missing or invalid.**

| Variable | Type | Notes |
|----------|------|-------|
| `NODE_ENV` | `development \| production \| test` | defaults to `development` |
| `PORT` | number | defaults to `4000` |
| `DATABASE_URL` | string | Postgres connection string |
| `REDIS_URL` | string | Redis connection string |
| `JWT_SECRET` | string | min 32 chars |
| `JWT_REFRESH_SECRET` | string | min 32 chars |
| `FRONTEND_URL` | string | used in CORS `origin` |

Always access env via the validated `env` import — never use `process.env` directly in application code:

```ts
// ✅
import env from "../config/env.js";
const port = env.PORT;

// ❌
const port = process.env.PORT;
```

---

## 7. Error Handling Conventions

- **Services** throw plain `Error` with descriptive messages:
  ```ts
  throw new Error("URL not found");
  throw new Error("Unauthorized");
  throw new Error("Custom slug already taken");
  ```
- **Routes** catch service errors and map them to HTTP status codes.
- **Global error handler** in `app.ts` catches anything uncaught by routes:
  ```ts
  app.use((err: any, req, res, next) => {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ status: "error", message: err.message });
  });
  ```
- To set a specific HTTP status from a route, attach `err.statusCode` before throwing or use a custom `HttpError` class.

---

## 8. Express 5 Notes

This project uses **Express 5** (`^5.2.1`). Key differences from Express 4:

- `Router` and `app` route handlers can be `async` — uncaught rejections are automatically forwarded to the error handler. **No need for `try/catch` + `next(err)` in every handler.**
- `res.send()` accepts only `string | Buffer | object`. No implicit number-to-string.

---

## 9. Redis Client

- Singleton at `src/lib/redis.ts`, exported as `default redis`.
- `connectRedis()` is awaited in `app.ts` before the server starts listening.
- Use `redis.get / redis.set / redis.del / redis.setex` from ioredis.

---

## 10. Development Workflow

```bash
# Start infra
docker compose up -d                    # from repo root

# Install deps
npm install                             # from apps/api/

# Run dev server (nodemon + tsx, no compile step)
npm run dev

# Type-check only (no emit)
npx tsc --noEmit

# Build production bundle
npm run build                           # tsc → dist/

# Database migrations
npx prisma migrate dev --name <name>   # create + apply migration
npx prisma migrate deploy              # apply in production
npx prisma generate                    # regenerate client after schema change

# Seed database
npx prisma db seed

# Open Prisma Studio
npx prisma studio
```

---

---

# Frontend Rules (`apps/web/`)

This section governs **every file written or edited** inside `apps/web/`.

## F1. Project Overview

| Item | Value |
|------|-------|
| Framework | **Next.js 16.2.6** (App Router) |
| Language | TypeScript (strict, bundler module resolution) |
| Styling | **Tailwind CSS v4** |
| HTTP client | axios (with custom instance at `lib/api.ts`) |
| Env prefix | `NEXT_PUBLIC_` for client-exposed vars |

---

## F2. Next.js 16 — CRITICAL Conventions

### App Router location

The `--no-src-dir` flag was used. The App Router lives at **`apps/web/app/`**, not `apps/web/src/app/`.

```
apps/web/
├── app/              ← App Router root (layouts, pages, loading, error)
├── components/       ← Shared UI components
├── lib/              ← Client-side utilities (api.ts, etc.)
├── public/
├── globals.css       ← Tailwind v4 entry (inside app/ if co-located)
├── next.config.ts
├── tsconfig.json
└── package.json
```

### Async params (Next 15/16 breaking change)

In Next 15+, dynamic route segment `params` and `searchParams` are **Promises** and must be `await`-ed before use.

```tsx
// ✅ Correct — Next 15/16
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <div>{slug}</div>;
}

// ❌ Wrong — Next 13/14 pattern, breaks in Next 15+
export default function Page({ params }: { params: { slug: string } }) {
  return <div>{params.slug}</div>;
}
```

This applies to all dynamic segments: `[id]`, `[code]`, `[...slug]`, etc.

### React 19 Typing Strictness
Next.js 15/16 uses React 19 typings which are stricter:
- **FormEvents**: `React.FormEvent` is deprecated. Use `React.SyntheticEvent<HTMLFormElement>` for form submissions.
- **Catch blocks**: Do not explicitly type catch variables as `any` (e.g., `catch (err: any)`). Let it default to `unknown` and use type guards like `if (isAxiosError(err))` to narrow the type.

### Middleware terminology
In Next.js 16, **middleware** is now called **proxy**. Do not use the term "middleware" for request interception files at the root of `app/`; refer to them as `proxy.ts`.

### Server vs Client Components

- All components are **Server Components by default**.
- Add `"use client"` only when you need browser APIs, event handlers, or React state/effects.
- Never `import` server-only modules (Prisma, Node fs, etc.) inside a `"use client"` component.

---

## F3. Tailwind CSS v4 — CRITICAL

### No config file

**Do NOT create, reference, or generate a `tailwind.config.js` or `tailwind.config.ts` file.**  
Tailwind v4 is configured entirely through CSS.

### Theme customisation — `@theme` in `globals.css`

All custom colors, fonts, spacing tokens, etc. must be declared via the `@theme` directive inside `globals.css`:

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  --color-brand-500: #6366f1;
  --color-brand-600: #4f46e5;
  --font-sans: 'Inter', sans-serif;
}
```

### PostCSS setup

Use `@tailwindcss/postcss` (not the old `tailwindcss` PostCSS plugin):

```js
// postcss.config.mjs
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

### Importing Tailwind

In `globals.css` use `@import "tailwindcss";` (v4 syntax), **not** the v3 `@tailwind base/components/utilities` directives.

---

## F4. axios Instance (`lib/api.ts`)

```ts
import axios from "axios";

const instance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export function setAuthToken(token: string | null): void {
  if (token) {
    instance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete instance.defaults.headers.common["Authorization"];
  }
}

export default instance;
```

- Import this instance (`import api from "@/lib/api"`) everywhere — never create a second axios instance.
- Call `setAuthToken` from the auth context after login/token refresh.

---

## F5. Environment Variables

| Variable | Where used | Notes |
|----------|-----------|-------|
| `NEXT_PUBLIC_API_URL` | `lib/api.ts` baseURL | e.g. `http://localhost:4000` |

Store in `apps/web/.env.local` (never committed).

---

## F6. Frontend Checklist

- [ ] No `tailwind.config.js` / `tailwind.config.ts` created
- [ ] All theming done via `@theme` in `globals.css`
- [ ] PostCSS uses `@tailwindcss/postcss`
- [ ] `globals.css` uses `@import "tailwindcss"` (v4 syntax)
- [ ] Dynamic route `params` typed as `Promise<...>` and `await`-ed
- [ ] `"use client"` added only where strictly necessary
- [ ] All API calls go through `@/lib/api` axios instance
- [ ] No hardcoded URLs — use `NEXT_PUBLIC_API_URL`

---

## 11. Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Files | `kebab-case.ts` | `url.service.ts` |
| Exported functions | `camelCase` | `createUrl`, `getUrlByCode` |
| Exported types/interfaces | `PascalCase` | `CreateUrlInput`, `Url` |
| Route files | `<resource>.ts` | `url.ts`, `auth.ts` |
| Service files | `<resource>.service.ts` | `url.service.ts` |
| Env variables | `SCREAMING_SNAKE_CASE` | `DATABASE_URL` |

---

## 12. Checklist Before Submitting Code

- [ ] All local imports end in `.js`
- [ ] `import type` used for type-only imports
- [ ] No `undefined` passed to optional Prisma fields — use spread conditionals
- [ ] Array index access guarded with `!` or `?? fallback`
- [ ] Env vars accessed through `env` from `config/env.js`, not `process.env`
- [ ] Services have no Express / HTTP references
- [ ] Exported service functions have JSDoc comments (detailing parameters, returns, and behavior)
- [ ] Code actively guards against edge cases (e.g., shared namespace collisions, boundary conditions)
- [ ] `npx tsc --noEmit` passes with zero errors

---

## 13. Edge Cases & Namespace Collisions

When writing business logic, actively guard against **Shared Namespace Collisions**. 

If a single API endpoint parameter (e.g., `/:code`) can query multiple distinct database columns (e.g., checking `shortCode` then falling back to `customSlug`), those columns share a namespace.
- **Rule:** You MUST validate uniqueness across ALL columns in that namespace during creation. A generated `shortCode` cannot match an existing `customSlug`, and a requested `customSlug` cannot match an existing `shortCode`.
- **Optimization:** When querying a shared namespace, use a single `findFirst` with an `OR` clause to search all potential matches in a single query.
