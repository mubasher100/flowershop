import ExcelJS from "exceljs"
import { describe, expect, it } from "vitest"

import { driveFileIdOf, photoKey, type DriveFolder } from "./drive"
import type { ShopCategory, ShopPrices, ShopProduct } from "./shop"
import {
  buildWorkbook,
  driveIdsToCheck,
  exportRows,
  groupRows,
  matchProduct,
  parseGrid,
  planImport,
  readWorkbook,
  sheetCategories,
  type PlanContext,
} from "./spreadsheet"

const CATS: ShopCategory[] = [
  { id: "c-hand", name: "Hand-Tied Bouquets", handle: "hand-tied-bouquets" },
  { id: "c-50", name: "50 Roses", handle: "50-roses" },
  { id: "c-vase", name: "Flowers in Vases", handle: "flowers-in-vases" },
  { id: "c-offer", name: "Black Friday", handle: "hot-deals" },
  { id: "c-bday", name: "Birthday", handle: "birthday" },
]

const HEAD = [
  "Photo", "Name *", "Price (QAR) *", "On offer?", "Offer price (QAR)", "Description",
  "Hand-Tied Bouquets", "50 Roses", "Flowers in Vases", "Stock", "Size", "Show on website?",
]

/** A row in HEAD's layout, by heading. */
function row(rowNumber: number, v: Partial<Record<string, string>>) {
  return { rowNumber, cells: HEAD.map((h) => v[h.replace(" *", "")] ?? "") }
}

const variant = (id: string, title: string, stocked = 10, held = 0) => ({
  id,
  title,
  manage_inventory: true,
  prices: [{ id: `price-${id}`, amount: 0, currency_code: "qar" }],
  inventory_items: [
    {
      inventory_item_id: `iitem-${id}`,
      inventory: { stocked_quantity: stocked, reserved_quantity: held, location_levels: [{ location_id: "loc", stocked_quantity: stocked }] },
    },
  ],
})

const PRODUCTS: ShopProduct[] = [
  {
    id: "p-red",
    title: "Fifty Red Roses",
    handle: "fifty-red-roses",
    description: "Red.",
    thumbnail: "https://media.example/red.webp",
    status: "published",
    categories: [{ id: "c-50" }, { id: "c-bday" }],
    variants: [variant("v-red", "One size", 12, 2)],
  },
  {
    id: "p-pink",
    title: "Pink Box",
    handle: "pink-box",
    description: "Pink.",
    thumbnail: null,
    status: "draft",
    categories: [{ id: "c-vase" }, { id: "c-offer" }],
    variants: [variant("v-pink-s", "Small", 5), variant("v-pink-l", "Large", 3)],
  },
]

const PRICES: ShopPrices = {
  sale_price_list_id: "pl-sale",
  prices: {
    "v-red": { base: 499, sale: null, sale_price_id: null },
    "v-pink-s": { base: 299, sale: 249, sale_price_id: "sp-1" },
    "v-pink-l": { base: 499, sale: null, sale_price_id: null },
  },
}

const CTX: PlanContext = { products: PRODUCTS, categories: CATS, prices: PRICES }

