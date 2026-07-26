# Flowershop — Medusa v2 Ecommerce Platform

A headless ecommerce platform for a flower shop serving Qatar. Built on Medusa v2, deployed across Railway (backend), Supabase (database), and Cloudflare Workers (storefront), with SkipCash as the payment gateway.

> ## ⛔ Hard constraint: no Medusa Cloud
>
> This project is **fully self-hosted**. Do not use, suggest, install, or configure **Medusa Cloud** in any form — no `cloud.medusajs.com`, no `mcloud-*` tooling, no Cloud-only modules or env vars. The Medusa Cloud agent skills have been deliberately removed from this repo; do not reinstall them.
>
> Everything runs on Railway, Supabase, and Cloudflare. If a Medusa doc page recommends Cloud, use the self-hosted path instead.

> **Branding is not decided yet.** The store name, logo, and visual identity are pending. Do not invent a brand name — use "Flowershop" as a placeholder and keep branding in one place so it is cheap to swap later.

---

## Stack & hosting topology

| Concern | Technology | Hosted on | Why |
|---|---|---|---|
| Commerce engine + Admin | Medusa v2.18 (Node 20+) | Railway | Long-running Node process; Railway handles build, health checks, rollback |
| Database | PostgreSQL | Supabase (`me-central-1`) | Managed Postgres close to Qatar, with a dashboard and backups |
| Cache / events / workflows / locks | Redis | Railway | Private-network Redis beside the backend; no public egress |
| Storefront | Next.js 15 (App Router) | Cloudflare Workers via `@opennextjs/cloudflare` | Edge delivery, cheap, global |
| Payments | SkipCash | — | Qatar Central Bank licensed; required for QAR card payments |

**Request path:** Browser → Cloudflare Worker (storefront) → Railway (Medusa Store API) → Supabase (Postgres) + Railway Redis.

---

## Repo layout

Turborepo monorepo with npm workspaces (`apps/**`).

```
flowershop/
├── apps/
│   ├── backend/          @dtc/backend  — Medusa API + Admin dashboard  → Railway
│   │   ├── src/
│   │   │   ├── api/          File-based HTTP routes (admin/, store/)
│   │   │   ├── modules/      Custom modules (data models + CRUD)
│   │   │   ├── workflows/    Business logic; all mutations go here
│   │   │   ├── links/        Cross-module links
│   │   │   ├── subscribers/  Event handlers
│   │   │   ├── jobs/         Scheduled jobs
│   │   │   └── admin/        Admin dashboard widgets & UI routes
│   │   └── medusa-config.ts
│   └── storefront/       @dtc/storefront — Next.js starter  → Cloudflare
├── .agents/skills/       Medusa official agent skills (Cloud skills removed)
├── .claude/skills/       Symlinks into .agents/skills
├── .github/workflows/    CI + storefront deploy
├── .mcp.json             Medusa docs MCP server
└── turbo.json
```

---

## Commands

Run from the repo root unless noted.

```bash
npm install                     # install all workspaces
npm run dev                     # backend :9000, admin :9000/app, storefront :8000
npm run build                   # build both apps
npm run lint
npm run test

npm run backend:dev             # backend only
npm run storefront:dev          # storefront only
npm run backend:seed            # seed demo data
```

Backend-specific (from `apps/backend/`):

```bash
npx medusa db:migrate                        # run migrations
npx medusa db:generate <ModuleName>          # generate migration after a data-model change
npx medusa user -e <email> -p <password>     # create an admin user
npm run test:unit
npm run test:integration:http
```

**Always run `npm run build` after backend changes** — it is the fastest way to catch type errors and bad workflow composition.

---

## Medusa v2 architecture rules

These are the rules that get violated most often. The full guidance lives in `.agents/skills/building-with-medusa/` — **load that skill before writing any backend code**, and load the matching `reference/*.md` for what you're building.

**Never bypass a layer:**

```
Module (data models + CRUD only)
  ↓
Workflow (business logic, validation, rollback)
  ↓
API Route (HTTP + Zod validation, no logic)
  ↓
Frontend (via Medusa JS SDK only)
```

- **All mutations go through workflows.** Never call a module service directly from an API route.
- **Only GET, POST, DELETE.** Medusa does not use PUT or PATCH.
- **Module names are camelCase.** Dashes cause runtime errors.
- **No foreign keys across modules.** Use module links in `src/links/`, then run `db:migrate`.
- **Prices are stored as-is.** `49.99` is stored as `49.99`, not in cents. Never multiply or divide by 100.
- **Workflow bodies are sync, non-arrow, and branch-free.** No `async`, no `await`, no arrow functions, no conditionals — use `when()` for branching and `transform()` for any data manipulation.
- **Query with `query.graph()`** for cross-module retrieval; use `query.index()` when you need to *filter* by a linked module's fields. Never filter linked data with JavaScript `.filter()`.
- **Frontends must use the Medusa JS SDK,** never bare `fetch()` — the SDK attaches the publishable key and auth headers that the API requires.

