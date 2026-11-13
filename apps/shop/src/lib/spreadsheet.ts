/**
 * The product spreadsheet, on the phone.
 *
 * The same sheet as scripts/make-simple-template.mjs (Photo, Name, Price, On
 * offer?, Offer price, Description, a tick column per category, Stock, Size,
 * Show on website?) and the same reading rules as scripts/import-products.mjs,
 * so a sheet made by either side imports on the other:
 *
 * - any heading that is not a known field is a category tick column, and a
 *   tick under a heading that is not a real category is reported;
 * - rows sharing a name are sizes of one flower;
 * - photos pasted into the sheet come from getImages(), anchored to a row;
 * - an offer is a real sale price on the active sale list, plus the offers
 *   category (OFFER_HANDLE), exactly as the Flowers screen writes it;
 * - a blank Stock leaves an existing flower's count alone (10 for a new one).
 *
 * Two deliberate differences from the Node importer, both so the sheet works
 * as a price list ("Download all flowers", edit, import):
 * - Stock is "can sell", as everywhere else in this app. What unsent orders
 *   hold is added on top, so the website shows the number typed.
 * - Categories that have no column in the sheet (the occasions, Black Friday)
 *   are kept on an existing flower rather than wiped, and blank cells for
 *   description, photo and Show on website? leave an existing flower as it is.
 *
 * Planning is pure and tested; nothing is written until applyFlower() runs,
 * which the screen only calls after the florist taps Apply.
 */
import type ExcelJSNamespace from "exceljs"

import { messageOf } from "./bulk"
import { sdk } from "./sdk"
import {
  OFFER_HANDLE,
  applyPrice,
  basePriceOf,
  sellingOf,
  stockOf,
  withOfferCategory,
  STOCK_FIELDS,
  type ShopCategory,
  type ShopPrices,
  type ShopProduct,
  type ShopVariant,
} from "./shop"

type ExcelJS = typeof ExcelJSNamespace

/** exceljs is ~1 MB; load it only when a sheet is made or read. */
async function excel(): Promise<ExcelJS> {
  const mod = (await import("exceljs")) as unknown as ExcelJS & { default?: ExcelJS }
  return mod.default ?? mod
}

export const FILE_NAME = "tulips-and-truffles-products.xlsx"
export const DEFAULT_STOCK = 10
const ONE_SIZE = "One size"
const TICK = "✓"

/**
 * Occasions are left out of the sheet for now (11 Nov 2026, the shop's
 * instruction) — the same list as make-simple-template.mjs. A flower keeps
 * its occasions when imported, because their columns are absent.
 */
export const OCCASION_HANDLES = new Set([
  "anniversary", "birthday", "congratulations", "get-well-soon", "new-baby",
  "thank-you", "love", "sympathy",
])

/** The categories that get a tick column: everything but offers and occasions. */
export const sheetCategories = (categories: ShopCategory[]) =>
  categories.filter(
    (c) =>
      c.handle !== OFFER_HANDLE &&
      !OCCASION_HANDLES.has(c.handle) &&
      // An occasion added in the shop app is marked in its metadata.
      c.metadata?.kind !== "occasion"
  )

/* ---------------------------------------------------------------- reading */

type FieldKey =
  | "photo" | "photoFile" | "name" | "size" | "price" | "wasPrice" | "onOffer" | "offerPrice"
  | "description" | "stock" | "publish" | "cat1" | "cat2" | "cat3" | "variety" | "colour" | "stems"

/** Headings by meaning — the simple sheet's and the full template's. */
const HEADINGS: Record<string, FieldKey> = {
  "product name": "name",
  name: "name",
  size: "size",
  "price qar": "price",
  "price (qar)": "price",
  price: "price",
  "was price qar": "wasPrice",
  "was price (qar)": "wasPrice",
  "on offer?": "onOffer",
  "on offer": "onOffer",
  "offer price (qar)": "offerPrice",
  "offer price": "offerPrice",
  "category 1": "cat1",
  category: "cat1",
  "category 2": "cat2",
  "second category": "cat2",
  "category 3": "cat3",
  "main flower": "variety",
  colour: "colour",
  color: "colour",
  stems: "stems",
  description: "description",
  photo: "photo",
  "photo url": "photo",
  "photo file name": "photoFile",
  "publish?": "publish",
  publish: "publish",
  "show on website?": "publish",
  stock: "stock",
  "in stock": "stock",
}

/** "Name *\nالاسم" and "  NAME" are the same column: first line, no star. */
export const normaliseHeading = (s: string) => s.split(/\r?\n/)[0].replace(/\*/g, "").trim().toLowerCase()
const headingLabel = (s: string) => s.split(/\r?\n/)[0].replace(/\*/g, "").trim()

/** One name, however it was typed: trimmed, single-spaced, lower case. */
export const nameKey = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase()

export const handleize = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")

