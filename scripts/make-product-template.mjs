/**
 * Writes the spreadsheet the florist fills in to add products.
 *
 * Why a spreadsheet at all: the admin dashboard adds one product at a time
 * through six screens, which is fine for an edit and hopeless for a hundred
 * new arrangements. Medusa's own CSV import takes image *URLs*, and a florist
 * photographing bouquets on a phone has files, not URLs — so the photos are
 * pasted into the sheet and scripts/import-products.mjs pulls them out.
 *
 * Categories, flower varieties and colours come from
 * apps/backend/src/lib/catalogue-taxonomy.ts and are locked to dropdowns.
 * Free text there produces a sheet nothing can group: "Vendala", "vendela"
 * and "white rose" are one flower, and no amount of importing fixes it after
 * the fact.
 *
 *   node scripts/make-product-template.mjs
 *   -> product-import-template.xlsx in the repo root
 */
import ExcelJS from "exceljs"
import { readFileSync } from "node:fs"
import path from "node:path"

const ROOT = path.resolve(import.meta.dirname, "..")
const OUT = path.join(ROOT, "product-import-template.xlsx")

/**
 * The taxonomy is TypeScript and this is a plain script, so it is read as
 * text rather than imported. Crude, but it keeps one source of truth and
 * fails loudly if the shape changes.
 */
function readTaxonomy() {
  const src = readFileSync(
    path.join(ROOT, "apps/backend/src/lib/catalogue-taxonomy.ts"),
    "utf8"
  )

  const catBlock = src.slice(
    src.indexOf("export const TYPE_CATEGORIES"),
    src.indexOf("export const FALLBACK_CATEGORY")
  )
  const categories = [
    ...catBlock.matchAll(/name:\s*"([^"]+)",\s*\n\s*handle:\s*"([^"]+)"/g),
  ].map((m) => ({ name: m[1], handle: m[2] }))

  const varietyBlock = src.slice(
    src.indexOf("export const VARIETIES"),
    src.indexOf("/** Flat list")
  )
  // Every quoted string in the block except the group keys, which are the
  // ones followed by a colon. Matching on "ends the line" instead missed
  // "BB Red" and "BB White", because their whole array is on one line.
  const varieties = [...varietyBlock.matchAll(/"([^"]+)"(\s*:)?/g)]
    .filter((m) => !m[2])
    .map((m) => m[1])

  const colourBlock = src.slice(src.indexOf("export const COLOURS"))
  const colours = [...colourBlock.matchAll(/^\s+"([a-z]+)",$/gm)].map((m) => m[1])

  if (!categories.length || !varieties.length || !colours.length) {
    throw new Error(
      "Could not read catalogue-taxonomy.ts — its shape changed. Fix readTaxonomy()."
    )
  }
  return { categories, varieties, colours }
}

const { categories, varieties, colours } = readTaxonomy()

const COLUMNS = [
  {
    header: "Product name",
    key: "name",
    width: 30,
    required: true,
    note: "The name customers see. Two rows with the SAME name become two sizes of one product.",
  },
  {
    header: "Size",
    key: "size",
    width: 14,
    note: "Leave blank if the product comes one way only. Otherwise: Small / Medium / Large, or 50 / 100 / 200.",
  },
  {
    header: "Price QAR",
    key: "price",
    width: 12,
    required: true,
    note: "Just the number. 450 — not 450.00 QAR, and never in fils.",
  },
  {
    header: "Was price QAR",
    key: "wasPrice",
    width: 14,
    note: "Only for a Hot Deal: the old price, shown struck through. Leave blank otherwise.",
  },
  { header: "Category 1", key: "cat1", width: 22, required: true, list: "categories" },
  { header: "Category 2", key: "cat2", width: 22, list: "categories" },
  { header: "Category 3", key: "cat3", width: 22, list: "categories" },
  {
    header: "Main flower",
    key: "variety",
    width: 24,
    list: "varieties",
    note: "The flower the arrangement is mostly made of.",
  },
  {
    header: "Colour",
    key: "colour",
    width: 12,
    list: "colours",
    note: "What a customer would call it when filtering. Use mixed for genuinely multi-coloured.",
  },
  {
    header: "Stems",
    key: "stems",
    width: 9,
    note: "Number of stems or heads, if it is a number worth quoting.",
  },
  {
    header: "Description",
    key: "description",
    width: 52,
    note: "Two or three sentences. What it is, what is in it, who it suits.",
  },
  {
    header: "Photo",
    key: "photo",
    width: 24,
    note: "Paste the photo into this cell (Insert > Picture, then drag it over the cell). One per product.",
  },
  {
    header: "Photo file name",
    key: "photoFile",
    width: 24,
    note: "Instead of pasting: put the photo in the same folder as this file and type its file name here, e.g. red-roses.jpg",
  },
  {
    header: "Publish?",
    key: "publish",
    width: 11,
    list: "yesno",
    note: "Yes puts it on the website immediately. No saves it as a draft for you to check first.",
  },
]

