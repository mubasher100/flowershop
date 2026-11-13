#!/usr/bin/env node
/**
 * The catalogue half of the Black Friday changes (13 Nov 2026, the shop's list):
 *
 *   - Offers (hot-deals) is renamed Black Friday, with a new description
 *   - the empty black-friday category made on 11 Nov is deleted, so a
 *     discounted flower has one home (refused if it has any products)
 *   - every hydrangea and every yellow rose is hidden (draft, not deleted —
 *     Show in the admin brings one back)
 *   - the homepage rail headed "Offers" is headed Black Friday
 *
 *   TARGET_BACKEND_URL=https://… ADMIN_EMAIL=… ADMIN_PASSWORD=… \
 *     node scripts/black-friday-catalogue.mjs [--apply]
 *
 * Dry run by default: prints what it would change. Run it on staging first.
 */
const APPLY = process.argv.includes("--apply")
const BACKEND = (process.env.TARGET_BACKEND_URL || "").replace(/\/$/, "")
const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env

if (!BACKEND || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("Set TARGET_BACKEND_URL, ADMIN_EMAIL and ADMIN_PASSWORD.")
  process.exit(1)
}

const NAME = "Black Friday"
const NAME_AR = "الجمعة البيضاء"
const DESCRIPTION =
  "Black Friday prices, now. Order today and choose a delivery day after Black Friday."
const HIDE = /hydrang|hydreng|yellow/i

console.log(`${APPLY ? "APPLYING to" : "Dry run against"} ${BACKEND}\n`)

const login = await fetch(`${BACKEND}/auth/user/emailpass`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
})
if (!login.ok) {
  console.error(`Sign-in failed: ${login.status}`)
  process.exit(1)
}
const { token } = await login.json()

async function api(method, path, body) {
  const res = await fetch(`${BACKEND}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(json).slice(0, 300)}`)
  return json
}
const step = async (label, fn) => {
  console.log(`${APPLY ? "•" : "would"} ${label}`)
  if (APPLY) await fn()
}

/* ---------------------------------------------------------- categories */
const { product_categories: cats } = await api(
  "GET",
  "/admin/product-categories?limit=200&fields=id,name,handle,description,products.id"
)
const offers = cats.find((c) => c.handle === "hot-deals")
if (!offers) throw new Error("No hot-deals category on this backend.")
if (offers.name !== NAME || offers.description !== DESCRIPTION) {
  await step(`rename "${offers.name}" (hot-deals) to "${NAME}"`, () =>
    api("POST", `/admin/product-categories/${offers.id}`, { name: NAME, description: DESCRIPTION })
  )
}

const duplicate = cats.find((c) => c.handle === "black-friday")
if (duplicate) {
  const n = duplicate.products?.length ?? 0
  if (n) {
    console.log(`! black-friday has ${n} products — left alone; move them to hot-deals first`)
  } else {
    await step("delete the empty black-friday category", () =>
      api("DELETE", `/admin/product-categories/${duplicate.id}`)
    )
  }
}

/* ------------------------------------------------------------ products */
const { products } = await api("GET", "/admin/products?limit=500&fields=id,title,handle,status")
const toHide = products.filter((p) => p.status === "published" && HIDE.test(`${p.title} ${p.handle}`))
for (const p of toHide) {
  await step(`hide ${p.title}`, () => api("POST", `/admin/products/${p.id}`, { status: "draft" }))
}
const stillOn = products.filter((p) => p.status === "published").length - toHide.length
console.log(`  (${stillOn} flowers stay on sale)`)

/* ------------------------------------------------------------ homepage */
const { sections = [] } = await api("GET", "/admin/homepage-sections").catch(() => ({}))
for (const s of sections.filter((s) => s.resource_handle === "hot-deals" && s.title !== NAME)) {
  await step(`retitle homepage rail "${s.title}" to "${NAME}"`, () =>
    api("POST", `/admin/homepage-sections/${s.id}`, { title: NAME, title_ar: NAME_AR })
  )
}

console.log(APPLY ? "\nDone." : "\nNothing changed. Add --apply to make these changes.")