const toNumber = (s: string) => {
  const t = s.replace(/[^0-9.]/g, "")
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

const YES = /^(yes|y|نعم|true|1|✓|✔|x)$/i
const NO = /^(no|n|لا|false|0|-)$/i

export type SheetImage = { data: Uint8Array; extension: string }

export type SheetRow = {
  rowNumber: number
  name: string
  size: string
  /** The variant's own (full) price. */
  base: number | null
  /** What the customer pays while on offer. */
  sale: number | null
  /** Said "On offer? Yes" but the offer price was missing or not below the price. */
  offerProblem: string | null
  description: string
  stock: number | null
  /** null: the cell was blank. */
  publish: boolean | null
  /** Headings of the tick columns ticked in this row, plus any named categories. */
  ticks: string[]
  photoUrl: string | null
  photoFile: string
  image: SheetImage | null
}

export type ParsedSheet = {
  rows: SheetRow[]
  /** Headings read as category tick columns, in sheet order. */
  tickColumns: string[]
}

/**
 * The sheet as plain text: the heading row and each row after it, already
 * converted from cells. Kept separate from exceljs so the rules are testable.
 */
export function parseGrid(
  headings: string[],
  body: { rowNumber: number; cells: string[] }[],
  images: Map<number, SheetImage> = new Map()
): ParsedSheet {
  const byKey: Partial<Record<FieldKey, number>> = {}
  const tickColumns: { name: string; col: number }[] = []
  headings.forEach((h, col) => {
    const norm = normaliseHeading(h ?? "")
    if (!norm) return
    const key = HEADINGS[norm]
    if (key) {
      if (byKey[key] == null) byKey[key] = col // the first column of a meaning wins
    } else tickColumns.push({ name: headingLabel(h), col })
  })

  for (const required of ["name", "price"] as const) {
    if (byKey[required] == null) {
      throw new Error(
        `The sheet has no "${required === "name" ? "Name" : "Price (QAR)"}" column. Headings found: ${headings
          .filter(Boolean)
          .map(headingLabel)
          .join(", ")}`
      )
    }
  }
  if (byKey.cat1 == null && !tickColumns.length) {
    throw new Error("The sheet has no category columns to tick.")
  }

  const rows: SheetRow[] = []
  for (const { rowNumber, cells } of body) {
    const get = (k: FieldKey) => (byKey[k] != null ? (cells[byKey[k]!] ?? "").trim() : "")
    const num = (k: FieldKey) => toNumber(get(k))

    const name = get("name").replace(/\s+/g, " ")
    if (!name) continue
    if (/^example\b/i.test(name.replace(/^\W+/, ""))) continue

    // Price + "On offer? Yes" + Offer price (the simple sheet), or Price (what
    // they pay) + Was price (the full template). Both come out as base + sale.
    const listed = num("price")
    const offer = num("offerPrice")
    const was = num("wasPrice")
    const saysOffer = YES.test(get("onOffer"))
    let base = listed
    let sale: number | null = null
    if (saysOffer && offer != null && listed != null && offer > 0 && offer < listed) sale = offer
    else if (byKey.onOffer == null && was != null && listed != null && was > listed) {
      base = was
      sale = listed
    }

    const publishText = get("publish")
    const photoText = get("photo")
    const stock = num("stock")

    rows.push({
      rowNumber,
      name,
      size: get("size"),
      base,
      sale,
      offerProblem:
        saysOffer && sale == null && listed != null
          ? offer == null
            ? "says it is on offer but has no offer price"
            : "offer price is not below the price"
          : null,
      description: get("description"),
      stock: stock == null ? null : Math.round(stock),
      publish: !publishText ? null : !NO.test(publishText),
      ticks: [
        get("cat1"),
        get("cat2"),
        get("cat3"),
        // ✓, x, yes — anything but an empty cell or an explicit no.
        ...tickColumns
          .filter((t) => {
            const v = (cells[t.col] ?? "").trim()
            return v && !NO.test(v)
          })
          .map((t) => t.name),
      ].filter(Boolean),
      photoUrl: /^https?:\/\/\S+$/i.test(photoText) ? photoText : null,
      photoFile: get("photoFile"),
      image: images.get(rowNumber) ?? null,
    })
  }

  return { rows, tickColumns: tickColumns.map((t) => t.name) }
}

type Cell = { value?: unknown; text?: string }

/** A cell's text: plain, rich text (from a paste), a hyperlink or a formula result. */
export function cellText(cell: Cell | undefined): string {
  const v = cell?.value
  if (v == null) return ""
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === "object") {
    const o = v as { richText?: { text: string }[]; text?: unknown; result?: unknown; hyperlink?: string }
    if (Array.isArray(o.richText)) return o.richText.map((t) => t.text).join("").trim()
    if (o.text != null) {
      // A hyperlink whose text is itself rich text.
      const t = o.text as { richText?: { text: string }[] } | string
      return (typeof t === "string" ? t : (t.richText ?? []).map((r) => r.text).join("")).trim()
    }
    if (o.result != null) return String(o.result).trim()
    return ""
  }
  return String(v).trim()
}

/**
 * Load an .xlsx, surviving the template's cell notes. Some editors re-save
 * them with an absolute relationship path and exceljs then fails with
 * "Cannot read properties of undefined (reading 'comments')"; the comment
 * relationships are stripped from an in-memory copy and it is read again.
 */
