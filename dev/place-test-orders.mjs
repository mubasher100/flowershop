#!/usr/bin/env node
/**
 * Place a few realistic test orders on a TEST backend, through the Store API,
 * paid with the manual provider (no card, no SkipCash).
 *
 *   TEST_PUBLISHABLE_KEY=pk_… node dev/place-test-orders.mjs [count] [--backend URL]
 *
 * Defaults to http://localhost:9000. Refuses the live backend.
 */
const args = process.argv.slice(2)
const flag = args.indexOf("--backend")
const BACKEND = (flag >= 0 ? args[flag + 1] : "http://localhost:9000").replace(/\/$/, "")
const COUNT = Number(args.find((a) => /^\d+$/.test(a)) ?? 4)
const KEY = process.env.TEST_PUBLISHABLE_KEY

if (/medusa-backend-sg-production/.test(BACKEND)) {
  console.error("Refusing to place test orders on the live shop.")
  process.exit(1)
}
if (!KEY) {
  console.error("Set TEST_PUBLISHABLE_KEY to the test backend's publishable key.")
  process.exit(1)
}

async function call(method, path, body) {
  const res = await fetch(`${BACKEND}${path}`, {
    method,
    headers: { "x-publishable-api-key": KEY, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(json).slice(0, 300)}`)
  return json
}

const PEOPLE = [
  ["Fatima", "Al-Kuwari", "+97455501234", "Al Sadd", "Happy birthday, Mama. All my love."],
  ["Ahmed", "Hassan", "+97455502345", "West Bay", ""],
  ["Noor", "Saleh", "+97455503456", "Lusail", "Congratulations on the new baby!"],
  ["Sara", "Mahmoud", "+97455504567", "The Pearl", "Sorry I missed it. See you soon x"],
  ["Omar", "Khalid", "+97455505678", "Al Wakrah", ""],
]
const WINDOWS = ["10am - 12pm", "2pm - 4pm", "4pm - 6pm", "6pm - 8pm"]

const day = (offset) => {
  const d = new Date(Date.now() + offset * 86400000)
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Qatar" })
}

const { regions } = await call("GET", "/store/regions")
const region = regions.find((r) => r.currency_code === "qar") ?? regions[0]
const { products } = await call("GET", `/store/products?limit=40&region_id=${region.id}&fields=id,title,*variants`)

for (let i = 0; i < COUNT; i++) {
  const [first, last, phone, area, note] = PEOPLE[i % PEOPLE.length]
  const product = products[(i * 7) % products.length]
  const { cart } = await call("POST", "/store/carts", {
    region_id: region.id,
    email: `test-${phone.slice(-4)}@example.com`,
    shipping_address: { first_name: first, last_name: last, phone, address_1: `${area}, test address`, city: "Doha", country_code: "qa" },
    metadata: {
      contact_name: `${first} ${last}`,
      contact_phone: phone,
      delivery_date: day(i % 2),
      delivery_window: WINDOWS[i % WINDOWS.length],
      delivery_area: area,
    },
  })
  await call("POST", `/store/carts/${cart.id}/line-items`, {
    variant_id: product.variants[0].id,
    quantity: 1,
    metadata: note ? { gift_note: note } : {},
  })
  const { shipping_options } = await call("GET", `/store/shipping-options?cart_id=${cart.id}`)
  const standard = shipping_options.find((o) => !/11[:.]59|midnight/i.test(o.name)) ?? shipping_options[0]
  await call("POST", `/store/carts/${cart.id}/shipping-methods`, { option_id: standard.id })
  const { payment_collection } = await call("POST", "/store/payment-collections", { cart_id: cart.id })
  await call("POST", `/store/payment-collections/${payment_collection.id}/payment-sessions`, { provider_id: "pp_system_default" })
  const done = await call("POST", `/store/carts/${cart.id}/complete`)
  console.log(`order #${done.order?.display_id ?? "?"}  ${first} ${last}  ${product.title}`)
}