describe("reading the sheet", () => {
  it("treats unknown headings as category tick columns", () => {
    const sheet = parseGrid(HEAD, [row(2, { Name: "A", "Price (QAR)": "99", "50 Roses": "✓", "Flowers in Vases": "x" })])
    expect(sheet.tickColumns).toEqual(["Hand-Tied Bouquets", "50 Roses", "Flowers in Vases"])
    expect(sheet.rows[0].ticks).toEqual(["50 Roses", "Flowers in Vases"])
  })

  it("counts any filled tick cell except an explicit no", () => {
    const sheet = parseGrid(HEAD, [
      row(2, { Name: "A", "Price (QAR)": "99", "Hand-Tied Bouquets": "yes", "50 Roses": "no", "Flowers in Vases": "-" }),
    ])
    expect(sheet.rows[0].ticks).toEqual(["Hand-Tied Bouquets"])
  })

  it("reads headings with stars and a second line, and refuses a sheet without a price column", () => {
    const sheet = parseGrid(["Name *\nالاسم", "PRICE (QAR) *", "50 Roses"], [{ rowNumber: 2, cells: ["A", "QAR 279", "✓"] }])
    expect(sheet.rows[0]).toMatchObject({ name: "A", base: 279 })
    expect(() => parseGrid(["Name", "50 Roses"], [])).toThrow(/Price/)
  })

  it("skips blank names and the example rows", () => {
    const sheet = parseGrid(HEAD, [
      row(2, { Name: "EXAMPLE — Fifty Red Roses", "Price (QAR)": "499" }),
      row(3, { Name: "", "Price (QAR)": "1" }),
      row(4, { Name: "Real", "Price (QAR)": "99" }),
    ])
    expect(sheet.rows.map((r) => r.name)).toEqual(["Real"])
  })

  it("turns On offer + Offer price into a sale below the full price", () => {
    const [ok, missing, above] = parseGrid(HEAD, [
      row(2, { Name: "A", "Price (QAR)": "299", "On offer?": "Yes", "Offer price (QAR)": "249" }),
      row(3, { Name: "B", "Price (QAR)": "299", "On offer?": "Yes" }),
      row(4, { Name: "C", "Price (QAR)": "299", "On offer?": "Yes", "Offer price (QAR)": "349" }),
    ]).rows
    expect(ok).toMatchObject({ base: 299, sale: 249, offerProblem: null })
    expect(missing).toMatchObject({ sale: null, offerProblem: expect.stringMatching(/no offer price/) })
    expect(above).toMatchObject({ sale: null, offerProblem: expect.stringMatching(/not below/) })
  })

  it("reads the full template's Was price as an offer", () => {
    const sheet = parseGrid(["Product name", "Price QAR", "Was price QAR", "Category 1"], [
      { rowNumber: 2, cells: ["A", "249", "299", "50 Roses"] },
    ])
    expect(sheet.rows[0]).toMatchObject({ base: 299, sale: 249, ticks: ["50 Roses"] })
  })

  it("groups rows sharing a name, however it was typed, into sizes", () => {
    const sheet = parseGrid(HEAD, [
      row(2, { Name: "Pink  Box", "Price (QAR)": "299", Size: "Small" }),
      row(3, { Name: "Other", "Price (QAR)": "99" }),
      row(4, { Name: "pink box ", "Price (QAR)": "499", Size: "Large" }),
    ])
    const groups = groupRows(sheet.rows)
    expect(groups.map((g) => g.map((r) => r.rowNumber))).toEqual([[2, 4], [3]])
  })
})

describe("matching existing flowers", () => {
  it("matches by name regardless of case and spacing, then by web address", () => {
    expect(matchProduct("fifty  red ROSES", PRODUCTS).product?.id).toBe("p-red")
    expect(matchProduct("Pink-Box", PRODUCTS).product?.id).toBe("p-pink")
    expect(matchProduct("Something New", PRODUCTS).product).toBeUndefined()
  })

  it("refuses to guess between two flowers of the same name", () => {
    const twins = [...PRODUCTS, { ...PRODUCTS[0], id: "p-red-2", handle: "fifty-red-roses-2" }]
    expect(matchProduct("Fifty Red Roses", twins).ambiguous).toBe(true)
  })
})

