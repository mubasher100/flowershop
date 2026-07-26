# Flowershop

Headless ecommerce platform for a flower shop serving Qatar, built on [Medusa v2](https://docs.medusajs.com/).

**Fully self-hosted.** This project deliberately does **not** use Medusa Cloud.

| Concern | Technology | Hosted on |
|---|---|---|
| Commerce engine + Admin | Medusa v2.18 | Railway |
| Database | PostgreSQL | Supabase |
| Cache / events / workflows / locks | Redis | Railway |
| Storefront | Next.js 15 | Cloudflare Workers (OpenNext) |
| Payments | SkipCash | — |

## Prerequisites

- Node.js v20+ (v24 recommended)
- npm v10+
- A Supabase project (Postgres), or a local PostgreSQL v15+ for development
- Redis — optional locally, required in production

## Getting started

```bash
git clone https://github.com/mubasher100/flowershop.git
cd flowershop
npm install --legacy-peer-deps

cp apps/backend/.env.template apps/backend/.env
cp apps/storefront/.env.template apps/storefront/.env.local
# fill in DATABASE_URL and the publishable key — see the templates

cd apps/backend && npx medusa db:migrate && npx medusa user -e admin@example.com -p supersecret
cd ../.. && npm run dev
```

| Service | URL |
|---|---|
| Backend API | http://localhost:9000 |
| Admin dashboard | http://localhost:9000/app |
| Storefront | http://localhost:8000 |

## Layout

```
apps/backend/      Medusa API + Admin       → Railway
apps/storefront/   Next.js storefront       → Cloudflare Workers
.agents/skills/    Medusa agent skills
.github/workflows/ CI + storefront deploy
```

## Commands

```bash
npm run dev              # both apps
npm run lint
npm run test
npm run backend:dev      # backend only
npm run storefront:dev   # storefront only
npm run backend:seed     # seed demo data

npm run build --workspace=@dtc/backend    # backend build
npm run build                             # both — needs the backend running
```

> `next build` statically generates product pages, so it fetches the Store API at build time. Building the storefront without a running backend fails with `ECONNREFUSED`.

## Contributing

`main` is protected. Work on `feat/…`, `fix/…`, or `chore/…` branches and open a PR; CI must pass before merge. Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/).

## Documentation

[CLAUDE.md](CLAUDE.md) is the working reference — stack, hosting topology, Medusa architecture rules, environment variables, deployment gotchas, and the phased roadmap. Read it before making changes.

## Deployment

- **Backend** — Railway deploys from `main` on changes under `apps/backend/**`. Migrations run as a pre-deploy step (see [apps/backend/railway.json](apps/backend/railway.json)).
- **Storefront** — GitHub Actions builds with OpenNext and deploys to Cloudflare Workers on changes under `apps/storefront/**`.
