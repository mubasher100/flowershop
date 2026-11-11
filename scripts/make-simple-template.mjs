/**
 * The simple product sheet: one row per flower, typed by hand.
 *
 * The full template (make-product-template.mjs) asks for flower variety,
 * colour, stems and three categories. This one asks only what the shop's
 * admin actually types — photo, name, price, whether it is on offer, the
 * offer price, a category and a description — with English and Arabic on
 * every heading. Everything else (the product id, handle, sizes, inventory)
 * is made by the import, the same way the admin dashboard makes it.
 *
 * It imports with the same command as the full one:
 *   node scripts/import-products.mjs <filled-in sheet> [--apply]
 *
 * The category dropdown is the live shop's own list, read from the Store API
 * when the sheet is made, so it can never offer a category that does not
 * exist. Offers is left out on purpose: "On offer? Yes" puts a flower there.
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

async function liveCategories() {
  const key = publishableKey()
  if (!key) throw new Error("No publishable key: set NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY.")
  const res = await fetch(
    `${BACKEND}/store/product-categories?limit=200&fields=name,handle`,
    { headers: { "x-publishable-api-key": key } }
  )
  if (!res.ok) throw new Error(`Could not read categories from ${BACKEND}: ${res.status}`)
  const { product_categories } = await res.json()
  // Kinds of arrangement first, then occasions, as the shop's menu has them.
  const OCCASIONS = new Set([
    "anniversary", "birthday", "congratulations", "get-well-soon", "new-baby",
    "thank-you", "love", "sympathy",
  ])
  const all = product_categories.filter((c) => c.handle !== "hot-deals")
  return [
    ...all.filter((c) => !OCCASIONS.has(c.handle)),
    ...all.filter((c) => OCCASIONS.has(c.handle)),
  ].map((c) => c.name)
}

const categories = await liveCategories()

const ROSE = "FF7B2340"
const BLUSH = "FFFBD7E2"
const PALE = "FFFFF7F9"

const COLUMNS = [
  {
    en: "Photo",
    ar: "الصورة",
    key: "photo",
    width: 26,
    note: "Paste the photo here: copy it, click this cell, paste. It only has to start in this row.\nالصق الصورة هنا: انسخها ثم اضغط على الخانة والصق.",
  },
  {
    en: "Name",
    ar: "اسم المنتج",
    key: "name",
    width: 30,
    required: true,
    note: "The name customers see, e.g. Fifty Red Roses.\nTwo rows with the same name become two sizes of one flower.\nالاسم الذي يراه العميل.",
  },
  {
    en: "Price (QAR)",
    ar: "السعر (ريال)",
    key: "price",
    width: 13,
    required: true,
    number: true,
    note: "The normal price. Just the number, ending in 9: 279, not 280 or 279 QAR.\nالسعر العادي، رقم فقط وينتهي بـ 9.",
  },
  {
    en: "On offer?",
    ar: "عليه عرض؟",
    key: "onOffer",
    width: 12,
    list: "yesno",
    note: "Yes = the flower is on offer: the normal price shows crossed out and it appears under Offers.\nنعم = عليه عرض.",
  },
  {
    en: "Offer price (QAR)",
    ar: "سعر العرض (ريال)",
    key: "offerPrice",
    width: 15,
    number: true,
    note: "Only when On offer is Yes: what the customer pays. Lower than the price.\nفقط إذا كان عليه عرض: السعر بعد الخصم.",
  },
  {
    en: "Category",
    ar: "الفئة",
    key: "cat1",
    width: 22,
    required: true,
    list: "categories",
    note: "Where it mainly lives on the website. Pick from the list.\nاختر من القائمة.",
  },
  {
    en: "Second category",
    ar: "فئة إضافية",
    key: "cat2",
    width: 22,
    list: "categories",
    note: "Optional — e.g. an occasion like Anniversary, so it shows there too.\nاختياري، مثل مناسبة.",
  },
  {
    en: "Description",
    ar: "الوصف",
    key: "description",
    width: 46,
    note: "Two or three sentences: what is in it and who it suits.\nجملتان أو ثلاث عن الباقة.",
  },
  {
    en: "Stock",
    ar: "الكمية",
    key: "stock",
    width: 10,
    number: true,
    note: "How many you can sell. Leave blank for 10.\nاتركها فارغة = ١٠.",
  },
  {
    en: "Size",
    ar: "المقاس",
    key: "size",
    width: 12,
    note: "Leave blank unless the flower comes in sizes. Then one row per size, same name, e.g. Small / Large.\nاتركه فارغاً إذا كان مقاساً واحداً.",
  },
  {
    en: "Show on website?",
    ar: "يظهر في الموقع؟",
    key: "publish",
    width: 14,
    list: "yesno",
    note: "Yes = on the website straight away. No = saved hidden, to check first. Blank = Yes.\nنعم = يظهر فوراً.",
  },
]

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
head.height = 44
COLUMNS.forEach((c, i) => {
  const cell = head.getCell(i + 1)
  // English first: the importer reads the first line of each heading.
  cell.value = `${c.en}${c.required ? " *" : ""}\n${c.ar}`
  cell.font = { bold: true, size: 11, color: { argb: ROSE } }
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUSH } }
  cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true }
  cell.border = { bottom: { style: "medium", color: { argb: ROSE } } }
  cell.note = { texts: [{ text: c.note }] }
})

/* ------------------------------------------------------------------- Lists */
const lists = wb.addWorksheet("Lists")
lists.state = "veryHidden"
lists.getColumn(1).values = ["Category", ...categories]
lists.getColumn(2).values = ["Yes/No", "Yes", "No"]
const RANGES = {
  categories: `Lists!$A$2:$A$${categories.length + 1}`,
  yesno: "Lists!$B$2:$B$3",
}