describe("the dry run", () => {
  it("plans a new flower with sizes, warnings and the offers category", () => {
    const sheet = parseGrid(HEAD, [
      row(2, { Name: "Lilac Dream", "Price (QAR)": "280", Size: "Small", "Hand-Tied Bouquets": "✓", Stock: "4" }),
      row(3, { Name: "Lilac Dream", "Price (QAR)": "499", "On offer?": "Yes", "Offer price (QAR)": "449", Size: "Large" }),
    ])
    const [f] = planImport(sheet, CTX).flowers
    expect(f.action).toBe("create")
    expect(f.sizes.map((s) => [s.title, s.base, s.sale, s.stock])).toEqual([
      ["Small", 280, null, 4],
      ["Large", 499, 449, null],
    ])
    expect(f.categoryIds.sort()).toEqual(["c-hand", "c-offer"])
    expect(f.status).toBe("published")
    expect(f.warnings.join("\n")).toMatch(/280 does not end in 9/)
    expect(f.warnings.join("\n")).toMatch(/No photo/)
  })

  it("skips a new flower with no category ticked, and one with no price", () => {
    const plan = planImport(
      parseGrid(HEAD, [
        row(2, { Name: "No Cats", "Price (QAR)": "99" }),
        row(3, { Name: "No Price", "50 Roses": "✓" }),
      ]),
      CTX
    )
    expect(plan.flowers.map((f) => [f.action, f.reason])).toEqual([
      ["skip", "no category ticked"],
      ["skip", "no price"],
    ])
    expect(plan.counts.skip).toBe(2)
  })

  it("reports a tick under a heading that is not a category", () => {
    const head = [...HEAD, "Mix Flowers"]
    const sheet = parseGrid(head, [
      { rowNumber: 2, cells: [...row(2, { Name: "X", "Price (QAR)": "99", "50 Roses": "✓" }).cells, "✓"] },
    ])
    const plan = planImport(sheet, CTX)
    expect(plan.unknownColumns).toEqual(["Mix Flowers"])
    expect(plan.flowers[0].warnings.join("\n")).toMatch(/"Mix Flowers" is ticked/)
  })

  it("leaves an existing flower alone when the sheet says what it already is", () => {
    const sheet = parseGrid(HEAD, [
      row(2, { Name: "Fifty Red Roses", "Price (QAR)": "499", "50 Roses": "✓", Stock: "10", "Show on website?": "Yes" }),
    ])
    const [f] = planImport(sheet, CTX).flowers
    expect(f.action).toBe("unchanged")
    // Birthday has no column in the sheet, so it is kept.
    expect(f.categoryIds.sort()).toEqual(["c-50", "c-bday"])
  })

  it("plans a price, offer and stock change on an existing flower, keeping blank fields", () => {
    const sheet = parseGrid(HEAD, [
      row(2, {
        Name: "Fifty Red Roses",
        "Price (QAR)": "499",
        "On offer?": "Yes",
        "Offer price (QAR)": "449",
        "Flowers in Vases": "✓",
        Stock: "6",
      }),
    ])
    const [f] = planImport(sheet, CTX).flowers
    expect(f.action).toBe("update")
    expect(f.sizes[0]).toMatchObject({ base: 499, sale: 449, priceChanged: true, stockChanged: true, stock: 6 })
    // Out of 50 Roses (its column is unticked), into Vases and Black Friday, Birthday kept.
    expect(f.categoryIds.sort()).toEqual(["c-bday", "c-offer", "c-vase"])
    expect(f.description).toBeNull()
    expect(f.status).toBe("published")
    expect(f.changes.join("\n")).toMatch(/can sell 10 → 6/)
  })

  it("matches sizes by name and reports one the flower does not have", () => {
    const sheet = parseGrid(HEAD, [
      row(2, { Name: "Pink Box", "Price (QAR)": "299", "On offer?": "No", Size: "Small", "Flowers in Vases": "✓" }),
      row(3, { Name: "Pink Box", "Price (QAR)": "699", Size: "Huge", "Flowers in Vases": "✓" }),
    ])
    const [f] = planImport(sheet, CTX).flowers
    expect(f.sizes.map((s) => s.variant?.id)).toEqual(["v-pink-s"])
    expect(f.sizes[0]).toMatchObject({ sale: null, priceChanged: true })
    expect(f.warnings.join("\n")).toMatch(/no size "Huge"/)
    // Small came off offer and Large never was, so it leaves Black Friday.
    expect(f.categoryIds).toEqual(["c-vase"])
  })

  it("imports an offer at full price when discounts are switched off", () => {
    const sheet = parseGrid(HEAD, [
      row(2, { Name: "New One", "Price (QAR)": "299", "On offer?": "Yes", "Offer price (QAR)": "249", "50 Roses": "✓" }),
    ])
    const [f] = planImport(sheet, { ...CTX, prices: { ...PRICES, sale_price_list_id: null } }).flowers
    expect(f.sizes[0].sale).toBeNull()
    expect(f.onOffer).toBe(false)
    expect(f.warnings.join("\n")).toMatch(/switched off/)
  })
})