async function loadWorkbook(data: ArrayBuffer) {
  const ExcelJS = await excel()
  const wb = new ExcelJS.Workbook()
  try {
    await wb.xlsx.load(data)
    return wb
  } catch (err) {
    if (!/reading 'comments'/.test(messageOf(err))) {
      throw new Error(`That file could not be read as a spreadsheet (.xlsx). ${messageOf(err)}`)
    }
  }
  const JSZip = (await import("jszip")).default
  const zip = await JSZip.loadAsync(data)
  for (const name of Object.keys(zip.files)) {
    if (/^xl\/worksheets\/_rels\/.*\.rels$/.test(name)) {
      const xml = await zip.file(name)!.async("string")
      zip.file(name, xml.replace(/<Relationship\b[^>]*\/(?:comments|vmlDrawing)"[^>]*\/>/g, ""))
    }
  }
  const clean = new ExcelJS.Workbook()
  await clean.xlsx.load(await zip.generateAsync({ type: "arraybuffer" }))
  return clean
}

/** Read an .xlsx file's Products sheet. */
export async function readWorkbook(data: ArrayBuffer): Promise<ParsedSheet> {
  const wb = await loadWorkbook(data)
  const ws =
    wb.getWorksheet("Products") ?? wb.worksheets.find((w) => w.state !== "veryHidden" && w.rowCount > 1)
  if (!ws) throw new Error("There is no Products sheet in that file.")

  const headings: string[] = []
  ws.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
    headings[col - 1] = cellText(cell as Cell)
  })
  const width = headings.length

  // Pictures pasted into cells are floating drawings anchored to a position,
  // not cell values. The anchor's row is 0-based; the first picture per row wins.
  const images = new Map<number, SheetImage>()
  for (const img of ws.getImages?.() ?? []) {
    const tl = img.range?.tl as { nativeRow?: number; row?: number } | undefined
    const row = Math.floor(tl?.nativeRow ?? tl?.row ?? 0) + 1
    const media = wb.getImage(Number(img.imageId)) as { buffer?: Uint8Array; extension?: string } | undefined
    if (media?.buffer && !images.has(row)) {
      images.set(row, { data: new Uint8Array(media.buffer), extension: media.extension || "png" })
    }
  }

  const body: { rowNumber: number; cells: string[] }[] = []
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r)
    const cells: string[] = []
    for (let c = 1; c <= width; c++) cells.push(cellText(row.getCell(c) as Cell))
    if (cells.some(Boolean)) body.push({ rowNumber: r, cells })
  }
  return parseGrid(headings, body, images)
}

/* --------------------------------------------------------------- planning */

export type PlanSize = {
  rowNumber: number
  title: string
  /** The existing size this row prices; null on a new flower. */
  variant: ShopVariant | null
  base: number
  sale: number | null
  /** "Can sell": null leaves an existing size's count alone. */
  stock: number | null
  priceChanged: boolean
  stockChanged: boolean
}

export type PlanPhoto = { kind: "image"; image: SheetImage } | { kind: "url"; url: string } | null

export type PlanFlower = {
  /** nameKey of the flower's name. */
  key: string
  name: string
  rows: number[]
  action: "create" | "update" | "unchanged" | "skip"
  /** Why it is skipped. */
  reason?: string
  product?: ShopProduct
  sizes: PlanSize[]
  categoryIds: string[]
  status: "published" | "draft"
  /** null leaves an existing description alone. */
  description: string | null
  photo: PlanPhoto
  onOffer: boolean
  /** What would change, in words, for the report. */
  changes: string[]
  warnings: string[]
  /** Product fields (title aside) that differ: name the update call needs. */
  productChanged: boolean
}

export type Plan = {
  flowers: PlanFlower[]
  tickColumns: string[]
  /** Tick column headings that match no category. */
  unknownColumns: string[]
  counts: { create: number; update: number; unchanged: number; skip: number; warnings: number }
}

export type PlanContext = {
  products: ShopProduct[]
  categories: ShopCategory[]
  prices: ShopPrices
}

const endsIn9 = (n: number) => Math.round(n) % 10 === 9
const qar = (n: number) => `QAR ${n}`

/** The existing flower a sheet name refers to: by name, then by web address. */
export function matchProduct(name: string, products: ShopProduct[]): { product?: ShopProduct; ambiguous?: boolean } {
  const key = nameKey(name)
  const byName = products.filter((p) => nameKey(p.title) === key)
  if (byName.length > 1) return { ambiguous: true }
  if (byName.length === 1) return { product: byName[0] }
  const handle = handleize(name)
  const byHandle = products.find((p) => p.handle === handle)
  return byHandle ? { product: byHandle } : {}
}

/** Rows sharing a name are sizes of one flower, in the order they first appear. */
export function groupRows(rows: SheetRow[]): SheetRow[][] {
  const groups = new Map<string, SheetRow[]>()
  for (const r of rows) {
    const k = nameKey(r.name)
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(r)
  }
  return [...groups.values()]
}

const sameSet = (a: Iterable<string>, b: Iterable<string>) => {
  const A = new Set(a)
  const B = new Set(b)
  return A.size === B.size && [...A].every((x) => B.has(x))
}