const wb = new ExcelJS.Workbook()
wb.creator = "Tulips and Truffles"
wb.created = new Date()

/* ---------------------------------------------------------------- Products */
const ws = wb.addWorksheet("Products", {
  views: [{ state: "frozen", ySplit: 1 }],
  properties: { defaultRowHeight: 84 },
})

ws.columns = COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }))

const header = ws.getRow(1)
header.height = 30
header.font = { bold: true, size: 11, color: { argb: "FF7B2340" } }
header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFBD7E2" } }
header.alignment = { vertical: "middle", wrapText: true }

// The guidance travels in cell comments rather than a second header row, so
// the first data row is row 2 and the importer never has to guess.
COLUMNS.forEach((c, i) => {
  const cell = header.getCell(i + 1)
  if (c.required) cell.value = `${c.header} *`
  if (c.note) cell.note = { texts: [{ text: c.note }] }
})

/* ------------------------------------------------------------------- Lists */
const lists = wb.addWorksheet("Lists")
lists.state = "veryHidden" // so nobody types into it by accident
lists.getColumn(1).values = ["Category", ...categories.map((c) => c.name)]
lists.getColumn(2).values = ["Main flower", ...varieties]
lists.getColumn(3).values = ["Colour", ...colours]
lists.getColumn(4).values = ["Publish", "Yes", "No"]

const RANGES = {
  categories: `Lists!$A$2:$A$${categories.length + 1}`,
  varieties: `Lists!$B$2:$B$${varieties.length + 1}`,
  colours: `Lists!$C$2:$C$${colours.length + 1}`,
  yesno: "Lists!$D$2:$D$3",
}

// 400 rows of validation. Enough for a full catalogue rebuild, and the
// importer stops at the last row with a name in it either way.
const LAST = 401
COLUMNS.forEach((c, i) => {
  const column = ws.getColumn(i + 1)
  if (c.list) {
    for (let r = 2; r <= LAST; r++) {
      ws.getCell(`${column.letter}${r}`).dataValidation = {
        type: "list",
        allowBlank: !c.required,
        formulae: [RANGES[c.list]],
        showErrorMessage: true,
        // A warning rather than a hard stop: an unreadable dropdown that
        // refuses the only word the florist has is worse than a flagged cell.
        errorStyle: "warning",
        errorTitle: "Pick from the list",
        error:
          "Use one of the values in the dropdown. If something is genuinely missing, ask for it to be added rather than typing it here.",
      }
    }
  }
  if (["price", "wasPrice", "stems"].includes(c.key)) {
    column.numFmt = "0.##"
    column.alignment = { vertical: "middle", horizontal: "right" }
  } else {
    column.alignment = { vertical: "middle", wrapText: true }
  }
})

/* ----------------------------------------------------------- Worked example */
const example = ws.getRow(2)
example.values = {
  name: "EXAMPLE — Fifty Red Roses, Vased",
  price: 450,
  cat1: "50 Roses",
  cat2: "Flowers in Vases",
  variety: "Red (assorted)",
  colour: "red",
  stems: 50,
  description:
    "Fifty long-stem red roses, hand-spiralled into a clear glass vase. The one people order when the message matters more than the wording.",
  publish: "Yes",
}
example.font = { italic: true, color: { argb: "FF8A8A8A" } }
example.getCell("name").note = {
  texts: [
    {
      text: "An example row, in grey italics. The importer skips any row whose name starts with EXAMPLE, so you can leave it here as a reminder of the shape — or type over it to make it a real product.",
    },
  ],
}

