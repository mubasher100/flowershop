/**
 * The simple product sheet: one row per flower, typed by hand.
 *
 * The full template (make-product-template.mjs) asks for flower variety,
 * colour, stems and three category dropdowns. This one asks only what the
 * shop's admin actually types — photo, name, price, whether it is on offer,
 * the offer price and a description — and then has a tick column for every
 * category, so a flower can go in as many as it belongs to. Everything else
 * (the product id, handle, sizes, inventory) is made by the import, the same
 * way the admin dashboard makes it.
 *
 * It imports with the same command as the full one:
 *   node scripts/import-products.mjs <filled-in sheet> [--apply]
 * which treats any column headed with a category's name as a tick column.
 *
 * The category columns are the live shop's own list, read from the Store API
 * when the sheet is made, so the sheet can never offer a category that does
 * not exist. Offers is left out on purpose: "On offer? Yes" puts a flower
 * there.
 *
 *   node scripts/make-simple-template.mjs
 *   -> tulips-and-truffles-products.xlsx in the repo root
 */
import ExcelJS from "exceljs"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

const ROOT = path.resolve(import.meta.dirname, "..")
const OUT = path.join(ROOT, "tulips-and-truffles-products.xlsx")
const BACKEND =
  process.env.IMPORT_BACKEND_URL || "https://medusa-backend-sg-production.up.railway.app"

/** The storefront's publishable key — a public value, sent with every page. */
function publishableKey() {
  if (process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY) {
    return process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
  }
  const env = path.join(ROOT, "apps/storefront/.env.local")
  if (!existsSync(env)) return null
  const m = /^NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=(.*)$/m.exec(readFileSync(env, "utf8"))
  return m?.[1].trim().replace(/^["']|["']$/g, "") ?? null
}

/** Seasonal first, then kinds of arrangement, then occasions. */
async function liveCategories() {
  const key = publishableKey()
  if (!key) throw new Error("No publishable key: set NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY.")
  const res = await fetch(
    `${BACKEND}/store/product-categories?limit=200&fields=name,handle`,
    { headers: { "x-publishable-api-key": key } }
  )
  if (!res.ok) throw new Error(`Could not read categories from ${BACKEND}: ${res.status}`)
  const { product_categories } = await res.json()
  const OCCASIONS = new Set([
    "anniversary", "birthday", "congratulations", "get-well-soon", "new-baby",
    "thank-you", "love", "sympathy",
  ])
  const all = product_categories.filter((c) => c.handle !== "hot-deals")
  const rank = (c) => (c.handle === "black-friday" ? 0 : OCCASIONS.has(c.handle) ? 2 : 1)
  return all.sort((a, b) => rank(a) - rank(b)).map((c) => c.name)
}

const categories = await liveCategories()

const ROSE = "FF7B2340"
const BLUSH = "FFFBD7E2"
const PALE = "FFFFF7F9"
const TICK = "✓"

const FIELDS = [
  {
    header: "Photo",
    key: "photo",
    width: 26,
    note: "Paste the photo here: copy it, click this cell, paste. It only has to start in this row.",
  },
  {
    header: "Name",
    key: "name",
    width: 30,
    required: true,
    note: "The name customers see, e.g. Fifty Red Roses.\nTwo rows with the same name become two sizes of one flower.",
  },
  {
    header: "Price (QAR)",
    key: "price",
    width: 13,
    required: true,
    number: true,
    note: "The normal price. Just the number, ending in 9: 279, not 280 or 279 QAR.",
  },
  {
    header: "On offer?",
    key: "onOffer",
    width: 11,
    list: "yesno",
    note: "Yes = on offer: the normal price shows crossed out and the flower appears under Offers.",
  },
  {
    header: "Offer price (QAR)",
    key: "offerPrice",
    width: 14,
    number: true,
    note: "Only when On offer is Yes: what the customer pays. Lower than the price.",
  },
  {
    header: "Description",
    key: "description",
    width: 46,
    note: "Two or three sentences: what is in it and who it suits.",
  },
]

const TRAILING = [
  {
    header: "Stock",
    key: "stock",
    width: 9,
    number: true,
    note: "How many you can sell. Leave blank for 10.",
  },
  {
    header: "Size",
    key: "size",
    width: 11,
    note: "Leave blank unless the flower comes in sizes. Then one row per size, same name, e.g. Small / Large.",
  },
  {
    header: "Show on website?",
    key: "publish",
    width: 13,
    list: "yesno",
    note: "Yes = on the website straight away. No = saved hidden, to check first. Blank = Yes.",
  },
]

const CATEGORY_COLUMNS = categories.map((name, i) => ({
  header: name,
  key: `cat_${i}`,
  width: 6.5,
  tick: true,
  note: `Tick (${TICK}) to put the flower in ${name}. Tick as many categories as fit — at least one.`,
}))

const COLUMNS = [...FIELDS, ...CATEGORY_COLUMNS, ...TRAILING]

const wb = new ExcelJS.Workbook()
wb.creator = "Tulips and Truffles"
wb.created = new Date()

/* ---------------------------------------------------------------- Products */
const ws = wb.addWorksheet("Products", {
  views: [{ state: "frozen", ySplit: 1, xSplit: 2 }],
  properties: { defaultRowHeight: 110 },
})
ws.columns = COLUMNS.map((c) => ({ key: c.key, width: c.width }))

const head = ws.getRow(1)
head.height = 120 // room for the category names, which run upwards
COLUMNS.forEach((c, i) => {
  const cell = head.getCell(i + 1)
  cell.value = `${c.header}${c.required ? " *" : ""}`
  cell.font = { bold: true, size: 11, color: { argb: c.tick ? "FF3F5A40" : ROSE } }
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: c.tick ? "FFE4EEE2" : BLUSH },
  }
  cell.alignment = c.tick
    ? { textRotation: 90, vertical: "bottom", horizontal: "center", wrapText: true }
    : { vertical: "middle", horizontal: "center", wrapText: true }
  cell.border = { bottom: { style: "medium", color: { argb: ROSE } } }
  cell.note = { texts: [{ text: c.note }] }
})