export function planImport(sheet: ParsedSheet, ctx: PlanContext): Plan {
  const { products, categories, prices } = ctx
  const saleListId = prices.sale_price_list_id

  const byName = new Map<string, ShopCategory>()
  for (const c of categories) byName.set(nameKey(c.name), c)
  // Offers was Hot Deal until 31 Oct 2026; old sheets still say so.
  const offerCat = categories.find((c) => c.handle === OFFER_HANDLE)
  if (offerCat) for (const alias of ["offers", "hot deal", "hot deals"]) if (!byName.has(alias)) byName.set(alias, offerCat)

  const unknownColumns = sheet.tickColumns.filter((h) => !byName.has(nameKey(h)))
  // Categories with a column in this sheet: their tick (or its absence) decides.
  const columnCatIds = new Set(
    sheet.tickColumns.map((h) => byName.get(nameKey(h))?.id).filter((id): id is string => !!id && id !== offerCat?.id)
  )

  const flowers: PlanFlower[] = []

  for (const group of groupRows(sheet.rows)) {
    const lead = group[0]
    const warnings: string[] = []
    const changes: string[] = []
    const plan: PlanFlower = {
      key: nameKey(lead.name),
      name: lead.name,
      rows: group.map((r) => r.rowNumber),
      action: "skip",
      sizes: [],
      categoryIds: [],
      status: "published",
      description: null,
      photo: null,
      onOffer: false,
      changes,
      warnings,
      productChanged: false,
    }
    flowers.push(plan)
    const skip = (reason: string) => {
      plan.action = "skip"
      plan.reason = reason
    }

    const match = matchProduct(lead.name, products)
    if (match.ambiguous) {
      skip("more than one flower in the shop has this name — change it in the app instead")
      continue
    }
    const product = match.product
    plan.product = product

    /* ---- sizes and prices ---- */
    const noPrice = group.filter((r) => r.base == null || r.base <= 0)
    if (noPrice.length) {
      skip(`no price${group.length > 1 ? ` on row ${noPrice.map((r) => r.rowNumber).join(", ")}` : ""}`)
      continue
    }

    const seen = new Set<string>()
    const variants = product?.variants ?? []
    for (const r of group) {
      const title = r.size || ONE_SIZE
      if (seen.has(nameKey(title))) {
        warnings.push(`Row ${r.rowNumber}: the size "${title}" appears twice — only the first row is used.`)
        continue
      }
      seen.add(nameKey(title))

      if (r.offerProblem) warnings.push(`Row ${r.rowNumber}: ${r.offerProblem} — imported at full price.`)
      let sale = r.sale
      if (sale != null && !saleListId) {
        warnings.push(`Row ${r.rowNumber}: offers are switched off in the shop — imported at full price.`)
        sale = null
      }
      if (!endsIn9(r.base!)) warnings.push(`Row ${r.rowNumber}: the price ${r.base} does not end in 9.`)
      if (sale != null && !endsIn9(sale)) warnings.push(`Row ${r.rowNumber}: the offer price ${sale} does not end in 9.`)

      let variant: ShopVariant | null = null
      if (product) {
        // A flower with one size takes a row with no size, whatever the size is called.
        variant =
          variants.find((v) => nameKey(v.title) === nameKey(title)) ??
          (!r.size && variants.length === 1 ? variants[0] : null)
        if (!variant) {
          warnings.push(
            `Row ${r.rowNumber}: ${product.title} has no size "${title}" — new sizes are added in the full admin; row ignored.`
          )
          continue
        }
      }

      let priceChanged = true
      let stockChanged = r.stock != null
      if (variant) {
        const current = prices.prices[variant.id]
        const curBase = current?.base ?? basePriceOf(variant)?.amount ?? null
        const curSale = current?.sale ?? null
        priceChanged = curBase !== r.base || curSale !== sale
        if (priceChanged) {
          const { now, was } = sellingOf(current)
          const label = variants.length > 1 ? `${variant.title}: ` : ""
          const before = was != null ? `${qar(now)} (offer, was ${was})` : qar(now)
          const after = sale != null ? `${qar(sale)} (offer, was ${r.base})` : qar(r.base!)
          changes.push(`${label}${before} → ${after}`)
        }
        const s = stockOf(variant)
        if (r.stock != null && !s.tracked) {
          warnings.push(`Row ${r.rowNumber}: stock is not counted for this size — Stock ignored.`)
          stockChanged = false
        } else if (r.stock != null) {
          stockChanged = r.stock !== s.available
          if (stockChanged) changes.push(`${variants.length > 1 ? `${variant.title}: ` : ""}can sell ${s.available} → ${r.stock}`)
        }
      }

      plan.sizes.push({
        rowNumber: r.rowNumber,
        title,
        variant,
        base: r.base!,
        sale,
        stock: r.stock,
        priceChanged,
        stockChanged,
      })
    }

    /* ---- categories ---- */
    const ticked = new Set<string>()
    for (const name of new Set(group.flatMap((r) => r.ticks))) {
      const c = byName.get(nameKey(name))
      if (!c) {
        warnings.push(`"${name}" is ticked, but there is no such category — ignored.`)
      } else if (c.id === offerCat?.id) {
        warnings.push(`${c.name} follows "On offer?" — its tick is ignored.`)
      } else ticked.add(c.id)
    }

    // On offer if any size will be, counting sizes the sheet does not list.
    const listed = new Set(plan.sizes.map((s) => s.variant?.id).filter(Boolean))
    plan.onOffer =
      !!saleListId &&
      (plan.sizes.some((s) => s.sale != null) ||
        variants.some((v) => !listed.has(v.id) && sellingOf(prices.prices[v.id]).was != null))

    const existingCats = (product?.categories ?? []).map((c) => c.id)
    if (!ticked.size) {
      if (!product) {
        skip(group.some((r) => r.ticks.length) ? "none of its ticks is a real category" : "no category ticked")
        continue
      }
      warnings.push("No category ticked — it keeps the categories it has.")
      plan.categoryIds = withOfferCategory(existingCats, categories, plan.onOffer)
    } else {
      const kept = existingCats.filter((id) => !columnCatIds.has(id))
      plan.categoryIds = withOfferCategory([...kept, ...ticked], categories, plan.onOffer)
    }

    /* ---- everything else ---- */
    const publish = group.find((r) => r.publish != null)?.publish ?? null
    plan.status = publish == null ? (product ? (product.status === "published" ? "published" : "draft") : "published") : publish ? "published" : "draft"
    const description = group.find((r) => r.description)?.description ?? ""
    plan.description = description ? description : product ? null : ""

    const imageRow = group.find((r) => r.image)
    const urlRow = group.find((r) => r.photoUrl)
    if (imageRow) plan.photo = { kind: "image", image: imageRow.image! }
    else if (urlRow && urlRow.photoUrl !== product?.thumbnail) plan.photo = { kind: "url", url: urlRow.photoUrl! }
    if (!imageRow && group.some((r) => r.photoFile)) {
      warnings.push("A photo file name can't be opened from a phone — paste the photo into the sheet instead.")
    }
    if (!product && !plan.photo) warnings.push("No photo.")

    if (!plan.sizes.length) {
      skip("none of its sizes could be used")
      continue
    }

    if (!product) {
      plan.action = "create"
      continue
    }

    const catsChanged = !sameSet(existingCats, plan.categoryIds)
    if (catsChanged) {
      const nameOf = (id: string) => categories.find((c) => c.id === id)?.name ?? "?"
      const added = plan.categoryIds.filter((id) => !existingCats.includes(id)).map(nameOf)
      const removed = existingCats.filter((id) => !plan.categoryIds.includes(id)).map(nameOf)
      if (added.length) changes.push(`into ${added.join(", ")}`)
      if (removed.length) changes.push(`out of ${removed.join(", ")}`)
    }
    const statusChanged = plan.status !== product.status
    if (statusChanged) changes.push(plan.status === "published" ? "shown on the website" : "hidden")
    const descChanged = plan.description != null && plan.description.trim() !== (product.description ?? "").trim()
    if (descChanged) changes.push("new description")
    if (plan.photo) changes.push("new photo")

    plan.productChanged = catsChanged || statusChanged || descChanged
    const anything = plan.productChanged || !!plan.photo || plan.sizes.some((s) => s.priceChanged || s.stockChanged)
    plan.action = anything ? "update" : "unchanged"
  }

  const counts = { create: 0, update: 0, unchanged: 0, skip: 0, warnings: 0 }
  for (const f of flowers) {
    counts[f.action]++
    counts.warnings += f.warnings.length
  }
  return { flowers, tickColumns: sheet.tickColumns, unknownColumns, counts }
}

