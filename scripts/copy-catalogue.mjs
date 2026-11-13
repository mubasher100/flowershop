#!/usr/bin/env node
/**
 * Copy the live shop's catalogue into a test copy of the shop.
 *
 *   TARGET_ADMIN_EMAIL=… TARGET_ADMIN_PASSWORD=… node scripts/copy-catalogue.mjs --local
 *   TARGET_BACKEND_URL=https://<staging> TARGET_ADMIN_EMAIL=… TARGET_ADMIN_PASSWORD=… \
 *     node scripts/copy-catalogue.mjs
 *
 * It READS the live shop only through its public Store API (what any visitor's
 * browser sees, with the public publishable key) and WRITES only to the target
 * through its admin API. It refuses to run with the live backend as the target.
 *
 * What comes across: categories, collections, every flower on sale with its
 * sizes, prices, offers (the struck-through ones), stock and photos. Photos
 * are not re-uploaded; the copy points at the same image URLs. Nothing about
 * customers or orders is read, because the Store API does not serve it.
 *
 * Safe to re-run: a flower whose handle already exists in the target is left
 * alone, and categories and collections are matched by handle.
 */
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const LIVE = "https://medusa-backend-sg-production.up.railway.app"

const SOURCE = (process.env.SOURCE_BACKEND_URL || LIVE).replace(/\/$/, "")
const TARGET = (
  process.argv.includes("--local")
    ? "http://localhost:9000"
    : process.env.TARGET_BACKEND_URL || ""
).replace(/\/$/, "")

if (!TARGET) {
  console.error("Set TARGET_BACKEND_URL, or pass --local for http://localhost:9000.")
  process.exit(1)
}
if (TARGET === LIVE.replace(/\/$/, "") || TARGET === SOURCE) {
  console.error(`Refusing to write to ${TARGET}: that is the shop being copied.`)
  process.exit(1)
}