/* ------------------------------------------------------------------- Lists */
const lists = wb.addWorksheet("Lists")
lists.state = "veryHidden"
lists.getColumn(1).values = ["Yes/No", "Yes", "No"]
lists.getColumn(2).values = ["Tick", TICK]
const RANGES = { yesno: "Lists!$A$2:$A$3", tick: "Lists!$B$2:$B$2" }

const letter = (key) => ws.getColumn(COLUMNS.findIndex((c) => c.key === key) + 1).letter
const firstCat = letter(CATEGORY_COLUMNS[0].key)
const lastCat = letter(CATEGORY_COLUMNS[CATEGORY_COLUMNS.length - 1].key)
const LAST = 301

for (let r = 2; r <= LAST; r++) {
  COLUMNS.forEach((c, i) => {
    const cell = ws.getRow(r).getCell(i + 1)
    cell.alignment = c.number || c.tick
      ? { vertical: "middle", horizontal: "center" }
      : { vertical: "middle", wrapText: true }
    if (c.number) cell.numFmt = "0"
    if (c.tick) {
      cell.font = { bold: true, size: 16, color: { argb: "FF3F5A40" } }
      cell.border = { left: { style: "hair", color: { argb: "FFD9C9CF" } } }
    }
    if (c.list || c.tick) {
      cell.dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [RANGES[c.tick ? "tick" : c.list]],
        showErrorMessage: true,
        // A warning, not a refusal: an "x" typed in a tick column still counts.
        errorStyle: "warning",
        errorTitle: c.tick ? "Tick" : "Pick from the list",
        error: c.tick ? `Pick ${TICK} from the dropdown, or leave it empty.` : "Please choose from the dropdown.",
      }
    }
  })
  const p = `${letter("price")}${r}`
  ws.getCell(p).dataValidation = {
    type: "custom",
    allowBlank: true,
    formulae: [`AND(ISNUMBER(${p}),${p}>0,MOD(${p},10)<>0)`],
    showErrorMessage: true,
    errorStyle: "warning",
    errorTitle: "Check the price",
    error: "Just the number, ending in 9 — e.g. 279.",
  }
  const o = `${letter("offerPrice")}${r}`
  ws.getCell(o).dataValidation = {
    type: "custom",
    allowBlank: true,
    formulae: [`AND(ISNUMBER(${o}),${o}<${p})`],
    showErrorMessage: true,
    errorStyle: "warning",
    errorTitle: "Check the offer price",
    error: "The offer price must be lower than the price.",
  }
  ws.getCell(`${letter("stock")}${r}`).dataValidation = {
    type: "whole",
    operator: "greaterThanOrEqual",
    allowBlank: true,
    formulae: [0],
    showErrorMessage: true,
    errorStyle: "warning",
    error: "A whole number, like 10.",
  }
}