/* ---------------------------------------------------------------- writing */

const ROSE = "FF7B2340"
const BLUSH = "FFFBD7E2"
const PALE = "FFFFF7F9"

type Column = {
  header: string
  key: string
  width: number
  note: string
  required?: boolean
  number?: boolean
  list?: "yesno"
  tick?: boolean
}

const FIELDS: Column[] = [
  { header: "Photo", key: "photo", width: 26, note: "Paste the photo here: copy it, click this cell, paste. It only has to start in this row." },
  { header: "Name", key: "name", width: 30, required: true, note: "The name customers see, e.g. Fifty Red Roses.\nTwo rows with the same name become two sizes of one flower." },
  { header: "Price (QAR)", key: "price", width: 13, required: true, number: true, note: "The normal price. Just the number, ending in 9: 279, not 280 or 279 QAR." },
  { header: "On offer?", key: "onOffer", width: 11, list: "yesno", note: "Yes = on offer: the normal price shows crossed out and the flower appears under Black Friday." },
  { header: "Offer price (QAR)", key: "offerPrice", width: 14, number: true, note: "Only when On offer is Yes: what the customer pays. Lower than the price." },
  { header: "Description", key: "description", width: 46, note: "Two or three sentences: what is in it and who it suits." },
]

const TRAILING: Column[] = [
  { header: "Stock", key: "stock", width: 9, number: true, note: "How many you can sell. Leave blank for 10 on a new flower; an existing flower keeps its count." },
  { header: "Size", key: "size", width: 11, note: "Leave blank unless the flower comes in sizes. Then one row per size, same name, e.g. Small / Large." },
  { header: "Show on website?", key: "publish", width: 13, list: "yesno", note: "Yes = on the website straight away. No = saved hidden, to check first. Blank = Yes for a new flower; an existing one stays as it is." },
]

export type ExportRow = {
  photo?: string | null
  name: string
  price: number
  onOffer: boolean
  offerPrice: number | null
  description?: string
  ticks: string[]
  stock: number | null
  size?: string
  publish: boolean
}

/** Every flower, one row per size, in the sheet's layout. */
export function exportRows(ctx: PlanContext, tickNames: string[]): ExportRow[] {
  const { products, categories, prices } = ctx
  const ticks = new Set(tickNames.map(nameKey))
  const rows: ExportRow[] = []
  for (const p of [...products].sort((a, b) => a.title.localeCompare(b.title))) {
    const variants = p.variants ?? []
    const catNames = (p.categories ?? [])
      .map((c) => categories.find((x) => x.id === c.id)?.name)
      .filter((n): n is string => !!n && ticks.has(nameKey(n)))
    variants.forEach((v, i) => {
      const { now, was } = sellingOf(prices.prices[v.id] ?? { base: basePriceOf(v)?.amount ?? null, sale: null, sale_price_id: null })
      const s = stockOf(v)
      rows.push({
        photo: i === 0 ? p.thumbnail : null,
        name: p.title,
        price: was ?? now,
        onOffer: was != null,
        offerPrice: was != null ? now : null,
        description: i === 0 ? p.description ?? "" : "",
        ticks: catNames,
        stock: s.tracked ? s.available : null,
        size: variants.length > 1 ? v.title : "",
        publish: p.status === "published",
      })
    })
  }
  return rows
}

