/**
 * The rest of the shop's admin, walked at phone size against a TEST backend:
 * categories, the homepage, delivery days, the spreadsheet and printing —
 * the jobs that used to need the full admin (moved into the app 13 Nov 2026).
 *
 * Same rules as journeys.spec.ts: never the live backend, every test cleans
 * up, and every result is checked through the admin API.
 */
import { expect, test, type Page } from "@playwright/test"
import ExcelJS from "exceljs"
import { readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

const BACKEND = process.env.SHOP_TEST_BACKEND || "http://localhost:9000"
const EMAIL = process.env.SHOP_TEST_EMAIL || "dev@local.test"
const PASSWORD = process.env.SHOP_TEST_PASSWORD || "local-dev-pass"

if (/medusa-backend-sg-production/.test(BACKEND)) {
  throw new Error("Journey tests change data. Never run them against the live backend.")
}

let token = ""
const stamp = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`

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

async function open(page: Page, path: string) {
  await page.addInitScript((t) => localStorage.setItem("tt_shop_token", t), token)
  await page.goto(path)
}

async function noSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow, "page must not scroll sideways").toBeLessThanOrEqual(0)
}

const categoryByName = async (name: string) => {
  const { product_categories } = await api("GET", "/admin/product-categories?limit=200&fields=id,name,handle,is_active,metadata")
  return product_categories.find((c: any) => c.name === name)
}

/* ------------------------------------------------------------ categories */

test("add a category with its Arabic name, move it, hide it, delete it", async ({ page }) => {
  const name = `E2E Cat ${stamp()}`
  await open(page, "/more")
  await page.getByRole("link", { name: /Categories/ }).click()
  await expect(page.getByRole("heading", { name: "Categories", level: 1 })).toBeVisible()
  await noSidewaysScroll(page)

  await page.getByRole("button", { name: "+ Add" }).first().click()
  await page.getByLabel("Name", { exact: true }).fill(name)
  await page.getByLabel("Name in Arabic").fill("فئة تجربة")
  await page.getByRole("button", { name: "Save" }).click()
  await expect(page.getByText(`${name} added.`, { exact: false })).toBeVisible()

  let cat = await categoryByName(name)
  try {
    expect(cat, "category exists in Medusa").toBeTruthy()
    expect(cat.metadata.name_ar).toBe("فئة تجربة")
    expect(cat.metadata.kind).toBe("type")
    expect(cat.is_active).toBe(true)

    // New categories land last; moving it up gives every category a position.
    await page.getByRole("button", { name: `Move ${name} up` }).click()
    await expect(page.getByText(`${name} moved.`)).toBeVisible()
    cat = await categoryByName(name)
    expect(typeof cat.metadata.position).toBe("number")

    await page.getByRole("button", { name: new RegExp(`^${name} [0-9]+ flowers`) }).click()
    await page.getByRole("switch", { name: "Show on the website" }).click()
    await page.getByRole("button", { name: "Save" }).click()
    await expect(page.getByText(`Changed category ${name}`, { exact: false }).or(page.getByText("Saved.", { exact: false }))).toBeVisible()
    expect((await categoryByName(name)).is_active).toBe(false)

    await page.getByRole("button", { name: new RegExp(`^${name} [0-9]+ flowers`) }).click()
    await page.getByRole("button", { name: "Delete this category" }).click()
    await page.getByRole("button", { name: "Delete", exact: true }).click()
    await expect(page.getByText(`${name} deleted.`, { exact: false })).toBeVisible()
    expect(await categoryByName(name)).toBeFalsy()
  } finally {
    const left = await categoryByName(name)
    if (left) await api("DELETE", `/admin/product-categories/${left.id}`).catch(() => undefined)
  }
})

test("the offers category cannot be deleted", async ({ page }) => {
  await open(page, "/more/categories")
  await page.getByRole("button", { name: /Black Friday|Offers|Hot Deal/ }).first().click()
  await expect(page.getByText("can't be deleted", { exact: false })).toBeVisible()
  await expect(page.getByRole("button", { name: "Delete this category" })).toHaveCount(0)
})

/* -------------------------------------------------------------- homepage */

test("add a row of flowers to the homepage, hide it, remove it", async ({ page }) => {
  const title = `E2E Rail ${stamp()}`
  const find = async () => (await api("GET", "/admin/homepage-sections")).sections.find((s: any) => s.title === title)
  await open(page, "/website")
  await page.getByRole("link", { name: "Homepage" }).click()
  await expect(page.getByRole("heading", { name: "Homepage", level: 1 })).toBeVisible()

  await page.getByRole("button", { name: "+ Add" }).click()
  await page.getByLabel(/Row of flowers from a category/).check()
  await page.getByLabel("Heading", { exact: true }).fill(title)
  await page.getByRole("combobox", { name: "Category" }).selectOption({ index: 1 })
  await page.getByRole("button", { name: "Save" }).click()
  await expect(page.getByText(`${title} added.`, { exact: false })).toBeVisible()

  try {
    const section = await find()
    expect(section?.type).toBe("category_rail")
    expect(section?.resource_handle).toBeTruthy()
    await noSidewaysScroll(page)

    await page.getByRole("switch", { name: `Show ${title}` }).click()
    await expect(page.getByText(`${title} hidden.`, { exact: false })).toBeVisible()
    expect((await find())?.enabled).toBe(false)

    await page.getByRole("button", { name: new RegExp(`^${title} `) }).click()
    await page.getByRole("button", { name: "Remove this block" }).click()
    await page.getByRole("button", { name: "Remove", exact: true }).click()
    await expect(page.getByText(`${title} removed.`, { exact: false })).toBeVisible()
    expect(await find()).toBeFalsy()
  } finally {
    const left = await find()
    if (left) await api("DELETE", `/admin/homepage-sections/${left.id}`).catch(() => undefined)
  }
})

/* --------------------------------------------------------- delivery days */

test("close a delivery day and open it again", async ({ page }) => {
  await open(page, "/more/delivery-days")
  await expect(page.getByRole("heading", { name: "Delivery days", level: 1 })).toBeVisible()
  await noSidewaysScroll(page)
  // Three weeks out: far from any real test order.
  const row = page.locator("li button").nth(21)
  const label = (await row.locator("span.font-medium").first().textContent())!.trim()
  const date = await page.evaluate((n) => {
    const d = new Date(`${new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Qatar" })}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() + n)
    return d.toISOString().slice(0, 10)
  }, 21)
  const before = (await api("GET", "/admin/delivery-days")).days.find((d: any) => d.date === date)

  try {
    await row.click()
    await page.getByRole("switch", { name: "Closed" }).click()
    await page.getByLabel("Note for yourself").fill("E2E closed")
    await page.getByRole("button", { name: "Save" }).click()
    await expect(page.getByText(`${label} closed`, { exact: false })).toBeVisible()
    const day = (await api("GET", "/admin/delivery-days")).days.find((d: any) => d.date === date)
    expect(day?.closed).toBe(true)
    await expect(row).toContainText("Closed")
  } finally {
    await api("POST", "/admin/delivery-days", {
      date,
      closed: before?.closed ?? false,
      max_orders: before?.max_orders ?? null,
      max_per_window: before?.max_per_window ?? null,
      note: before?.note ?? null,
    })
  }
})

