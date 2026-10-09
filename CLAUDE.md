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

> **The brand is Tulips and Truffles.** The name is written out as "Tulips and Truffles" in text; the logotype renders the "and" as a rose script flourish, which is a design choice, not a spelling. The mark lives in `apps/storefront/public/brand/`, the name in `BRAND_NAME` (`apps/storefront/src/modules/common/components/brand/index.tsx`, overridable by `NEXT_PUBLIC_BRAND_NAME`), and the palette in `brand.css`. Keep it to those three places.

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

## Accessibility & web standards

The target is [UMN's web standards](https://umarcomm.umn.edu/resources/web-standards-and-best-practices), which mandate **WCAG 2.1 level AA**, plus valid markup, a custom 404, working redirects and basic SEO hygiene. The page is behind a Cloudflare challenge — fetch it with a real browser, not `curl`.

Audited with axe-core across the homepage, catalogue, product page, cart, checkout and order tracking × both locales. **Currently zero WCAG 2.1 AA violations** (re-verified 22 Sep 2026 against production). The cart had three — an unnamed bin button, an unnamed quantity select and a 3.67:1 promotion link, all inherited from the Medusa starter — so re-run it against the cart and checkout specifically, not just the pages that were clean last time. Re-run it after any significant UI change; the script lives in the session scratchpad and is quick to recreate.

Things that were wrong and are worth not reintroducing:

- **`ink-400` is 3.04:1 on white — it fails AA and must never carry text.** It was on struck-through original prices, so the "was" half of every discount was unreadable. `ink-500` is 5.04:1, `ink-600` 7.60:1, `blush-700` 7.35:1.
- **A `role` on a `<ul>` replaces its implicit `list` role,** orphaning every `<li>` inside it. `role="list"` is the one you want when adding `tabindex` to a scrolling rail.
- **Radix renders `Accordion.Header` as `h3`.** Under a product `h1` that skips a level; pass `asChild` and supply your own `h2`.
- **Product cards take their heading level from context** — `h2` under a page heading, `h3` under a rail. Don't hardcode it.
- The skip link is `sr-only` until focused, which means automated tap-target checks will flag it at 1px. That is correct; exclude visually-hidden controls from those checks.

**Cart and checkout are deliberately `noindex`**, which is why they carry no canonical or hreflang. Checkout has no skip link on purpose: its header is two links, so a skip link would be a third stop to bypass two.

**Unmatched paths are caught inside the locale** by `[countryCode]/(main)/[...notFound]`, which calls `notFound()`. Without it they fell through to the root not-found, which renders outside `[countryCode]` — so an Arabic visitor got an English 404 on a bare page with no way back.

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

Measured, warm, repeat visitor: HTML arrives in **43–80ms** on a reused connection. Page weight on a phone at 2×: homepage **564 KB**, catalogue **213 KB**, product **139 KB** (23 Sep 2026).

**The tag cache is not optional and it is not free.** OpenNext's `tagCache` defaults to `"dummy"`, which silently discards every tag — the backend had been posting to `/api/revalidate` on every product, price and inventory change since it was written, and none of it invalidated anything. But adding a real one put a round trip on every request and took the catalogue straight back to 315ms.

The resolution is `bypassTagCacheOnCacheHit: true` with `defaultLongLivedTtlSec: 60`. A regionally cached page is served without asking whether it is still valid; after 60 seconds the copy expires and the next request goes to R2, and *that* path does consult the tag cache. So the guarantee is **"an admin edit is live within a minute"**, not "on the next request". Cloudflare's tag-based purge would give both, but it needs a zone on an Enterprise plan and this worker is on `workers.dev`.

Two settings that look harmless and are not:
- `regionalCacheTtlSec` on the tag cache defaults to 5s. At this shop's traffic most requests arrive further apart than that, so the lookup expires before it is ever reused and every request pays the round trip anyway.
- `bypassTagCacheOnCacheHit` must stay `false` on Next 16+, where `revalidateTag` is stale-while-revalidate by default. It is only safe here because the storefront is on Next 15.

> **Never wrap `sdk.client.fetch` with anything that reads cookies.** It was wrapped to attach an `x-medusa-locale` header read from a cookie, and because the wrapper sat on the client itself it applied to *every* data call in the app — including the catalogue paths written specifically to avoid cookies. Reading a cookie during render opts the route out of static rendering, so nothing reached the prerender manifest, no HTML was emitted, cache interception had nothing to intercept, the R2 incremental cache never served a page, and every visit re-rendered in the Worker and waited on Railway in Singapore. Every response went out `private, no-cache, no-store`, so browsers could not reuse pages either. The read sat inside a try/catch and the build still printed the routes as static, so nothing ever warned. Fixed 23 Sep 2026: warm HTML went from ~400–1400ms to **43–80ms**. If a route needs to tell the backend a locale, pass the header on that call.
>
> **Check `prerender-manifest.json` after any change to a layout or the data layer.** It is the fastest way to catch this class of bug: if `routes` is nearly empty, something made the app dynamic. `curl -sI` a page and look for `x-opennext-cache: HIT` and an `s-maxage` — `no-store` means the cache is doing nothing.

> **A queue is not optional either.** OpenNext's `queue` defaults to a dummy that throws `Dummy queue is not implemented` the moment a page needs background revalidation — and because that happens inside the cache interceptor, the request 500s rather than serving the stale copy. It took the homepage down on 26 Sep 2026, exactly 24 hours after a deploy: that page is the only one with a `revalidate` window, so it was the only one that ever went stale, which is why it passed every check at deploy time and broke a day later. `queue: doQueue` is now set, with a `NEXT_CACHE_DO_QUEUE` binding and a `DOQueueHandler` migration in `wrangler.jsonc`. **To test this class of bug without waiting a day, force a page stale** — `POST /api/revalidate` with the page's tag — and request it immediately; it should return 200 with `x-opennext-cache: HIT`, not a 500.

> **The queue needs `WORKER_SELF_REFERENCE` too.** Adding `queue: doQueue` was only half of it: the queue re-renders a stale page by calling the Worker back, so its Durable Object throws on construction without a service binding pointing the Worker at itself — "No service binding for cache revalidation worker" — and the homepage went down a second time, 28 Sep 2026, again exactly a day after a deploy.
>
> **Testing this needs a cache-busting query string.** A plain request, and a tag purge followed by a plain request, are both served from the regional cache and never reach the code that enqueues — which is why the first fix looked verified and was not. `curl "https://tulipsandtruffle.com/en-qa?cb=$RANDOM"` goes to R2, hits the interceptor, and exercises the real path. `.github/workflows/uptime.yml` now runs that every 30 minutes against the pages a customer walks through, plus the backend health check and the media host, because both outages were invisible at deploy time and only appeared a day later.

> **Never cache the cart.** `retrieveCart` and `listCartShippingMethods` are `no-store`, deliberately. They used `force-cache` with a per-visitor tag and relied on `revalidateTag` after each mutation — which silently stopped working once `bypassTagCacheOnCacheHit` was set, because a regional hit no longer consults the tag cache. The symptom was an item taking up to a minute to appear in the bag. A cart belongs to one visitor, changes on every interaction and returns in ~0.5s; there is nothing to win and correctness to lose.

**Adding to the bag is optimistic, and cart mutations are serialised.** The Store API's add-to-cart is ~2.8s — it validates the variant, checks inventory, reprices and refreshes the cart — so the button confirms immediately and the request settles behind it. Because the button no longer blocks, concurrent adds became possible, and they are not safe: the first add has no cart cookie yet so it creates one, and anything fired before it returns creates another. `lib/util/cart-queue.ts` runs them one at a time.

**Don't read cookies in catalogue code paths.** Reading them during render forces the route out of static rendering, which stops the incremental cache serving the page at all — this is why `getPublicCacheOptions` exists alongside `getCacheOptions`. Cart, customer and order data keep the per-visitor tag; the catalogue must not.

**Images are resized ahead of time, because Next's optimiser does not run on Cloudflare Workers.** `images.loader` is custom: `scripts/build-image-variants.mjs` generates a ladder of widths (320/640/960/1280) for `/public` images and for the R2 catalogue, records them in `src/lib/util/image-variants.json`, and `image-loader.js` picks the nearest rung. Anything missing from the manifest falls back to its original URL, so a product uploaded from the admin since the script last ran is heavier than it needs to be but never broken — **re-run the script after adding products**. The variants are committed deliberately: generating them at deploy would leave the manifest pointing at missing files whenever that step failed. Before this, a 900px photograph was served into a 168px card and the homepage shipped 1.5 MB of images; it is now 564 KB.

**Search does not touch the network.** `/api/search-index` serves a ~12KB index of the whole catalogue; the overlay fetches it once on idle and every query after that is a synchronous filter over an array (12–15ms end to end). Revisit at a few hundred products, where it wants a real search index rather than a bigger download.

## Store configuration

Seeded and verified against the live Supabase database.

- **Region:** Qatar · country code `qa` · currency **QAR** (store default). The starter's Europe/EUR region has been removed, so `qa` is the only region.
- **Warehouse:** Doha Warehouse · fulfillment set "Qatar delivery" · service zone covering `qa`
- **Shipping:** Standard Delivery (20 QAR, with a time slot; today's date is same-day) and **11:59 Midnight Surprise** (50 QAR placeholder, type code `midnight`). 11:59 is pre-order only: orders for a night are taken 12pm–6pm Qatar time that day (`MIDNIGHT_ORDER_OPENS_HOUR` / `MIDNIGHT_ORDER_CLOSES_HOUR` in `apps/storefront/src/lib/util/delivery.ts`), enforced server-side in `guest-order.ts`. Same-Day as a paid tier was removed on 19 Sep 2026; `seed-qatar` deletes it if it reappears.
- **Delivery capacity:** `deliveryCapacity` module, one row per day — closed, a limit for the day, a limit per window, and what is already booked. Counts are kept by `src/subscribers/delivery-capacity.ts` on `order.placed` and released on `order.canceled`, because the delivery date lives in order metadata, which the Admin API cannot filter or group by. Days nobody has booked have no row. Admin → **Delivery days**; defaults in `src/modules/delivery-capacity/constants.ts`.
- **Same-day cut-off is enforced, not just advertised.** `windowsFor()` in `apps/storefront/src/lib/util/delivery.ts` drops a window that is inside `SAME_DAY_LEAD_HOURS`, and today disappears entirely after `SAME_DAY_CUTOFF_HOUR` (6pm). `guest-order.ts` re-checks the date, the window and the day's capacity — the form is never the boundary.
- **Tax region:** `qa` at 0% — Qatar has no VAT on most goods, but the region must exist or checkout can't calculate totals
- **Products:** the shop's real catalogue — 20 products imported from the florist's spreadsheet on 9 Oct 2026, replacing the placeholder catalogue. Nine of the prices were estimates marked "please confirm" in the sheet's *Pricing notes* tab (both 35-rose items and all seven hydrangeas). Four placeholders (Adliswil Black Vase, Piccadilly Charm, Bloomsbury, Wellington Vase) are **unpublished rather than deleted**: old pending orders #3, #4, #6 and #7 hold stock reservations on them, and Medusa refuses to delete a product with reservations. Cancel those orders and they can go.
- **`seed-catalog.ts` no longer touches products unless `SEED_PLACEHOLDER_PRODUCTS=true`.** Against the real catalogue it would have brought all fifty placeholders back, and its image pass repointed every product's photo at `/products/<handle>.jpg`, which does not exist for a real product. It still creates and prunes categories and collections.
- **Categories** live in [`apps/backend/src/lib/catalogue-taxonomy.ts`](apps/backend/src/lib/catalogue-taxonomy.ts) — one source of truth, because the seed, the spreadsheet importer and the spreadsheet's own dropdowns all read it, and a category the florist can pick but that does not exist in Medusa imports to nowhere. The storefront mirrors the handles in `src/lib/util/categories.ts`; they were duplicated in three components, which is how the nav and the catalogue filter came to be edited separately.

  Ten type categories, replacing the starter's Bouquets/Vases/Roses/Luxury/Everyday on 28 Sep 2026: Hot Deal, Hand-Tied Bouquets, Big Bouquets, Flowers in Vases, 50 Roses, 100 Roses, 200 Roses, Mix Flowers, Big Flowers, Baby Roses. The six **occasion** categories are deliberately kept alongside them — they answer "what is it for" rather than "what is it", a product belongs to both, and the homepage occasion tiles render from them.

  A product may sit in several: a vased fifty-rose arrangement genuinely belongs under both 50 Roses and Flowers in Vases, and a customer will look under either. **Hot Deal is rule-free on purpose** — what is on offer is a weekly decision made in the admin, not something derivable from a price.

  The **flower varieties** the shop stocks (33 of them — rose cultivars, BB roses, hydrangea, gerbera, hot eskimo, carnation) live in the same file. They are stock knowledge, not categories: a free-text variety column comes back with "Vendala", "vendela" and "white rose" meaning one flower, and nothing can group them afterwards.
- **Languages:** English + Arabic, with RTL. Live at `/en-qa` and `/ar-qa`. Interface copy is translated; the catalogue is not — see the localization section below.
- **Payment:** SkipCash (pending). `pp_system_default` is the manual stand-in until then.
- **Personalisation is the gift message only.** The ribbon-colour picker was removed on 28 Sep 2026 on the shop's instruction — the florist ties whatever suits the arrangement, so five named colours promised a choice nobody was tracking.

Re-run the Qatar configuration at any time — it is idempotent:

```bash
cd apps/backend && npx medusa exec ./src/scripts/seed-qatar.ts
```

### Adding products from a spreadsheet

The florist fills in a spreadsheet and it is imported. The admin dashboard adds one product at a time through six screens, which is fine for an edit and hopeless for a hundred new arrangements — and Medusa's own CSV import takes image *URLs*, while a florist photographing bouquets on a phone has files.

```bash
node scripts/make-product-template.mjs                    # -> product-import-template.xlsx
node scripts/import-products.mjs sheet.xlsx               # dry run: reports what it would do
node scripts/import-products.mjs sheet.xlsx --apply       # writes to the live catalogue
```

- **Photos are pulled out of the workbook.** A picture pasted into a cell is stored as a floating drawing anchored to a row, not as a cell value, so it comes from `getImages()` rather than from the row. A `Photo file name` column naming a file beside the spreadsheet works too. Each one is EXIF-rotated, resized to 1600px, converted to WebP and uploaded through `/admin/uploads` to R2.
- **Rows sharing a product name become sizes of one product**, each with its own price.
- **Dry run by default.** This writes to the live catalogue; a mistyped heading should surface as a printed report, not as ninety draft products to delete by hand. The target URL is printed before anything happens.
- **It lives in `scripts/`, not the backend**, for the same reason `build-image-variants.mjs` does — it needs exceljs and sharp, and neither belongs in the bundle that deploys to Railway. `exceljs` is a root devDependency.
- **Do not let it read `MEDUSA_BACKEND_URL` from `apps/backend/.env`.** That variable is the *local* backend (`http://localhost:9000`), and picking it up sent the whole import at a backend that was not running. Only the admin credentials come from `.env`; the target is `IMPORT_BACKEND_URL`, or `--local`.
- **Re-run `node scripts/build-image-variants.mjs` after importing**, or the new photos are served at full size — then redeploy the storefront, because the variant list ships in its bundle. The homepage also holds its cached copy for up to a day, and moving a product between collections does not invalidate it; a deploy does.
- **The HTTP API takes `categories: [{ id }]`, not `category_ids`.** `category_ids` is the internal workflow shape and the route rejects it — which a dry run cannot catch, since it never posts.
- **The photo is uploaded only after the product call succeeds.** Uploading first left an orphaned file in R2 for every product the API then rejected; the first run on 9 Oct left twenty.
- **Filled-in sheets often fail to load in exceljs** with *Cannot read properties of undefined (reading 'comments')* — some editors re-save the template's cell notes with an absolute relationship path. The importer strips comment relationships from an in-memory copy and retries.

Updating an existing product replaces its price, description, categories and photo but **not its variants** — Medusa treats those as their own resources. So the sheet doubles as the master copy for a bulk price change on single-size products; a product that already has sizes is repriced in the admin.

### The Shop screen (Admin → Shop)

The florist's everyday screen, rebuilt 9 Oct 2026 around a written guide for them: the *Running the Shop — Florist's Guide* doc (Claude Docs, private until the owner shares it). Components live in `apps/backend/src/admin/components/shop/`; the page only composes them. **Everything goes through Medusa's own admin routes and workflows** — an order cancelled here is cancelled exactly as in the full admin.

- **Orders move New → Confirmed → Sent.** Medusa has no notion of the shop *accepting* an order, which is how this shop works (every order is confirmed on WhatsApp first), so *Confirmed* is `shop_confirmed_at` in the order's metadata. An order update **replaces** metadata, so the whole object is sent back with the key added — sending the key alone would wipe the delivery date, recipient and gift message.
- **Cancel before it is sent, refund after.** Medusa's `cancelOrderWorkflow` voids an unpaid payment and **refunds a captured one by itself**, so the screen has no refund-then-cancel step (it would double-refund). It also refuses to cancel once a fulfilment exists — so after *Mark sent*, only *Refund* is offered.
- **Payments are manual until SkipCash.** `pp_system_default` authorises and never captures, so no money moves through Medusa. *Mark as paid* captures (the customer paid by transfer or cash); *Refund* records money the shop returns itself. The same buttons will move real card payments once SkipCash is in.
- **Card messages live on line items** (`item.metadata.gift_note`, one per bouquet), with an order-level one from checkout too. The order card and the delivery label read both. The label used to read only the order's, so a message written on the product page never got printed.
- **Adding a flower takes a photo upload** (shrunk to 1600px WebP in the browser), **no stock count** (made to order, `manage_inventory: false` — the same choice as the importer), and several categories. **Hide/Show is the everyday removal**; delete is at the bottom of Edit and turns Medusa's reservation refusal into "hide it instead".

### Printed paperwork

Two documents, from Admin → an order, or Admin → Shop. Both open in their own window with the print dialog up; see [`apps/backend/src/admin/lib/print.ts`](apps/backend/src/admin/lib/print.ts).

- **Delivery label** — recipient, phone and address at arm's length, for the courier, with the gift message as a dashed cut-out box to enclose. Carries the shop's logo at the top.
- **Receipt** — itemised, for whoever paid.

The logo is uploaded at **Admin → Shop → Delivery label logo** and kept in the store's own metadata (`delivery_label_logo_url`) — one string that belongs to the store, where a module would mean a data model, a service, a migration and an API route. With nothing uploaded it falls back to the mark inlined in `admin/lib/brand-mark.ts`, so a label is never unbranded. That mark is a base64 data URI, not a path: the print window is an `about:blank` document with no origin, so a relative path resolves to nothing, and `#` in every SVG fill terminates a percent-encoded data URI early.

**Keep the logo small on the label.** It is 11mm beside the shop name. That sheet is read by a courier at arm's length looking for a name and a phone number, and branding that competes with those makes the label worse at its actual job.

A separate A6 gift card document was built on 28 Sep 2026 and removed the same day at the shop's request — the message stays on the label as the cut-out box. Worth knowing before building it again: the gift note belongs to the **line item**, not the order, since two bouquets in one order can go to two different people, so that document needed one card per message rather than one per order.

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
| Storefront | **https://tulipsandtruffle.com** (www redirects to the apex) · test address https://flowershop-storefront.officialyuvraj24.workers.dev |
| Backend API | https://medusa-backend-sg-production.up.railway.app |
| Admin | https://medusa-backend-sg-production.up.railway.app/app |
| Product images | https://media.tulipsandtruffle.com — R2 bucket `flowershop-media` on a custom domain, so a future account move never touches image URLs |
| Railway project | Singapore region — services `@dtc/backend` and `redis` |
| Cloudflare | yuv's account `715d05fd56dbceb6ca11971d80974627` (moved 21 Sep 2026 from Mubasher's; the domain lives there), worker `flowershop-storefront`, R2 buckets `flowershop-cache` + `flowershop-media`, both APAC |
| Database | Supabase project `moawqiebddyqfahnvoax`, **session pooler** `aws-0-ap-southeast-1` |

The backend and database both moved to Singapore during the latency work; the original `dtcbackend-production-a265` / `ap-northeast-1` pair is gone. The storefront's real backend URL is the `MEDUSA_BACKEND_URL` repo variable — check there rather than trusting this table if a request 404s with "Application not found".

> **The `S3_*` values in a local `apps/backend/.env` may still point at the old account's bucket** (`pub-3cbbae…r2.dev`, last written 19 Sep). Railway has the real ones. Anything run locally that uploads or lists media through those variables is talking to a bucket production no longer uses.

**Moving Cloudflare accounts** (done once, 21 Sep 2026; the pieces are reusable): the Worker config is not account-bound, so it is secrets and data. GitHub: `CLOUDFLARE_API_TOKEN` (mint it from the *Edit Cloudflare Workers* template plus R2 and DNS — a hand-built token without *Account Settings: Read* / *Workers Tail: Read* makes the R2 cache seeding fail with "Failed to send request to R2 worker … timeout", because it cannot open wrangler's remote session) and `CLOUDFLARE_ACCOUNT_ID`; variables `MEDIA_HOSTNAME`, `STOREFRONT_BASE_URL`. Railway: the five `S3_*` values, `STORE_CORS` / `AUTH_CORS`, `STOREFRONT_URL`. Then `OLD_MEDIA_URL=… npx medusa exec ./src/scripts/rehost-media.ts` copies every product image into the new bucket and rewrites the URLs. `REVALIDATE_SECRET` is a Worker runtime secret; the deploy workflow re-applies it.

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

**The admin dashboard has its own tsconfig.** `apps/backend/tsconfig.json` excludes `src/admin` and `tsconfig.admin.json` covers it on Bundler resolution, because Vite bundles the admin as ESM (`import.meta.env`) while the server compiles to CommonJS. Both are type-checked in CI. The backend also pins one React type identity via `paths` — the admin's tree carries `@types/react` 18 while the hoisted packages it renders resolve the root's 19, and the two ReactNode types are structurally different, which made every Medusa UI component read as "cannot be used as a JSX component". That failure had CI red from August until 22 Sep 2026.

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
| 11 | Accessibility — WCAG 2.1 AA / UMN standards | ✅ Done — zero axe violations |
| 12 | Email notifications, analytics | 🔒 Later |

### Email

Order confirmations go out through a small Resend provider at `apps/backend/src/modules/resend/`, with the email itself written in `apps/backend/src/lib/order-email.ts` — in this repo rather than a provider's dashboard, so it is reviewable in code and translated next to the rest of the copy. Medusa's SendGrid provider was not used for exactly that reason: its bodies live in SendGrid's UI.

**Live since 27 Sep 2026.** Sending domain `tulipsandtruffle.com` is verified with Resend (region eu-west-1); its DKIM, SPF and MX records are in Cloudflare DNS, unproxied — proxying them breaks mail authentication. Mail goes out as `Tulips and Truffles <orders@tulipsandtruffle.com>` with replies pointed at the shop's own inbox. A gmail.com address cannot be a sender: Resend only sends as a domain you can add DNS records to.

Gated on `RESEND_API_KEY` and `RESEND_FROM` (an address on a domain verified with Resend). Without them the notification module still registers the local provider, which logs the notification, and nothing is sent. Checkout asks for an email **optionally** — the shop reaches people on WhatsApp and a required address would cost orders — so when none is given Medusa's required email is still a placeholder derived from the phone number, and the subscriber skips those rather than mailing a dead domain.

### Demo payment gateway

A simulated card payment exists in checkout so the flow can be shown before SkipCash is live. It is deliberately built so it cannot be misused as real payment: the card number is a fixed, read-only test value, so there is nowhere to type a real one. Nothing is transmitted, the outcome is chosen explicitly, and the reference is prefixed `DEMO-` and stored with `payment_status: simulated_demo_no_funds_taken` so a demo order is never mistaken for a paid one.

Controlled by `NEXT_PUBLIC_DEMO_PAYMENT` (repo variable `DEMO_PAYMENT`, currently defaulting to `true`). **Remove it from the deploy workflow when SkipCash goes live.**

### Phase 8 notes — SkipCash

Custom payment provider at `apps/backend/src/modules/skipcash/`, extending `AbstractPaymentProvider`, registered under the `@medusajs/medusa/payment` module's `providers` array in `medusa-config.ts`.

Methods to implement: `initiatePayment`, `authorizePayment`, `capturePayment`, `refundPayment`, `cancelPayment`, `getPaymentStatus`, `getWebhookActionAndData`.

Known API surface — **verify against the official SkipCash integration manual before writing code**, not against third-party packages:

- Sandbox `https://skipcashtest.azurewebsites.net` · Production `https://api.skipcash.app`
- Redirect flow: create payment → response `resultObj.payUrl` → redirect customer → webhook confirms (`statusId === 2` means paid)
- Requests are HMAC-SHA256 signed over an ordered concatenation of fields. **The exact field order must come from the manual** — getting it wrong yields opaque signature-rejection errors.