/**
 * The simple sheet, as make-simple-template.mjs makes it: blank with a worked
 * example, or filled with `rows` (the whole catalogue) to edit and re-import.
 */
export async function buildWorkbook(categoryNames: string[], rows?: ExportRow[]): Promise<ArrayBuffer> {
  const ExcelJS = await excel()
  const CATS: Column[] = categoryNames.map((name, i) => ({
    header: name,
    key: `cat_${i}`,
    width: 6.5,
    tick: true,
    note: `Tick (${TICK}) to put the flower in ${name}. Tick as many categories as fit — at least one.`,
  }))
  const COLUMNS = [...FIELDS, ...CATS, ...TRAILING]

  const wb = new ExcelJS.Workbook()
  wb.creator = "Tulips and Truffles"
  wb.created = new Date()

  const ws = wb.addWorksheet("Products", {
    views: [{ state: "frozen", ySplit: 1, xSplit: 2 }],
    properties: { defaultRowHeight: rows ? 20 : 110 } as ExcelJSNamespace.WorksheetProperties,
  })
  ws.columns = COLUMNS.map((c) => ({ key: c.key, width: c.width }))

  const head = ws.getRow(1)
  head.height = 120 // room for the category names, which run upwards
  COLUMNS.forEach((c, i) => {
    const cell = head.getCell(i + 1)
    cell.value = `${c.header}${c.required ? " *" : ""}`
    cell.font = { bold: true, size: 11, color: { argb: c.tick ? "FF3F5A40" : ROSE } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: c.tick ? "FFE4EEE2" : BLUSH } }
    cell.alignment = c.tick
      ? { textRotation: 90, vertical: "bottom", horizontal: "center", wrapText: true }
      : { vertical: "middle", horizontal: "center", wrapText: true }
    cell.border = { bottom: { style: "medium", color: { argb: ROSE } } }
    cell.note = { texts: [{ text: c.note }] } as ExcelJSNamespace.Comment
  })

  const lists = wb.addWorksheet("Lists")
  lists.state = "veryHidden"
  lists.getColumn(1).values = ["Yes/No", "Yes", "No"]
  lists.getColumn(2).values = ["Tick", TICK]
  const RANGES = { yesno: "Lists!$A$2:$A$3", tick: "Lists!$B$2:$B$2" }

  const letter = (key: string) => ws.getColumn(COLUMNS.findIndex((c) => c.key === key) + 1).letter
  const firstCat = CATS.length ? letter(CATS[0].key) : null
  const lastCat = CATS.length ? letter(CATS[CATS.length - 1].key) : null
  const LAST = Math.max(301, (rows?.length ?? 0) + 51)

  for (let r = 2; r <= LAST; r++) {
    COLUMNS.forEach((c, i) => {
      const cell = ws.getRow(r).getCell(i + 1)
      cell.alignment = c.number || c.tick ? { vertical: "middle", horizontal: "center" } : { vertical: "middle", wrapText: true }
      if (c.number) cell.numFmt = "0"
      if (c.tick) {
        cell.font = { bold: true, size: 16, color: { argb: "FF3F5A40" } }
        cell.border = { left: { style: "hair", color: { argb: "FFD9C9CF" } } }
      }
      if (c.list || c.tick) {
        cell.dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [RANGES[c.tick ? "tick" : c.list!]],
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

  const fill = (argb: string) => ({ fill: { type: "pattern" as const, pattern: "solid" as const, bgColor: { argb } } })
  ws.addConditionalFormatting({
    ref: `${letter("offerPrice")}2:${letter("offerPrice")}${LAST}`,
    rules: [{ type: "expression", priority: 1, formulae: [`AND(${letter("onOffer")}2="Yes",${letter("offerPrice")}2="")`], style: fill("FFF8B4C8") }],
  })
  if (firstCat && lastCat) {
    ws.addConditionalFormatting({
      ref: `${firstCat}2:${lastCat}${LAST}`,
      rules: [{ type: "expression", priority: 2, formulae: [`${firstCat}2<>""`], style: fill("FFCFE3CC") }],
    })
    ws.addConditionalFormatting({
      ref: `${letter("name")}2:${letter("name")}${LAST}`,
      rules: [
        {
          type: "expression",
          priority: 3,
          formulae: [`AND(${letter("name")}2<>"",COUNTA(${firstCat}2:${lastCat}2)=0)`],
          style: fill("FFF8B4C8"),
        },
      ],
    })
  }
  ws.addConditionalFormatting({
    ref: `A2:${letter("publish")}${LAST}`,
    rules: [{ type: "expression", priority: 4, formulae: ["MOD(ROW(),2)=1"], style: fill(PALE) }],
  })

  const tickValues = (names: string[]) => {
    const out: Record<string, string> = {}
    for (const n of names) {
      const i = categoryNames.findIndex((c) => nameKey(c) === nameKey(n))
      if (i >= 0) out[`cat_${i}`] = TICK
    }
    return out
  }

  if (rows) {
    rows.forEach((r, i) => {
      const row = ws.getRow(i + 2)
      row.values = {
        photo: r.photo ? { text: r.photo, hyperlink: r.photo } : undefined,
        name: r.name,
        price: r.price,
        onOffer: r.onOffer ? "Yes" : "No",
        offerPrice: r.offerPrice ?? undefined,
        description: r.description || undefined,
        ...tickValues(r.ticks),
        stock: r.stock ?? undefined,
        size: r.size || undefined,
        publish: r.publish ? "Yes" : "No",
      } as unknown as ExcelJSNamespace.CellValue[]
      row.height = r.description ? 60 : 24
    })
  } else {
    const ex = ws.getRow(2)
    ex.values = {
      photo: "(paste photo here)",
      name: "EXAMPLE — Fifty Red Roses",
      price: 499,
      onOffer: "Yes",
      offerPrice: 449,
      description: "Fifty long-stem red roses, hand-tied and wrapped in black. The one to send when the message matters.",
      ...tickValues(["50 Roses"]),
      stock: 10,
      publish: "Yes",
    } as unknown as ExcelJSNamespace.CellValue[]
    ex.font = { italic: true, color: { argb: "FF8A7A80" } }
    const ex2 = ws.getRow(3)
    ex2.values = {
      name: "EXAMPLE — Fifty Red Roses",
      price: 899,
      onOffer: "No",
      ...tickValues(["50 Roses"]),
      stock: 5,
      size: "Large",
      publish: "Yes",
    } as unknown as ExcelJSNamespace.CellValue[]
    ex2.font = { italic: true, color: { argb: "FF8A7A80" } }
    // A second size of the example: give the first one a size name too.
    ws.getRow(2).getCell(COLUMNS.findIndex((c) => c.key === "size") + 1).value = "Small"
  }

  const how = wb.addWorksheet("How to use")
  how.getColumn(1).width = 100
  const LINES: [string, string][] = [
    ["h", "Adding flowers — 5 steps"],
    ["p", "1.  Go to the Products tab. One row = one flower. The grey rows are an example; the import skips them."],
    ["p", "2.  Paste the photo into the Photo cell: copy the picture, click the cell, paste. It only has to start in the right row."],
    ["p", "3.  Type the name and the price (a number ending in 9, like 279), and a short description."],
    ["p", `4.  Tick the categories it belongs in: click the cell under each one and choose ${TICK} (typing x works too). Tick as many as fit — at least one. A ticked cell turns green; a name with nothing ticked turns pink.`],
    ["p", "5.  On offer? Choose Yes and type the offer price. The website shows the normal price crossed out and puts the flower under Black Friday."],
    ["p", "Save it, then import it from the shop app: More → Spreadsheet → Import a sheet. Columns with * are required; the rest can stay empty."],
    ["h2", "Good to know"],
    ["p", "•  The product code, web address and stock records are made automatically — don't add them."],
    ["p", "•  Same name on two rows + a Size on each = one flower with a size choice, each size its own price."],
    ["p", "•  A flower that already exists (same name) is updated: price, offer, stock, photo, description and categories. Its occasions are kept."],
    ["p", "•  Deleting a row here never deletes anything from the website. Hide a flower from the app instead."],
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

  wb.views = [{ activeTab: 0 } as ExcelJSNamespace.WorkbookView]
  const out = await wb.xlsx.writeBuffer()
  const bytes = out as unknown as Uint8Array
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

/* ---------------------------------------------------------------- applying */

/** What every new multi-size flower needs, fetched once per import. */
type StoreDefaults = { salesChannelId: string; shippingProfileId: string; locationId: string | null }
let defaultsPromise: Promise<StoreDefaults> | null = null

function storeDefaults(): Promise<StoreDefaults> {
  defaultsPromise ??= (async () => {
    const [channels, profiles, locations] = await Promise.all([
      sdk.client.fetch<{ sales_channels: { id: string }[] }>("/admin/sales-channels?limit=10&fields=id"),
      sdk.client.fetch<{ shipping_profiles: { id: string }[] }>("/admin/shipping-profiles?limit=10&fields=id"),
      sdk.client.fetch<{ stock_locations: { id: string; name: string }[] }>("/admin/stock-locations?limit=10&fields=id,name"),
    ])
    const salesChannelId = channels.sales_channels?.[0]?.id
    const shippingProfileId = profiles.shipping_profiles?.[0]?.id
    if (!salesChannelId || !shippingProfileId) throw new Error("The shop has no sales channel or shipping profile.")
    const loc = locations.stock_locations?.find((l) => /doha/i.test(l.name)) ?? locations.stock_locations?.[0]
    return { salesChannelId, shippingProfileId, locationId: loc?.id ?? null }
  })().catch((err) => {
    defaultsPromise = null
    throw err
  })
  return defaultsPromise
}

const MIME: Record<string, string> = { png: "image/png", jpeg: "image/jpeg", jpg: "image/jpeg", gif: "image/gif", webp: "image/webp" }

/** A pasted picture as a File, ready for the app's shrink-and-upload. */
export const imageFile = (img: SheetImage, name: string) => {
  const ext = img.extension.toLowerCase()
  return new File([img.data as BlobPart], `${handleize(name) || "photo"}.${ext}`, { type: MIME[ext] ?? "image/png" })
}

export type Uploader = (file: File) => Promise<string>

/** Set a size's "can sell" count, making its warehouse level if it has none. */
async function putStock(variant: ShopVariant, canSell: number) {
  const s = stockOf(variant)
  if (!s.itemId) throw new Error(`${variant.title} has no stock record.`)
  const target = Math.max(0, Math.round(canSell)) + s.held
  if (s.locationId) {
    if (target !== s.stocked) await sdk.admin.inventoryItem.updateLevel(s.itemId, s.locationId, { stocked_quantity: target })
    return
  }
  const { locationId } = await storeDefaults()
  if (!locationId) throw new Error("The shop has no warehouse to count stock at.")
  await sdk.admin.inventoryItem.batchInventoryItemLocationLevels(s.itemId, {
    create: [{ location_id: locationId, stocked_quantity: target }],
  })
}

const retrieveForStock = (id: string) =>
  sdk.client.fetch<{ product: ShopProduct }>(`/admin/products/${id}?fields=id,variants.id,variants.title,*variants.prices,${STOCK_FIELDS}`)

/**
 * Write one planned flower. Throws with a message for the florist if any step
 * fails; the photo goes up only once the flower itself has saved, so a
 * refused flower never leaves an orphaned file behind.
 */
export async function applyFlower(
  f: PlanFlower,
  ctx: { prices: ShopPrices; upload: Uploader }
): Promise<string> {
  const saleListId = ctx.prices.sale_price_list_id
  let productId: string
  const notes: string[] = []
  const photoUrlUpFront = f.photo?.kind === "url" ? f.photo.url : null

  if (f.action === "create") {
    const single = f.sizes.length === 1 && f.sizes[0].title === ONE_SIZE
    if (single) {
      const s = f.sizes[0]
      const { product } = await sdk.client.fetch<{ product: { id: string } }>("/admin/quick-products", {
        method: "POST",
        body: {
          title: f.name,
          price: s.base,
          stock: s.stock ?? DEFAULT_STOCK,
          image: photoUrlUpFront,
          description: f.description || null,
          categoryIds: f.categoryIds,
          publish: f.status === "published",
        },
      })
      productId = product.id
    } else {
      const d = await storeDefaults()
      const { product } = await sdk.admin.product.create({
        title: f.name,
        handle: handleize(f.name),
        description: f.description || undefined,
        status: f.status,
        categories: f.categoryIds.map((id) => ({ id })),
        shipping_profile_id: d.shippingProfileId,
        sales_channels: [{ id: d.salesChannelId }],
        ...(photoUrlUpFront ? { thumbnail: photoUrlUpFront, images: [{ url: photoUrlUpFront }] } : {}),
        options: [{ title: "Size", values: f.sizes.map((s) => s.title) }],
        variants: f.sizes.map((s) => ({
          title: s.title,
          manage_inventory: true,
          options: { Size: s.title },
          prices: [{ amount: s.base, currency_code: "qar" }],
        })),
      })
      productId = product.id
      // The create makes each size's stock record but not its count at the warehouse.
      const { product: full } = await retrieveForStock(productId)
      for (const s of f.sizes) {
        const v = full.variants?.find((x) => x.title === s.title)
        if (v) await putStock(v, s.stock ?? DEFAULT_STOCK)
      }
    }
    const onOffer = f.sizes.filter((s) => s.sale != null)
    if (onOffer.length && saleListId) {
      const { product: full } = await retrieveForStock(productId)
      const create = onOffer
        .map((s) => {
          const v = single ? full.variants?.[0] : full.variants?.find((x) => x.title === s.title)
          return v ? { variant_id: v.id, amount: s.sale!, currency_code: "qar" } : null
        })
        .filter((x): x is { variant_id: string; amount: number; currency_code: string } => !!x)
      if (create.length) await sdk.admin.priceList.batchPrices(saleListId, { create })
    }
    notes.push("added")
  } else if (f.action === "update" && f.product) {
    productId = f.product.id
    const descChanged = f.description != null && f.description.trim() !== (f.product.description ?? "").trim()
    if (f.productChanged || photoUrlUpFront) {
      await sdk.admin.product.update(productId, {
        status: f.status,
        categories: f.categoryIds.map((id) => ({ id })),
        ...(descChanged ? { description: f.description! } : {}),
        ...(photoUrlUpFront ? { thumbnail: photoUrlUpFront, images: [{ url: photoUrlUpFront }] } : {}),
      })
    }
    for (const s of f.sizes) {
      if (!s.variant) continue
      if (s.priceChanged) {
        await applyPrice({
          productId,
          variant: s.variant,
          current: ctx.prices.prices[s.variant.id],
          saleListId,
          now: s.sale ?? s.base,
          was: s.sale != null ? s.base : null,
        })
      }
      if (s.stockChanged && s.stock != null) await putStock(s.variant, s.stock)
    }
    notes.push("updated")
  } else {
    return "nothing to do"
  }

  if (f.photo?.kind === "image") {
    try {
      const url = await ctx.upload(imageFile(f.photo.image, f.name))
      await sdk.admin.product.update(productId, { thumbnail: url, images: [{ url }] })
      notes.push("photo")
    } catch (err) {
      return `${notes.join(", ")} — but the photo did not upload: ${messageOf(err)}`
    }
  }
  return notes.join(" + ")
}