/** The storefront's publishable key: a public value, sent with every page. */
function publishableKey() {
  if (process.env.SOURCE_PUBLISHABLE_KEY) return process.env.SOURCE_PUBLISHABLE_KEY
  const env = path.join(ROOT, "apps/storefront/.env.local")
  if (!existsSync(env)) return null
  const m = /^NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=(.*)$/m.exec(readFileSync(env, "utf8"))
  return m?.[1].trim().replace(/^["']|["']$/g, "") ?? null
}

const KEY = publishableKey()
if (!KEY) {
  console.error("No publishable key for the live shop: set SOURCE_PUBLISHABLE_KEY.")
  process.exit(1)
}

async function store(route) {
  const res = await fetch(`${SOURCE}${route}`, { headers: { "x-publishable-api-key": KEY } })
  if (!res.ok) throw new Error(`GET ${SOURCE}${route} -> ${res.status}`)
  return res.json()
}

let token = ""
async function admin(method, route, body) {
  const res = await fetch(`${TARGET}${route}`, {
    method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  const json = text ? JSON.parse(text) : {}
  if (!res.ok) {
    throw new Error(`${method} ${route} -> ${res.status}: ${String(json.message || text).slice(0, 300)}`)
  }
  return json
}

async function login() {
  const { TARGET_ADMIN_EMAIL: email, TARGET_ADMIN_PASSWORD: password } = process.env
  if (!email || !password) throw new Error("Set TARGET_ADMIN_EMAIL and TARGET_ADMIN_PASSWORD.")
  const res = await fetch(`${TARGET}/auth/user/emailpass`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  const json = await res.json().catch(() => ({}))
  if (!json.token) throw new Error(`Could not sign in to ${TARGET}: ${json.message || res.status}`)
  token = json.token
}

async function allStore(route, key) {
  const out = []
  for (let offset = 0; ; offset += 50) {
    const sep = route.includes("?") ? "&" : "?"
    const page = await store(`${route}${sep}limit=50&offset=${offset}`)
    out.push(...page[key])
    if (out.length >= page.count || page[key].length === 0) return out
  }
}

async function main() {
  console.log(`Reading ${SOURCE} (public catalogue only)`)
  console.log(`Writing ${TARGET}`)
  await login()

  /* ---- what the target already has --------------------------------- */
  const [cats, cols, channels, profiles, locations, lists, existing] = await Promise.all([
    admin("GET", "/admin/product-categories?limit=200&fields=id,handle"),
    admin("GET", "/admin/collections?limit=200&fields=id,handle"),
    admin("GET", "/admin/sales-channels?limit=10"),
    admin("GET", "/admin/shipping-profiles?limit=10"),
    admin("GET", "/admin/stock-locations?limit=10&fields=id,name"),
    admin("GET", "/admin/price-lists?limit=50&fields=id,title,type,status"),
    admin("GET", "/admin/products?limit=1000&fields=id,handle"),
  ])
  const catId = new Map(cats.product_categories.map((c) => [c.handle, c.id]))
  const colId = new Map(cols.collections.map((c) => [c.handle, c.id]))
  const have = new Set(existing.products.map((p) => p.handle))
  const salesChannelId = channels.sales_channels[0]?.id
  const shippingProfileId = profiles.shipping_profiles[0]?.id
  const locationId = locations.stock_locations[0]?.id
  if (!salesChannelId || !shippingProfileId || !locationId) {
    throw new Error("The target has no sales channel, shipping profile or warehouse. Run seed-qatar first.")
  }

  /* ---- categories and collections, by handle ----------------------- */
  const srcCats = await allStore("/store/product-categories?fields=id,name,handle,description", "product_categories")
  for (const c of srcCats) {
    if (catId.has(c.handle)) continue
    const { product_category } = await admin("POST", "/admin/product-categories", {
      name: c.name,
      handle: c.handle,
      description: c.description || undefined,
      is_active: true,
      is_internal: false,
    })
    catId.set(c.handle, product_category.id)
    console.log(`category   ${c.name}`)
  }
  const srcCols = await allStore("/store/collections?fields=id,title,handle", "collections")
  for (const c of srcCols) {
    if (colId.has(c.handle)) continue
    const { collection } = await admin("POST", "/admin/collections", { title: c.title, handle: c.handle })
    colId.set(c.handle, collection.id)
    console.log(`collection ${c.title}`)
  }

  /* ---- the offers list --------------------------------------------- */
  let saleList = lists.price_lists.find((l) => l.type === "sale" && l.status === "active")
  if (!saleList) {
    ;({ price_list: saleList } = await admin("POST", "/admin/price-lists", {
      title: "Everyday value",
      description: "Offers shown struck through on the shop.",
      type: "sale",
      status: "active",
      prices: [],
    }))
    console.log("price list Everyday value (sale)")
  }

  /* ---- flowers ------------------------------------------------------ */
  const { regions } = await store("/store/regions?fields=id,currency_code")
  const region = regions.find((r) => r.currency_code === "qar") ?? regions[0]
  const products = await allStore(
    `/store/products?region_id=${region.id}&fields=id,title,subtitle,handle,description,thumbnail,metadata,*images,*categories,*collection,*options,*options.values,*variants,*variants.options,*variants.calculated_price,+variants.inventory_quantity`,
    "products"
  )

  let created = 0
  let skipped = 0
  for (const p of products) {
    if (have.has(p.handle)) {
      skipped++
      continue
    }
    const optionTitle = new Map(p.options.map((o) => [o.id, o.title]))
    const priceOf = (v) => {
      const cp = v.calculated_price ?? {}
      const now = cp.calculated_amount ?? null
      const full = cp.original_amount ?? now
      return { full, sale: now != null && full != null && now < full ? now : null }
    }

    const body = {
      title: p.title,
      subtitle: p.subtitle || undefined,
      handle: p.handle,
      description: p.description || undefined,
      status: "published",
      thumbnail: p.thumbnail || undefined,
      images: (p.images ?? []).map((i) => ({ url: i.url })),
      metadata: p.metadata || undefined,
      categories: (p.categories ?? []).map((c) => catId.get(c.handle)).filter(Boolean).map((id) => ({ id })),
      collection_id: p.collection ? colId.get(p.collection.handle) : undefined,
      shipping_profile_id: shippingProfileId,
      sales_channels: [{ id: salesChannelId }],
      options: p.options.map((o) => ({ title: o.title, values: o.values.map((v) => v.value) })),
      variants: p.variants.map((v) => ({
        title: v.title,
        sku: v.sku || undefined,
        manage_inventory: true,
        options: Object.fromEntries(v.options.map((o) => [optionTitle.get(o.option_id), o.value])),
        prices: [{ amount: priceOf(v).full, currency_code: "qar" }],
      })),
    }

    const { product } = await admin("POST", "/admin/products", body)

    // Stock and offers go on once the sizes exist. The create makes each
    // size's inventory item but not its level at the warehouse.
    const { product: full } = await admin(
      "GET",
      `/admin/products/${product.id}?fields=variants.id,variants.title,variants.inventory_items.inventory_item_id`
    )
    const sales = []
    for (const v of p.variants) {
      const target = full.variants.find((t) => t.title === v.title)
      const itemId = target?.inventory_items?.[0]?.inventory_item_id
      if (itemId) {
        await admin("POST", `/admin/inventory-items/${itemId}/location-levels`, {
          location_id: locationId,
          stocked_quantity: v.inventory_quantity ?? 10,
        })
      }
      const { sale } = priceOf(v)
      if (target && sale != null) sales.push({ variant_id: target.id, amount: sale, currency_code: "qar" })
    }
    if (sales.length) {
      await admin("POST", `/admin/price-lists/${saleList.id}/prices/batch`, { create: sales })
    }
    created++
    console.log(`flower     ${p.title}${sales.length ? " (on offer)" : ""}`)
  }

  console.log(`\nDone: ${created} flowers copied, ${skipped} already there.`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
