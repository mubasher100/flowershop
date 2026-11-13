/**
 * The florist's journeys, walked at phone size against a TEST backend.
 *
 *   SHOP_TEST_EMAIL / SHOP_TEST_PASSWORD  an admin on that backend
 *   SHOP_TEST_BACKEND                     default http://localhost:9000
 *
 * Every test cleans up after itself, and checks the result through the admin
 * API, not just the screen, so "it said Saved" is never mistaken for "it saved".
 */
import { expect, test, type Page } from "@playwright/test"

const BACKEND = process.env.SHOP_TEST_BACKEND || "http://localhost:9000"
const EMAIL = process.env.SHOP_TEST_EMAIL || "dev@local.test"
const PASSWORD = process.env.SHOP_TEST_PASSWORD || "local-dev-pass"

if (/medusa-backend-sg-production/.test(BACKEND)) {
  throw new Error("Journey tests change data. Never run them against the live backend.")
}

let token = ""

async function api<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BACKEND}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(json).slice(0, 200)}`)
  return json as T
}

test.beforeAll(async () => {
  const res = await fetch(`${BACKEND}/auth/user/emailpass`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  token = (await res.json()).token
  expect(token, "test admin can sign in").toBeTruthy()
})

/** Signed in, without walking the form every time. */
async function open(page: Page, path: string) {
  await page.addInitScript((t) => localStorage.setItem("tt_shop_token", t), token)
  await page.goto(path)
}

async function noSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow, "page must not scroll sideways").toBeLessThanOrEqual(0)
}

async function makeFlower(title: string, price = 279) {
  const { product_categories } = await api("GET", "/admin/product-categories?limit=50&fields=id,handle")
  const bouquets = product_categories.find((c: any) => c.handle === "bouquets")
  const { product } = await api("POST", "/admin/quick-products", {
    title,
    price,
    stock: 10,
    categoryIds: bouquets ? [bouquets.id] : [],
    publish: true,
  })
  return product.id as string
}

const productOf = (id: string) =>
  api("GET", `/admin/products/${id}?fields=id,title,status,categories.handle,variants.id,variants.inventory_items.inventory.stocked_quantity`).then(
    (r) => r.product
  )

const deleteQuietly = (id: string) => api("DELETE", `/admin/products/${id}`).catch(() => undefined)

/* ---------------------------------------------------------------- sign in */

test("signs in with email and password, and lands on Orders", async ({ page }) => {
  await page.goto("/")
  await page.getByLabel("Email", { exact: true }).fill(EMAIL)
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible()
  await noSidewaysScroll(page)
})

test("a wrong password says so", async ({ page }) => {
  await page.goto("/")
  await page.getByLabel("Email", { exact: true }).fill(EMAIL)
  await page.getByLabel("Password", { exact: true }).fill("wrong-password")
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page.getByRole("alert")).toContainText("don't match")
})

/* ---------------------------------------------------------------- flowers */

test("every tab fits a phone screen", async ({ page }) => {
  await open(page, "/flowers")
  await expect(page.getByRole("list", { name: "Flowers" })).toBeVisible()
  for (const tab of ["Orders", "Flowers", "Website", "More"]) {
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: tab }).click()
    await expect(page.getByRole("heading", { name: tab, level: 1 })).toBeVisible()
    await noSidewaysScroll(page)
  }
})

test("hide a flower with its switch, then show it again", async ({ page }) => {
  const id = await makeFlower(`E2E Hide ${Date.now()}`)
  try {
    const { title } = await productOf(id)
    await open(page, "/flowers")
    await page.getByLabel("Search flowers").fill(title)
    const toggle = page.getByRole("switch", { name: `Show ${title} on the website` })
    await expect(toggle).toHaveAttribute("aria-checked", "true")
    await toggle.click()
    await expect(page.getByRole("status")).toContainText("is hidden")
    await expect(page.getByRole("status")).toContainText("On the website by")
    await expect.poll(async () => (await productOf(id)).status).toBe("draft")
    await toggle.click()
    await expect.poll(async () => (await productOf(id)).status).toBe("published")
  } finally {
    await deleteQuietly(id)
  }
})

test("add a flower, on offer, and it is saved with an offer price", async ({ page }) => {
  const title = `E2E Add ${Date.now()}`
  await open(page, "/flowers")
  await page.getByRole("button", { name: "+ Add flower" }).click()
  const sheet = page.getByRole("dialog", { name: "Add a flower" })
  await sheet.getByLabel("Name").fill(title)
  await sheet.getByLabel("Price (QAR)").fill("299")
  await sheet.getByLabel("Can sell").fill("6")
  await sheet.getByRole("switch", { name: "On offer" }).click()
  await sheet.getByLabel("Offer price (QAR)").fill("249")
  // The offers category is not a tick box any more; it follows the switch.
  await expect(sheet.getByRole("button", { name: /^(Offers|Black Friday)$/ })).toHaveCount(0)
  await sheet.getByRole("button", { name: "Flowers in Vases" }).click()
  await noSidewaysScroll(page)
  await sheet.getByRole("button", { name: "Save and put on sale" }).click()
  await expect(page.getByRole("status")).toContainText(`${title} added`)

  const { products } = await api("GET", `/admin/products?q=${encodeURIComponent(title)}&fields=id,title,categories.handle`)
  const created = products.find((p: any) => p.title === title)
  try {
    const handles = created.categories.map((c: any) => c.handle)
    expect(handles).toContain("vases")
    expect(handles).toContain("hot-deals")
    const prices = await api("GET", "/admin/shop-prices")
    const { product } = await api("GET", `/admin/products/${created.id}?fields=variants.id`)
    const p = prices.prices[product.variants[0].id]
    expect(p.base).toBe(299)
    expect(p.sale).toBe(249)
  } finally {
    await deleteQuietly(created.id)
  }
})

test("an offer price above the normal price is refused before saving", async ({ page }) => {
  await open(page, "/flowers")
  await page.getByRole("button", { name: "+ Add flower" }).click()
  const sheet = page.getByRole("dialog", { name: "Add a flower" })
  await sheet.getByLabel("Name").fill("E2E Never Saved")
  await sheet.getByLabel("Price (QAR)").fill("199")
  await sheet.getByRole("switch", { name: "On offer" }).click()
  await sheet.getByLabel("Offer price (QAR)").fill("249")
  await sheet.getByRole("button", { name: "Save and put on sale" }).click()
  await expect(sheet.getByRole("alert")).toContainText("below the normal price")
})

test("select several flowers: set stock, put on offer, add to a category, delete", async ({ page }) => {
  const stamp = Date.now()
  const ids = [await makeFlower(`E2E Bulk A ${stamp}`, 279), await makeFlower(`E2E Bulk B ${stamp}`, 399)]
  try {
    await open(page, "/flowers")
    await page.getByLabel("Search flowers").fill(`${stamp}`)
    await page.getByRole("button", { name: "Select", exact: true }).click()
    await page.getByRole("button", { name: /Select all 2/ }).click()
    await expect(page.getByText("2 selected")).toBeVisible()
    const bar = page.getByRole("toolbar", { name: "Change 2 selected" })
    await noSidewaysScroll(page)

    // Stock: set to 7 each.
    await bar.getByRole("button", { name: "Stock" }).click()
    let sheet = page.getByRole("dialog")
    await sheet.getByLabel("How many each can sell").fill("7")
    await sheet.getByRole("button", { name: "Apply to 2 flowers" }).click()
    await expect(page.getByRole("status").first()).toContainText("Stock set to 7")
    for (const id of ids) {
      await expect
        .poll(async () => (await productOf(id)).variants[0].inventory_items[0].inventory.stocked_quantity)
        .toBe(7)
    }

    // Offer: 20% off, rounded down to end in 9.
    await page.getByRole("button", { name: "Select", exact: true }).click()
    await page.getByRole("button", { name: /Select all 2/ }).click()
    await bar.getByRole("button", { name: "Offer" }).click()
    sheet = page.getByRole("dialog")
    await sheet.getByRole("button", { name: "20%" }).click()
    await sheet.getByRole("button", { name: "Put 2 flowers on offer" }).click()
    await expect(page.getByRole("status").first()).toContainText("20% offer")
    const prices = await api("GET", "/admin/shop-prices")
    const sales = []
    for (const id of ids) {
      const { product } = await api("GET", `/admin/products/${id}?fields=variants.id`)
      sales.push(prices.prices[product.variants[0].id].sale)
    }
    expect(sales.sort()).toEqual([219, 319])
    // On offer is the one switch: both are now in the offers category
    // (Black Friday on the website) without anyone ticking it.
    for (const id of ids) {
      await expect
        .poll(async () => (await productOf(id)).categories.map((c: any) => c.handle))
        .toContain("hot-deals")
    }

    // Category: add both to Table Arrangements. The offers category is not
    // offered as a choice; it follows the offer.
    await page.getByRole("button", { name: "Select", exact: true }).click()
    await page.getByRole("button", { name: /Select all 2/ }).click()
    await bar.getByRole("button", { name: "Category" }).click()
    sheet = page.getByRole("dialog")
    await expect(sheet.getByRole("radio", { name: /Offers|Black Friday/ })).toHaveCount(0)
    await sheet.getByRole("radio", { name: "Table Arrangements" }).click()
    await sheet.getByRole("button", { name: "Apply to 2 flowers" }).click()
    for (const id of ids) {
      await expect
        .poll(async () => (await productOf(id)).categories.map((c: any) => c.handle))
        .toContain("table-arrangements")
    }

    // Delete both.
    await page.getByRole("button", { name: "Select", exact: true }).click()
    await page.getByRole("button", { name: /Select all 2/ }).click()
    await bar.getByRole("button", { name: "Delete" }).click()
    await page.getByRole("dialog").getByRole("button", { name: "Delete 2 flowers" }).click()
    await expect(page.getByText("No flowers match")).toBeVisible()
  } finally {
    for (const id of ids) await deleteQuietly(id)
  }
})

test("the Website tab counts down to when changes are live", async ({ page }) => {
  const id = await makeFlower(`E2E Timer ${Date.now()}`)
  try {
    const { title } = await productOf(id)
    await open(page, "/flowers")
    await page.getByLabel("Search flowers").fill(title)
    await page.getByRole("switch", { name: `Show ${title} on the website` }).click()
    await expect(page.getByRole("status")).toContainText("On the website by")
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Website" }).click()
    await expect(page.getByText("1 change on the way")).toBeVisible()
    await expect(page.getByText(`Hid ${title}`)).toBeVisible()
  } finally {
    await deleteQuietly(id)
  }
})