/* ----------------------------------------------------------- spreadsheet */

test("download the sample sheet, fill it in, see the check, apply it", async ({ page }) => {
  const name = `E2E Sheet ${stamp()}`
  await open(page, "/more")
  await page.getByRole("link", { name: /Spreadsheet/ }).click()
  await noSidewaysScroll(page)

  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /blank|sample/i }).first().click()])
  expect(download.suggestedFilename()).toBe("tulips-and-truffles-products.xlsx")
  const blank = join(tmpdir(), `blank-${stamp()}.xlsx`)
  await download.saveAs(blank)

  // Fill one row the way the florist would: name, price, a category tick.
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await readFile(blank))
  const ws = wb.worksheets[0]
  const col = (re: RegExp) => {
    let at = 0
    ws.getRow(1).eachCell((c, i) => {
      if (!at && re.test(String(c.value ?? ""))) at = i
    })
    expect(at, `sheet has a ${re} column`).toBeGreaterThan(0)
    return at
  }
  const row = ws.getRow(ws.rowCount + 1)
  row.getCell(col(/^Name/)).value = name
  row.getCell(col(/^Price/)).value = 279
  row.getCell(col(/Hand-Tied Bouquets/)).value = "✓"
  row.commit()
  const filled = join(tmpdir(), `filled-${stamp()}.xlsx`)
  await writeFile(filled, Buffer.from(await wb.xlsx.writeBuffer()))

  await page.getByLabel("Spreadsheet file").setInputFiles(filled)
  await expect(page.getByText("Before anything is saved", { exact: false })).toBeVisible()
  await expect(page.getByText(name).first()).toBeVisible()
  const findProduct = async () =>
    (await api("GET", `/admin/products?q=${encodeURIComponent(name)}&fields=id,title,status,categories.handle`)).products.find((p: any) => p.title === name)
  expect(await findProduct(), "nothing is written before Apply").toBeFalsy()

  try {
    await page.getByRole("button", { name: /^Apply: add 1/ }).click()
    await expect.poll(findProduct, { timeout: 30_000 }).toBeTruthy()
    const p = await findProduct()
    expect(p.categories.map((c: any) => c.handle)).toContain("bouquets")

    const [all] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /all flowers/i }).click()])
    expect(all.suggestedFilename()).toMatch(/^tulips-and-truffles-all-flowers-\d{4}-\d{2}-\d{2}\.xlsx$/)
  } finally {
    const p = await findProduct()
    if (p) await api("DELETE", `/admin/products/${p.id}`).catch(() => undefined)
  }
})

/* --------------------------------------------------------------- printing */

test("print a sample gift card with any message", async ({ page }) => {
  await open(page, "/more/printing")
  await expect(page.getByRole("heading", { name: "Printing", level: 1 })).toBeVisible()
  await noSidewaysScroll(page)
  await page.getByLabel("Message").fill("E2E: with love from the shop")
  const [popup] = await Promise.all([page.waitForEvent("popup"), page.getByRole("button", { name: "Print sample card" }).click()])
  await expect(popup.locator("p.message")).toContainText("E2E: with love from the shop")
  await popup.close()
})