/* ------------------------------------------------------------ Instructions */
const how = wb.addWorksheet("How to use this sheet")
how.getColumn(1).width = 104
how.getColumn(1).alignment = { wrapText: true, vertical: "top" }

const LINES = [
  ["h", "Adding products to Tulips and Truffles"],
  ["p", "Fill in one row per product on the Products tab. Columns marked * are the only ones that must be filled in; everything else improves the page but will not stop the import."],
  ["h2", "Photos"],
  ["p", "Two ways, whichever is easier."],
  ["p", "1.  Paste the photo into the Photo cell for that row. In Excel: Insert > Pictures > This Device, then drag the picture so it sits over the cell. It does not have to fit the cell neatly — it only has to start in the right row."],
  ["p", "2.  Or put all the photos in the same folder as this spreadsheet, and type each file name into the Photo file name column — for example red-roses.jpg"],
  ["p", "One photo per product. Landscape or square works best: the catalogue crops to a square and the product page shows the whole picture. Shoot against a plain wall if you can — the flowers should be the only busy thing in frame. Photos straight off a phone are fine and are resized automatically."],
  ["h2", "Sizes"],
  ["p", "If a product comes in more than one size, use one row per size and give every row the SAME product name. Put Small / Medium / Large, or 50 / 100 / 200, in the Size column, each with its own price. They become one product page with a size chooser."],
  ["h2", "Prices"],
  ["p", "Plain numbers in Qatari riyal: 450, not 450 QAR and not 45000. Was price QAR is only for a Hot Deal — fill it in and the old price appears struck through beside the new one."],
  ["h2", "Categories"],
  ["p", "Category 1 is required and decides where the product mainly lives. Categories 2 and 3 are optional and worth using: a vased arrangement of fifty roses genuinely belongs under both 50 Roses and Flowers in Vases, and a customer will look under either."],
  ["h2", "What importing does"],
  ["p", "A product whose name does not exist yet is created. A product whose name already exists is updated — price, description, categories and photo are replaced with whatever the sheet says. So this file doubles as the way to do a bulk price change: keep it as the master copy, edit it, import it again."],
  ["p", "Nothing is ever deleted by importing. Removing a row from this sheet does not remove the product from the website — unpublish it in the admin dashboard instead."],
  ["h2", "Then send it to be imported"],
  ["p", "Save the file and hand it over. The import runs once against the live site and prints a line per product saying created, updated, or why it was skipped."],
  ["h2", "بالعربي"],
  ["p", "املأ صفاً واحداً لكل منتج في ورقة Products. الخانات المعلَّمة بنجمة * إلزامية فقط، وما عداها يحسّن الصفحة ولا يمنع الاستيراد."],
  ["p", "الصورة: الصقها في خانة Photo، أو اكتب اسم ملف الصورة في خانة Photo file name مع وضع الملف في نفس مجلد هذا الملف. الأسعار بالريال القطري وبأرقام مجردة."],
  ["p", "للمقاسات المتعددة: صف لكل مقاس، بنفس اسم المنتج، والمقاس في خانة Size."],
]

LINES.forEach(([kind, text], i) => {
  const row = how.getRow(i + 1)
  const cell = row.getCell(1)
  cell.value = text
  if (kind === "h") {
    cell.font = { bold: true, size: 16, color: { argb: "FF7B2340" } }
    row.height = 32
  } else if (kind === "h2") {
    cell.font = { bold: true, size: 12, color: { argb: "FFE13C72" } }
    row.height = 28
  } else {
    cell.font = { size: 11 }
    row.height = Math.max(18, Math.ceil(text.length / 95) * 15 + 6)
  }
  // Arabic reads right to left, and a left-aligned Arabic paragraph in a wide
  // cell puts the start of every line where the eye is not looking.
  if (/[؀-ۿ]/.test(text)) {
    cell.alignment = { wrapText: true, vertical: "top", horizontal: "right", readingOrder: "rtl" }
  }
})

wb.views = [{ activeTab: 2 }] // open on the instructions

await wb.xlsx.writeFile(OUT)
console.log(`Wrote ${path.relative(ROOT, OUT)}`)
console.log(
  `  dropdowns: ${categories.length} categories, ${varieties.length} varieties, ${colours.length} colours`
)