describe("the sheet itself", () => {
  it("leaves the offers category and the occasions out of the tick columns", () => {
    expect(sheetCategories(CATS).map((c) => c.handle)).toEqual(["hand-tied-bouquets", "50-roses", "flowers-in-vases"])
  })

  it("reads back the blank sheet as no flowers (the example is skipped)", async () => {
    const names = sheetCategories(CATS).map((c) => c.name)
    const sheet = await readWorkbook(await buildWorkbook(names))
    expect(sheet.tickColumns).toEqual(names)
    expect(sheet.rows).toEqual([])
  })

  it("round-trips: downloading every flower and importing it unchanged changes nothing", async () => {
    const names = sheetCategories(CATS).map((c) => c.name)
    const rows = exportRows(CTX, names)
    expect(rows.map((r) => [r.name, r.size, r.price, r.offerPrice, r.stock])).toEqual([
      ["Fifty Red Roses", "", 499, null, 10],
      ["Pink Box", "Small", 299, 249, 5],
      ["Pink Box", "Large", 499, null, 3],
    ])
    const sheet = await readWorkbook(await buildWorkbook(names, rows))
    const plan = planImport(sheet, CTX)
    expect(plan.flowers.map((f) => [f.name, f.action, f.changes])).toEqual([
      ["Fifty Red Roses", "unchanged", []],
      ["Pink Box", "unchanged", []],
    ])
  })

  it("finds a photo pasted into a row", async () => {
    const names = sheetCategories(CATS).map((c) => c.name)
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(await buildWorkbook(names))
    const ws = wb.getWorksheet("Products")!
    ws.getRow(4).getCell(2).value = "Photo Flower"
    ws.getRow(4).getCell(3).value = 199
    ws.getRow(4).getCell(8).value = "✓"
    // A 1x1 PNG.
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64"
    )
    const id = wb.addImage({ buffer: png, extension: "png" } as unknown as ExcelJS.Image)
    ws.addImage(id, { tl: { col: 0, row: 3 }, ext: { width: 50, height: 50 } })
    const sheet = await readWorkbook((await wb.xlsx.writeBuffer()) as ArrayBuffer)
    expect(sheet.rows).toHaveLength(1)
    expect(sheet.rows[0]).toMatchObject({ name: "Photo Flower", base: 199, ticks: ["50 Roses"] })
    expect(sheet.rows[0].image?.extension).toBe("png")
    expect(sheet.rows[0].image?.data.length).toBe(png.length)
  })
})

describe("photos as Excel saves them", () => {
  const ctx: PlanContext = { products: [], categories: CATS, prices: { sale_price_list_id: null, prices: {} } }
  const cells = { Name: "New Roses", "Price (QAR)": "279", "50 Roses": "✓" }

  it("tells Excel not to shrink pasted photos", async () => {
    const { default: JSZip } = await import("jszip")
    const zip = await JSZip.loadAsync(await buildWorkbook(["50 Roses"]))
    expect(await zip.file("xl/workbook.xml")!.async("string")).toMatch(/<workbookPr [^>]*autoCompressPictures="0"/)
  })

  it("warns about a photo Excel has shrunk, and not about a full-size one", () => {
    const at = (width: number) =>
      planImport(parseGrid(HEAD, [row(2, cells)], new Map([[2, { data: new Uint8Array(1), extension: "jpeg", width }]])), ctx).flowers[0].warnings.join()
    expect(at(268)).toContain("268 pixels")
    expect(at(1312)).toBe("")
  })

  it("reports a Place in Cell picture instead of only saying there is no photo", () => {
    const w = planImport(parseGrid(HEAD, [row(2, cells)], new Map(), new Set([2])), ctx).flowers[0].warnings
    expect(w).toEqual([expect.stringContaining("Place in Cell")])
  })
})

