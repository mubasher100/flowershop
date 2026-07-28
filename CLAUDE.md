# Flowershop — Medusa v2 Ecommerce Platform

A headless ecommerce platform for a flower shop serving Qatar. Built on Medusa v2, deployed across Railway (backend), Supabase (database), and Cloudflare Workers (storefront), with SkipCash as the payment gateway.

> ## ⛔ Hard constraint: no Medusa Cloud
>
> This project is **fully self-hosted**. Do not use, suggest, install, or configure **Medusa Cloud** in any form — no `cloud.medusajs.com`, no `mcloud-*` tooling, no Cloud-only modules or env vars. The Medusa Cloud agent skills have been deliberately removed from this repo; do not reinstall them.
>
> Everything runs on Railway, Supabase, and Cloudflare. If a Medusa doc page recommends Cloud, use the self-hosted path instead.

> ## 📱 Hard constraint: mobile-first
>
> **Every page must be mobile friendly.** Qatar's flower-gifting traffic is overwhelmingly phone-based, and the reference sites are all built mobile-first. Design and build at the small breakpoint first, then scale up — never desktop-down.
>
> Non-negotiables: no horizontal body scroll at any width, touch targets ≥44px, thumb-reachable primary actions, images sized for mobile bandwidth, and sticky add-to-cart on product pages. Check every change at 375px before calling it done.

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

## Design

**Palette** — extended from the two supplied colours (`#fbd7e2`, `#fff7f9`), both on a rose hue ~342–346°. Four families: **blush** (brand), **sage** (floristry-natural secondary), **champagne** (premium accent), **ink** (warm neutrals with a rose bias — pure grey next to blush reads as dirty). All tokens live in [`apps/storefront/src/styles/brand.css`](apps/storefront/src/styles/brand.css); Tailwind references them through CSS variables so a rebrand touches one file.

Use `blush-600` or `blush-700` for anything carrying text — 5.05:1 and 7.03:1 on white. The mid-tones that look best fail AA.

**Typeface** — Google Sans, self-hosted via `next/font/local` from `src/fonts/`. Google released it under the SIL OFL in 2025. Do **not** switch to `next/font/google`: Next 15's manifest predates the release and rejects it with "Unknown font".