---

## Environment & secrets

`.env` files are **never committed**. `.env.template` documents every variable and is committed.

### Backend (`apps/backend/.env` locally · Railway variables in production)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Supabase Postgres — **session pooler**, see gotcha below |
| `REDIS_URL` | Railway Redis private URL; drives cache, events, workflows, locks |
| `JWT_SECRET` / `COOKIE_SECRET` | Generate real secrets. Never ship the starter defaults |
| `STORE_CORS` | Storefront origins allowed to call the Store API |
| `ADMIN_CORS` | Admin dashboard origins |
| `AUTH_CORS` | Origins allowed to hit auth endpoints |
| `MEDUSA_BACKEND_URL` | Public backend URL; used by the admin build |
| `MEDUSA_WORKER_MODE` | `shared` for now; split to `server` + `worker` when traffic warrants |

### Storefront (`apps/storefront/.env.local` · Cloudflare Worker vars in production)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | Railway backend URL |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | From Admin → Settings → API Key Management. **Store API requests fail without it** |
| `NEXT_PUBLIC_BASE_URL` | Storefront's own public URL |

### SkipCash (backend, later phase)

`SKIPCASH_CLIENT_ID`, `SKIPCASH_KEY_ID`, `SKIPCASH_KEY_SECRET`, `SKIPCASH_WEBHOOK_KEY`, `SKIPCASH_BASE_URL`

### GitHub Actions secrets

`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

---

## Store configuration

Seeded and verified against the live Supabase database.

- **Region:** Qatar · country code `qa` · currency **QAR** (store default). The starter's Europe/EUR region has been removed, so `qa` is the only region.
- **Warehouse:** Doha Warehouse · fulfillment set "Qatar delivery" · service zone covering `qa`
- **Shipping:** Standard Delivery (25 QAR), Same-Day Delivery (50 QAR)
- **Tax region:** `qa` at 0% — Qatar has no VAT on most goods, but the region must exist or checkout can't calculate totals
- **Products:** 4 placeholder items from the starter, repriced in QAR. Real flower products land in phase 7.
- **Languages:** English + Arabic, with RTL. Not implemented yet — but pick routing and layout structures that can accommodate a locale segment without a rewrite.
- **Payment:** SkipCash (pending). `pp_system_default` is the manual stand-in until then.

Re-run the Qatar configuration at any time — it is idempotent:

```bash
cd apps/backend && npx medusa exec ./src/scripts/seed-qatar.ts
```

> `npx medusa db:migrate` auto-runs the starter's `initial-data-seed` migration script, which recreates the **Europe/EUR** setup. Against a fresh database, always run `seed-qatar.ts` afterwards.

---

## Git & CI workflow

`main` is protected and always deployable. All work happens on short-lived branches merged through PRs.

```
feat/…    new functionality
fix/…     bug fixes
chore/…   tooling, deps, config
docs/…    documentation
```

**Conventional commits** — `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.

**Commit early and often.** Land a commit before starting any significant phase of work, so there is always a clean point to roll back to. Push to `origin` at those boundaries rather than batching a week of work into one commit.

**CI** (`.github/workflows/ci.yml`) runs on every PR and push to `main`, as three parallel jobs:

| Job | What it does |
|---|---|
| Lint & typecheck | `npm run lint`, then `tsc --noEmit` on both apps |
| Build backend | `medusa build` with placeholder env vars |
| Backend tests | unit + HTTP integration against throwaway Postgres and Redis containers |

CI never touches Supabase.

> **Branch protection is not active.** GitHub gates both branch protection and rulesets behind Pro for private repos, and this repo is private on the Free plan. `main` is therefore only protected by convention — nothing mechanically blocks a direct push or a merge over red CI. To fix: upgrade to GitHub Pro (~$4/mo), or make the repo public.

**Deploys:**
- Backend → Railway's native GitHub integration, watching `apps/backend/**` on `main`. Migrations run as a pre-deploy step, not at boot.
- Storefront → `.github/workflows/deploy-storefront.yml`, watching `apps/storefront/**` on `main`.

---

## Gotchas

**Supabase connection string — this one bites silently.** Supabase offers three connection strings. Use the **session pooler on port 5432**:

- ❌ *Direct* (5432) — IPv6-only, may be unreachable from Railway
- ✅ **Session pooler (5432)** — IPv4, holds a session, prepared statements work
- ❌ *Transaction pooler (6543)* — breaks MikroORM. Prepared statements don't survive connection swaps, and migrations fail

A wrong port does not fail at boot. It surfaces later as intermittent `prepared statement "s1" does not exist` errors under load.