describe("photos from a Google Drive folder", () => {
  const folder: DriveFolder = {
    photos: [
      { id: "drive-red-0000000001", name: "FIFTY red-roses.JPG" },
      { id: "drive-new-0000000001", name: "Lilac & Cream.png" },
      { id: "drive-odd-0000000001", name: "IMG_2041.heic" },
    ],
  }
  const red = { Name: "Fifty Red Roses", "Price (QAR)": "499", "50 Roses": "✓", Stock: "10", "Show on website?": "Yes" }
  const plan = (rows: ReturnType<typeof row>[], ctx: Partial<PlanContext> = {}) =>
    planImport(parseGrid(HEAD, rows), { ...CTX, drive: folder, ...ctx })
  const imported = (version: string) => [
    { ...PRODUCTS[0], metadata: { drive_photo: { id: "drive-red-0000000001", version } } },
    PRODUCTS[1],
  ]

  it("matches names whatever the capitals, dashes, accents or file type", () => {
    expect(photoKey("Two-Hundred_Roses & Lilies.JPG")).toBe(photoKey("two hundred roses and lilies"))
    expect(photoKey("Valentine’s Rosé.heic")).toBe(photoKey("valentines rose"))
    expect(photoKey("ورد أحمر.png")).toBe(photoKey("ورد أحمر"))
    expect(photoKey("ورد أحمر")).not.toBe("")
    expect(photoKey("50 Roses")).not.toBe(photoKey("50 Roses 2"))
  })

  it("gives each flower the photo with its name and lists the rest", () => {
    const p = plan([row(3, red), row(4, { Name: "Lilac and Cream", "Price (QAR)": "279", "50 Roses": "✓" })])
    expect(p.flowers.map((f) => f.photo)).toEqual([
      { kind: "drive", id: "drive-red-0000000001", name: "FIFTY red-roses.JPG" },
      { kind: "drive", id: "drive-new-0000000001", name: "Lilac & Cream.png" },
    ])
    expect(p.flowers[0].changes).toEqual(["new photo: FIFTY red-roses.JPG"])
    expect(p.flowers[1].warnings).toEqual([])
    expect(p.drive).toEqual({ photos: 3, matched: 2, unmatched: ["IMG_2041.heic"] })
  })

  it("says which new flower has no photo, and leaves an existing flower's photo alone", () => {
    const p = plan([
      row(3, { Name: "Nobody Knows", "Price (QAR)": "279", "50 Roses": "✓" }),
      row(4, { ...red, Name: "Fifty Red Roses" }),
    ], { drive: { photos: [] } })
    expect(p.flowers[0].warnings).toEqual(['No photo: the Google Drive folder has none called "Nobody Knows".'])
    expect(p.flowers[1]).toMatchObject({ action: "unchanged", photo: null, warnings: [] })
  })

  it("uses a name typed in the Photo cell, and reports one that is not there", () => {
    const named = plan([row(3, { Name: "Lemon", "Price (QAR)": "279", "50 Roses": "✓", Photo: "IMG_2041" })])
    expect(named.flowers[0].photo).toMatchObject({ id: "drive-odd-0000000001" })
    const missing = plan([row(3, { Name: "Lemon", "Price (QAR)": "279", "50 Roses": "✓", Photo: "IMG_9.jpg" })])
    expect(missing.flowers[0].photo).toBeNull()
    expect(missing.flowers[0].warnings).toEqual(['The Google Drive folder has no photo called "IMG_9.jpg".'])
  })

  it("does not import the same photo twice, but does when it was replaced in Drive", () => {
    const at = (was: string, now?: string) =>
      plan([row(3, red)], {
        products: imported(was),
        drive: { ...folder, versions: now == null ? {} : { "drive-red-0000000001": now } },
      }).flowers[0].action
    expect(at("v1", "v1")).toBe("unchanged")
    expect(at("v1", "v2")).toBe("update")
    // Google did not say: assume it is the same one.
    expect(at("v1")).toBe("unchanged")
    expect(driveIdsToCheck(imported("v1"), folder)).toEqual(["drive-red-0000000001"])
  })

  it("lets a pasted picture win, without calling the folder's photo unmatched", () => {
    const sheet = parseGrid(HEAD, [row(3, red)], new Map([[3, { data: new Uint8Array(1), extension: "png" }]]))
    const p = planImport(sheet, { ...CTX, drive: folder })
    expect(p.flowers[0].photo?.kind).toBe("image")
    expect(p.drive?.unmatched).not.toContain("FIFTY red-roses.JPG")
  })

  it("treats a link to one Drive photo as a photo, not as the picture's address", () => {
    const url = "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUv/view?usp=sharing"
    expect(driveFileIdOf(url)).toBe("1AbCdEfGhIjKlMnOpQrStUv")
    expect(plan([row(3, { ...red, Photo: url })]).flowers[0].photo).toMatchObject({ kind: "drive", id: "1AbCdEfGhIjKlMnOpQrStUv" })
  })

  it("reads the link typed or pasted above the headings, and none from a blank sheet", async () => {
    const link = "https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUv?usp=sharing"
    const blank = await buildWorkbook(["50 Roses"])
    expect((await readWorkbook(blank)).driveLink).toBeNull()
    for (const value of [link, { text: "Photos", hyperlink: link }]) {
      const wb = new ExcelJS.Workbook()
      await wb.xlsx.load(blank)
      wb.getWorksheet("Products")!.getCell("B1").value = value
      const sheet = await readWorkbook((await wb.xlsx.writeBuffer()) as ArrayBuffer)
      expect(sheet.driveLink).toBe(link)
      expect(sheet.tickColumns).toEqual(["50 Roses"])
    }
  })

  it("still reads a sheet made before, with its headings on row 1", async () => {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet("Products")
    ws.addRow(["Photo", "Name *", "Price (QAR) *", "50 Roses"])
    ws.addRow(["(paste photo here)", "Old Sheet", 279, "✓"])
    const sheet = await readWorkbook((await wb.xlsx.writeBuffer()) as ArrayBuffer)
    expect(sheet.driveLink).toBeNull()
    expect(sheet.rows).toMatchObject([{ rowNumber: 2, name: "Old Sheet", photoFile: "" }])
  })
})