const col = (key) => ws.getColumn(COLUMNS.findIndex((c) => c.key === key) + 1).letter
const LAST = 301

for (let r = 2; r <= LAST; r++) {
  COLUMNS.forEach((c, i) => {
    const cell = ws.getRow(r).getCell(i + 1)
    cell.alignment = c.number
      ? { vertical: "middle", horizontal: "center" }
      : { vertical: "middle", wrapText: true }
    if (c.number) cell.numFmt = "0"
    if (c.list) {
      cell.dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [RANGES[c.list]],
        showErrorMessage: true,
        errorStyle: "warning",
        errorTitle: "Pick from the list",
        error: "Please choose from the dropdown. — اختر من القائمة",
      }
    }
  })
  // Soft checks: a warning, never a refusal.
  ws.getCell(`${col("price")}${r}`).dataValidation = {
    type: "custom",
    allowBlank: true,
    formulae: [`AND(ISNUMBER(${col("price")}${r}),${col("price")}${r}>0,MOD(${col("price")}${r},10)<>0)`],
    showErrorMessage: true,
    errorStyle: "warning",
    errorTitle: "Check the price",
    error: "Just the number, ending in 9 — e.g. 279. — رقم فقط وينتهي بـ 9",
  }
  ws.getCell(`${col("offerPrice")}${r}`).dataValidation = {
    type: "custom",
    allowBlank: true,
    formulae: [`AND(ISNUMBER(${col("offerPrice")}${r}),${col("offerPrice")}${r}<${col("price")}${r})`],
    showErrorMessage: true,
    errorStyle: "warning",
    errorTitle: "Check the offer price",
    error: "The offer price must be lower than the price. — سعر العرض أقل من السعر",
  }
  ws.getCell(`${col("stock")}${r}`).dataValidation = {
    type: "whole",
    operator: "greaterThanOrEqual",
    allowBlank: true,
    formulae: [0],
    showErrorMessage: true,
    errorStyle: "warning",
    error: "A whole number, like 10. — رقم صحيح",
  }
}