**References** — homepage follows [floward.com/en-qa](https://floward.com/en-qa); product page blends [calyaqa.com](https://calyaqa.com) (gallery, size ladder, accordions) with [mayfairqatar.com](https://mayfairqatar.com) (gift message, delivery date + time slots). Floward serves 403 to WebFetch — pull it with `curl` and a browser User-Agent.

The defining homepage rhythm is **promotional banners alternating with product rails**. Stacking rails back to back reads as one undifferentiated scroll.

**Product imagery** is on-brand placeholder SVG in `apps/storefront/public/placeholders/`. Real photography replaces it; the layouts already reserve the space.

---

## Localization (English + Arabic)

**Locale lives in the URL,** as the first path segment carrying language *and* country: `/en-qa/...`, `/ar-qa/...`. It cannot be a cookie — catalogue pages are statically prerendered, and a cookie is unreadable during static generation, so every cached page would ship the default language. In the URL each locale gets its own prerendered variant and the R2 cache still works. A bare country (`/qa/store`) redirects to the default locale rather than 404ing, so old links survive.

`src/lib/util/locale.ts` owns parsing. Anything talking to the Store API wants `countryOf(segment)`, never the raw segment.

**Strings** live in `src/lib/i18n/dictionary.ts`, keyed by a flat dot-namespaced string. Server components call `getTranslations(segment)` with the segment passed down from the locale layout; client components call `useTranslations()`, which reads the segment from `useParams`. There is deliberately no provider and no context — the segment is already in the URL that rendered the page. Missing keys fall back to English rather than rendering a raw key.

**Scope is interface copy only.** Product names, descriptions and category names come from Medusa and are still English on `/ar-qa`. Machine-translating florist copy reads as machine-translated; this needs a human. Medusa's translation module is registered and `/store/locales` serves the two locales, so the plumbing is there.

**`lang` and `dir` are set twice, on purpose.** An inline script in the root layout sets them before first paint (the root layout gets no route params, and doing it in an effect would flash the wrong direction). `DirectionSync` in the locale layout then keeps them in step on client-side navigation — the script only runs once per document load, so without it a language switch re-rendered in Arabic while the page stayed `dir="ltr"`. Browser back and forward hit the same path, so a hard-navigating switcher would not have covered it.

**Tailwind's logical properties (`ps/pe`, `ms/me`, `start/end`) mirror off `dir` automatically. Its transform utilities do not.** `-translate-x-full` is physical, so the side menu sat on the right in Arabic but still flew in from the left until the sign was flipped explicitly.

**Arabic wording follows conventional Gulf e-commerce terms** — القائمة, السلة, عرض الكل — taken from [floward.com/ar-qa](https://floward.com/ar-qa), not literal translations of our English. Form *values* (delivery areas, time windows) stay English even in Arabic: the shopkeeper reads them off the order.

> All Arabic copy here was written without a native reviewer. It uses standard terminology and should be checked before launch.

---

## Caching & performance

The storefront renders almost nothing per-visitor, so nearly everything is cached. Three layers, all configured in [`apps/storefront/open-next.config.ts`](apps/storefront/open-next.config.ts):

| Layer | What it does |
|---|---|
| R2 incremental cache | Persistent store for prerendered pages and fetch results. Without it every Worker isolate re-renders from scratch |
| `withRegionalCache` | Cloudflare Cache API in front of R2, per datacentre. R2 is a network round trip, and the homepage makes six cached calls to build its rails |
| `enableCacheInterception` | Serves a prerendered page without booting the full Next.js server. Safe only because the site does not use PPR |
| `doShardedTagCache` | Sharded Durable Objects, SQLite-backed. This is what makes `revalidateTag` do anything |

Measured, warm, repeat visitor: homepage ~850ms → **245ms**, catalogue ~530ms → **64ms**, product pages ~590ms → **66ms**.

**The tag cache is not optional and it is not free.** OpenNext's `tagCache` defaults to `"dummy"`, which silently discards every tag — the backend had been posting to `/api/revalidate` on every product, price and inventory change since it was written, and none of it invalidated anything. But adding a real one put a round trip on every request and took the catalogue straight back to 315ms.

The resolution is `bypassTagCacheOnCacheHit: true` with `defaultLongLivedTtlSec: 60`. A regionally cached page is served without asking whether it is still valid; after 60 seconds the copy expires and the next request goes to R2, and *that* path does consult the tag cache. So the guarantee is **"an admin edit is live within a minute"**, not "on the next request". Cloudflare's tag-based purge would give both, but it needs a zone on an Enterprise plan and this worker is on `workers.dev`.

Two settings that look harmless and are not:
- `regionalCacheTtlSec` on the tag cache defaults to 5s. At this shop's traffic most requests arrive further apart than that, so the lookup expires before it is ever reused and every request pays the round trip anyway.
- `bypassTagCacheOnCacheHit` must stay `false` on Next 16+, where `revalidateTag` is stale-while-revalidate by default. It is only safe here because the storefront is on Next 15.

**Don't read cookies in catalogue code paths.** Reading them during render forces the route out of static rendering, which stops the incremental cache serving the page at all — this is why `getPublicCacheOptions` exists alongside `getCacheOptions`. Cart, customer and order data keep the per-visitor tag; the catalogue must not.

**Search does not touch the network.** `/api/search-index` serves a ~12KB index of the whole catalogue; the overlay fetches it once on idle and every query after that is a synchronous filter over an array (12–15ms end to end). Revisit at a few hundred products, where it wants a real search index rather than a bigger download.

## Store configuration

Seeded and verified against the live Supabase database.

- **Region:** Qatar · country code `qa` · currency **QAR** (store default). The starter's Europe/EUR region has been removed, so `qa` is the only region.
- **Warehouse:** Doha Warehouse · fulfillment set "Qatar delivery" · service zone covering `qa`
- **Shipping:** Standard Delivery (25 QAR), Same-Day Delivery (50 QAR)
- **Tax region:** `qa` at 0% — Qatar has no VAT on most goods, but the region must exist or checkout can't calculate totals
- **Products:** 4 placeholder items from the starter, repriced in QAR. Real flower products land in phase 7.
- **Languages:** English + Arabic, with RTL. Live at `/en-qa` and `/ar-qa`. Interface copy is translated; the catalogue is not — see the localization section below.
- **Payment:** SkipCash (pending). `pp_system_default` is the manual stand-in until then.

Re-run the Qatar configuration at any time — it is idempotent:

```bash
cd apps/backend && npx medusa exec ./src/scripts/seed-qatar.ts
```

### Homepage sections

The homepage layout is data, not code. **Admin → Homepage** lists the blocks below the hero carousel; they can be added, renamed (in both languages), reordered, hidden and deleted without a deploy.

Three types: `product_rail` (products from a collection handle), `category_tiles` (occasion tiles), `banner` (image, subtitle and a link). A rail pointing at a deleted collection renders nothing rather than an empty heading, and a missing Arabic heading falls back to English.

The hero carousel and the delivery-reassurance strip are deliberately *not* managed here — the strip answers "will it arrive in time", which decides the purchase, and should not be switchable off by accident.

```bash
cd apps/backend && npx medusa exec ./src/scripts/seed-homepage.ts
```

Idempotent, and it matches on type plus resource handle. It deliberately **does not overwrite headings** on re-run — undoing a rename made in the admin would defeat the point of the table.

If the backend is unreachable or no sections exist, the storefront falls back to the layout it used to hardcode. That is also why the two apps can deploy in either order.

> **Never reintroduce a `src/migration-scripts/` seed.** The starter shipped `initial-data-seed.ts`, which built a European store. It has been deleted. Medusa records executed migration scripts **by filename**, and local dev runs the `.ts` while a production build runs the compiled `.js` — different names, so it re-ran on every single deploy and kept resurrecting the Europe region. `seed-qatar.ts` is the one canonical setup script; it bootstraps a fresh database and cleans up a stale one.

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
- Backend → Railway, watching `apps/backend/**` on `main`. Config lives in [`railway.json`](railway.json) at the **repo root** (not `apps/backend/`) — the build must run from the root so npm workspaces resolve. Migrations run as a pre-deploy step, not at boot.
- Storefront → `.github/workflows/deploy-storefront.yml`, watching `apps/storefront/**` on `main`. Gated behind the `CLOUDFLARE_ENABLED` repo variable until Cloudflare is set up.

### Live environment

| | |
|---|---|
| Backend API | https://medusa-backend-sg-production.up.railway.app |
| Admin | https://medusa-backend-sg-production.up.railway.app/app |
| Storefront | https://flowershop-storefront.mubashermohammad35.workers.dev |
| Railway project | Singapore region — services `@dtc/backend` and `redis` |
| Cloudflare | account `fe381f34824a7e381581fba60f9a3176`, worker `flowershop-storefront`, R2 bucket `flowershop-cache` |
| Database | Supabase, **session pooler** `aws-0-ap-southeast-1` |

The backend and database both moved to Singapore during the latency work; the original `dtcbackend-production-a265` / `ap-northeast-1` pair is gone. The storefront's real backend URL is the `MEDUSA_BACKEND_URL` repo variable — check there rather than trusting this table if a request 404s with "Application not found".

Adding a new storefront origin means updating **`STORE_CORS` and `AUTH_CORS` on Railway**, not just Cloudflare.

Railway's `railwayConfigFile` setting is a stored per-service path. Moving `railway.json` in the repo does **not** update it — the deploy fails at *Snapshot code* with `service config at '<old path>' not found`. Update the service setting too.

---

## Gotchas

**Supabase connection string — this one bites silently.** Supabase offers three connection strings. Use the **session pooler on port 5432**:

- ❌ *Direct* (5432) — IPv6-only, may be unreachable from Railway
- ✅ **Session pooler (5432)** — IPv4, holds a session, prepared statements work
- ❌ *Transaction pooler (6543)* — breaks MikroORM. Prepared statements don't survive connection swaps, and migrations fail

A wrong port does not fail at boot. It surfaces later as intermittent `prepared statement "s1" does not exist` errors under load.

**Railway does not shell-expand `$VAR` in a start command.** The Redis service's `redis-server --requirepass $REDIS_PASSWORD` set the password to that literal string, and the backend failed with `WRONGPASS invalid username-password pair`. The password is written out literally in the start command instead. `${{service.VAR}}` references *between* services do resolve — that syntax is Railway's own, evaluated before the container starts.

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

**The reverse is also true: `tsc` does not gate the build.** Next has rules TypeScript knows nothing about, and they only surface in `next build`:

- Every export from a `"use server"` module is a Server Action and must be `async`. A synchronous helper next to a fetch fails with *"Server Actions must be async functions"*. Keep pure helpers in a separate module.
- `useSearchParams()` opts a component out of static rendering unless it is under a `<Suspense>` boundary. In a component that lives in the nav, that silently stops every page prerendering.

Run `npm run build` in `apps/storefront`, not just `tsc`, before pushing anything that touches a server module or a nav component.

---

## Roadmap

| # | Phase | Status |
|---|---|---|
| 0 | Medusa agent skills + docs MCP | ✅ Done |
| 1 | Monorepo scaffold (backend + storefront) | ✅ Done |
| 2 | CLAUDE.md, CI/CD, repo hygiene | ✅ Done (CI green; branch protection blocked by plan) |
| 3 | Supabase Postgres + migrations + Qatar seed | ✅ Done |
| 4 | Railway deploy (backend + Redis) | ✅ Done — live |
| 5 | Cloudflare storefront deploy | ✅ Done — live |
| 6 | Branding — palette + font done; name and logo pending | 🟡 Partial |
| 7 | Storefront design — homepage, product page, catalogue, checkout | ✅ Done |
| 8 | SkipCash payment provider | 🔒 Pending merchant account |
| 9 | Arabic / RTL localization | 🟡 UI done and live; catalogue copy pending a translator |
| 10 | Homepage sections editable from the admin | ✅ Done |
| 11 | Email notifications, analytics | 🔒 Later |

### Phase 8 notes — SkipCash

Custom payment provider at `apps/backend/src/modules/skipcash/`, extending `AbstractPaymentProvider`, registered under the `@medusajs/medusa/payment` module's `providers` array in `medusa-config.ts`.

Methods to implement: `initiatePayment`, `authorizePayment`, `capturePayment`, `refundPayment`, `cancelPayment`, `getPaymentStatus`, `getWebhookActionAndData`.

Known API surface — **verify against the official SkipCash integration manual before writing code**, not against third-party packages:

- Sandbox `https://skipcashtest.azurewebsites.net` · Production `https://api.skipcash.app`
- Redirect flow: create payment → response `resultObj.payUrl` → redirect customer → webhook confirms (`statusId === 2` means paid)
- Requests are HMAC-SHA256 signed over an ordered concatenation of fields. **The exact field order must come from the manual** — getting it wrong yields opaque signature-rejection errors.