**Redis must be wired into all four modules** — cache, event bus, workflow engine, and locking. Miss one and Medusa silently falls back to in-memory, which breaks scheduled jobs, subscribers, and long-running workflows across restarts.

**The publishable API key is not optional.** Store API requests without `x-publishable-api-key` are rejected. The key must also be linked to a sales channel.

**CORS is three separate variables.** `STORE_CORS`, `ADMIN_CORS`, and `AUTH_CORS` are distinct. Adding a new storefront origin usually means updating `STORE_CORS` *and* `AUTH_CORS`.

**Backend test scripts use POSIX env-prefix syntax** (`TEST_TYPE=… jest`). They work in Git Bash and CI, but not in PowerShell or cmd.

**The storefront cannot build without a running backend.** `next build` statically generates product and collection pages, so it fetches the Store API at build time and dies with `ECONNREFUSED` otherwise. Consequences:

- `npm run build` at the repo root fails unless the backend is up. Use `npm run build --workspace=@dtc/backend` when you only need the backend.
- CI deliberately does **not** build the storefront — it lints and typechecks it instead. The storefront is built in the deploy workflow, where `NEXT_PUBLIC_MEDUSA_BACKEND_URL` points at the live Railway backend.

**`SKIP_ENV_VALIDATION=true` bypasses the storefront's env check.** `next.config.js` demands a publishable key, and it is loaded by `next lint` too — not just `dev`/`build`. Lint sets this flag; nothing else should.

**Turbo runs in strict env mode.** Environment variables are not passed through to tasks unless declared in `turbo.json` (`globalPassThroughEnv`, or a task's `env` array). A var that works in your shell but is empty inside a turbo task is almost always a missing declaration — not a shell problem.

**`medusa build` emits a standalone app into `.medusa/server`** — with its own `package.json`. That directory is what runs in production. Starting from `apps/backend` fails with `Could not find index.html in the admin build directory`. Railway's start command is therefore `cd .medusa/server && npm run start`, and that directory needs its own `npm install --omit=dev` during the build.

**`medusa start` forces `NODE_ENV=production`,** even locally. Since the Redis guard in `medusa-config.ts` throws in production, running a production build on a dev machine needs `ALLOW_INMEMORY_INFRA=true`. Never set that on Railway — it disables the guard that stops a Redis-less deploy.

**Don't put `?sslmode=require` in `DATABASE_URL`.** node-postgres treats it as `verify-full` and rejects Supabase's certificate chain with `SELF_SIGNED_CERT_IN_CHAIN`. TLS is already configured via `databaseDriverOptions` in `medusa-config.ts`.

**`next build` skips type and lint checks** (`ignoreBuildErrors` / `ignoreDuringBuilds` are set in `next.config.js`). A green build proves nothing about types. `npx tsc --noEmit` is what actually gates storefront type safety, and CI runs it separately.

---

## Roadmap

| # | Phase | Status |
|---|---|---|
| 0 | Medusa agent skills + docs MCP | ✅ Done |
| 1 | Monorepo scaffold (backend + storefront) | ✅ Done |
| 2 | CLAUDE.md, CI/CD, repo hygiene | ✅ Done (CI green; branch protection blocked by plan) |
| 3 | Supabase Postgres + migrations + Qatar seed | ✅ Done |
| 4 | Railway deploy (backend + Redis) | ⏳ Needs Railway project |
| 5 | Cloudflare storefront deploy | ⏳ After Railway |
| 6 | Branding — name, logo, palette | 🔒 Pending decision |
| 7 | Storefront design from sample sites | 🔒 Pending samples |
| 8 | SkipCash payment provider | 🔒 Pending merchant account |
| 9 | Arabic / RTL localization | 🔒 Later |
| 10 | Email notifications, file storage (R2), search, analytics | 🔒 Later |

### Phase 8 notes — SkipCash

Custom payment provider at `apps/backend/src/modules/skipcash/`, extending `AbstractPaymentProvider`, registered under the `@medusajs/medusa/payment` module's `providers` array in `medusa-config.ts`.

Methods to implement: `initiatePayment`, `authorizePayment`, `capturePayment`, `refundPayment`, `cancelPayment`, `getPaymentStatus`, `getWebhookActionAndData`.

Known API surface — **verify against the official SkipCash integration manual before writing code**, not against third-party packages:

- Sandbox `https://skipcashtest.azurewebsites.net` · Production `https://api.skipcash.app`
- Redirect flow: create payment → response `resultObj.payUrl` → redirect customer → webhook confirms (`statusId === 2` means paid)
- Requests are HMAC-SHA256 signed over an ordered concatenation of fields. **The exact field order must come from the manual** — getting it wrong yields opaque signature-rejection errors.
