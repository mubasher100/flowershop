## What & why

<!-- What changes, and what problem it solves. -->

## How to test

<!-- Steps to verify locally. Include the affected routes/pages. -->

## Checklist

- [ ] `npm run build` passes
- [ ] Data-model changes have a generated migration (`npx medusa db:generate <Module>`)
- [ ] No new env vars, or they're documented in `.env.template` and `CLAUDE.md`
- [ ] Mutations go through workflows, not directly through module services
- [ ] No secrets committed