// "On offer? Yes" with no offer price: the cell that needs filling turns pink.
// Added first, so it outranks the striping below.
ws.addConditionalFormatting({
  ref: `${col("offerPrice")}2:${col("offerPrice")}${LAST}`,
  rules: [
    {
      type: "expression",
      formulae: [`AND(${col("onOffer")}2="Yes",${col("offerPrice")}2="")`],
      style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFF8B4C8" } } },
    },
  ],
})

// Every other row a faint blush, so a long sheet stays easy to follow.
ws.addConditionalFormatting({
  ref: `A2:${col("publish")}${LAST}`,
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
ex.values = {
  photo: "(paste photo here)",
  name: "EXAMPLE — Fifty Red Roses",
  price: 499,
  onOffer: "Yes",
  offerPrice: 449,
  cat1: categories.includes("50 Roses") ? "50 Roses" : categories[0],
  cat2: categories.includes("Anniversary") ? "Anniversary" : "",
  description:
    "Fifty long-stem red roses, hand-tied and wrapped in black. The one to send when the message matters.",
  stock: 10,
  publish: "Yes",
}
ex.font = { italic: true, color: { argb: "FF8A7A80" } }

/* ------------------------------------------------------------ Instructions */
const how = wb.addWorksheet("How to use — طريقة الاستخدام")
how.getColumn(1).width = 100
const LINES = [
  ["h", "Adding flowers — 5 steps"],
  ["p", "1.  Go to the Products tab. One row = one flower. The grey row is an example; the import skips it."],
  ["p", "2.  Paste the photo into the Photo cell: copy the picture, click the cell, paste. It only has to start in the right row."],
  ["p", "3.  Type the name, the price (a number ending in 9, like 279) and pick a category from the dropdown."],
  ["p", "4.  On offer? Choose Yes and type the offer price. The website shows the normal price crossed out and puts the flower under Offers. No or blank = not on offer."],
  ["p", "5.  Save and send the file back. Columns with * are required; the rest can stay empty."],
  ["h2", "Good to know"],
  ["p", "•  The product code, web address and stock records are made automatically — don't add them."],
  ["p", "•  Same name on two rows + a Size on each = one flower with a size choice, each size its own price."],
  ["p", "•  Sending a flower that already exists (same name) updates it: price, offer, photo, description and categories."],
  ["p", "•  Deleting a row here never deletes anything from the website. Hide a flower from the admin instead."],
  ["p", "•  Stock blank = 10 for a new flower, and leaves an existing flower's count as it is."],
  ["h", "إضافة الزهور — ٥ خطوات"],
  ["p", "١.  افتح ورقة Products. كل صف = منتج واحد. الصف الرمادي مثال ولن يُستورد."],
  ["p", "٢.  الصق الصورة في خانة الصورة: انسخ الصورة، اضغط على الخانة، ثم الصق."],
  ["p", "٣.  اكتب الاسم والسعر (رقم ينتهي بـ 9 مثل 279) واختر الفئة من القائمة."],
  ["p", "٤.  عليه عرض؟ اختر Yes واكتب سعر العرض. سيظهر السعر العادي مشطوباً ويُضاف المنتج إلى العروض."],
  ["p", "٥.  احفظ الملف وأرسله. الخانات التي عليها * إلزامية، والباقي اختياري."],
  ["p", "•  رقم المنتج ورابطه يُنشآن تلقائياً، لا داعي لإضافتهما."],
  ["p", "•  نفس الاسم في صفين مع مقاس لكل صف = منتج واحد بمقاسين."],
  ["p", "•  حذف صف من هذا الملف لا يحذف شيئاً من الموقع."],
]
LINES.forEach(([kind, text], i) => {
  const row = how.getRow(i + 1)
  const cell = row.getCell(1)
  cell.value = text
  const arabic = /[؀-ۿ]/.test(text)
  cell.alignment = {
    wrapText: true,
    vertical: "middle",
    ...(arabic ? { horizontal: "right", readingOrder: "rtl" } : {}),
  }
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
console.log(`Wrote ${path.relative(ROOT, OUT)} — ${categories.length} categories in the dropdown`)