// Highlights, most important first (the first matching rule's fill wins).
// "On offer? Yes" with no offer price: the cell that needs filling turns pink.
ws.addConditionalFormatting({
  ref: `${letter("offerPrice")}2:${letter("offerPrice")}${LAST}`,
  rules: [
    {
      type: "expression",
      formulae: [`AND(${letter("onOffer")}2="Yes",${letter("offerPrice")}2="")`],
      style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFF8B4C8" } } },
    },
  ],
})
// A ticked category turns green, so a row's categories read at a glance.
ws.addConditionalFormatting({
  ref: `${firstCat}2:${lastCat}${LAST}`,
  rules: [
    {
      type: "expression",
      formulae: [`${firstCat}2<>""`],
      style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFCFE3CC" } } },
    },
  ],
})
// A named flower with no category ticked: its name turns pink.
ws.addConditionalFormatting({
  ref: `${letter("name")}2:${letter("name")}${LAST}`,
  rules: [
    {
      type: "expression",
      formulae: [`AND(${letter("name")}2<>"",COUNTA(${firstCat}2:${lastCat}2)=0)`],
      style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFF8B4C8" } } },
    },
  ],
})
// Every other row a faint blush, so a long sheet stays easy to follow.
ws.addConditionalFormatting({
  ref: `A2:${letter("publish")}${LAST}`,
  rules: [
    {
      type: "expression",
      formulae: ["MOD(ROW(),2)=1"],
      style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: PALE } } },
    },
  ],
})

/* ----------------------------------------------------------- Worked example */
const ex = ws.getRow(2)
const tickFor = (name) => {
  const i = categories.indexOf(name)
  return i >= 0 ? { [`cat_${i}`]: TICK } : {}
}
ex.values = {
  photo: "(paste photo here)",
  name: "EXAMPLE — Fifty Red Roses",
  price: 499,
  onOffer: "Yes",
  offerPrice: 449,
  description:
    "Fifty long-stem red roses, hand-tied and wrapped in black. The one to send when the message matters.",
  ...tickFor("50 Roses"),
  ...tickFor("Black Friday"),
  ...tickFor("Anniversary"),
  stock: 10,
  publish: "Yes",
}
ex.font = { italic: true, color: { argb: "FF8A7A80" } }

/* ------------------------------------------------------------ Instructions */
const how = wb.addWorksheet("How to use")
how.getColumn(1).width = 100
const LINES = [
  ["h", "Adding flowers — 5 steps"],
  ["p", "1.  Go to the Products tab. One row = one flower. The grey row is an example; the import skips it."],
  ["p", "2.  Paste the photo into the Photo cell: copy the picture, click the cell, paste. It only has to start in the right row."],
  ["p", "3.  Type the name and the price (a number ending in 9, like 279), and a short description."],
  ["p", `4.  Tick the categories it belongs in: click the cell under each one and choose ${TICK} (typing x works too). Tick as many as fit — at least one. A ticked cell turns green; a name with nothing ticked turns pink.`],
  ["p", "5.  On offer? Choose Yes and type the offer price. The website shows the normal price crossed out and puts the flower under Offers. For Black Friday, put it on offer and tick Black Friday too."],
  ["p", "Save and send the file back. Columns with * are required; the rest can stay empty."],
  ["h2", "Good to know"],
  ["p", "•  The product code, web address and stock records are made automatically — don't add them."],
  ["p", "•  Same name on two rows + a Size on each = one flower with a size choice, each size its own price."],
  ["p", "•  Sending a flower that already exists (same name) updates it: price, offer, photo, description and categories."],
  ["p", "•  Deleting a row here never deletes anything from the website. Hide a flower from the admin instead."],
  ["p", "•  Stock blank = 10 for a new flower, and leaves an existing flower's count as it is."],
]
LINES.forEach(([kind, text], i) => {
  const row = how.getRow(i + 1)
  const cell = row.getCell(1)
  cell.value = text
  cell.alignment = { wrapText: true, vertical: "middle" }
  if (kind === "h") {
    cell.font = { bold: true, size: 16, color: { argb: ROSE } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUSH } }
    row.height = 34
  } else if (kind === "h2") {
    cell.font = { bold: true, size: 12, color: { argb: ROSE } }
    row.height = 26
  } else {
    cell.font = { size: 12 }
    row.height = Math.max(22, Math.ceil(text.length / 90) * 17 + 6)
  }
})

wb.views = [{ activeTab: 0 }]
await wb.xlsx.writeFile(OUT)
console.log(`Wrote ${path.relative(ROOT, OUT)} — ${categories.length} category tick columns`)
