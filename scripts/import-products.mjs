/**
 * Imports the florist's filled-in spreadsheet into Medusa.
 *
 *   node scripts/import-products.mjs path/to/sheet.xlsx            # dry run
 *   node scripts/import-products.mjs path/to/sheet.xlsx --apply    # for real
 *
 * Talks to the Admin API over HTTP rather than running inside the backend, for
 * the same reason scripts/build-image-variants.mjs does: this needs exceljs
 * and sharp, and neither belongs in the bundle that deploys to Railway. It
 * also means the shop can import against production from a laptop without a
 * deploy.
 *
 * Needs, in the environment or apps/backend/.env:
 *   MEDUSA_BACKEND_URL      defaults to the live Railway backend
 *   MEDUSA_ADMIN_EMAIL
 *   MEDUSA_ADMIN_PASSWORD
 *
 * Dry run by default, and deliberately so: this writes to the live catalogue,
 * and a mistyped column heading should show up as a printed report rather than
 * ninety draft products to delete by hand.
 */
import ExcelJS from "exceljs"
import JSZip from "jszip"
import sharp from "sharp"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

const ROOT = path.resolve(import.meta.dirname, "..")

/* ------------------------------------------------------------------ config */

/**
 * Read the admin credentials out of apps/backend/.env without a dependency.
 *
 * Credentials only — deliberately NOT MEDUSA_BACKEND_URL. That variable is
 * the *local* backend for dev (http://localhost:9000), and picking it up here
 * sent the whole import at a backend that was not running.
 */
function loadCredentials() {
  const envPath = path.join(ROOT, "apps/backend/.env")
  if (!existsSync(envPath)) return
  const wanted = ["MEDUSA_ADMIN_EMAIL", "MEDUSA_ADMIN_PASSWORD"]
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line)
    if (!m || !wanted.includes(m[1]) || process.env[m[1]]) continue
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim()
  }
}
loadCredentials()

const PRODUCTION = "https://medusa-backend-sg-production.up.railway.app"

/** Stock for a new flower whose Stock cell is blank. */
const DEFAULT_STOCK = 10
const BACKEND =
  process.argv.includes("--local")
    ? "http://localhost:9000"
    : process.env.IMPORT_BACKEND_URL || PRODUCTION
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD

const [, , sheetArg, ...flags] = process.argv
const APPLY = flags.includes("--apply")

if (!sheetArg || sheetArg.startsWith("--")) {
  console.error(
    [
      "Usage: node scripts/import-products.mjs <sheet.xlsx> [--apply] [--local]",
      "",
      "Without --apply it reads the sheet and reports what it would do.",
      "--local targets http://localhost:9000 instead of the live backend.",
    ].join("\n")
  )
  process.exit(1)
}

const SHEET = path.resolve(sheetArg)
if (!existsSync(SHEET)) {
  console.error(`No such file: ${SHEET}`)
  process.exit(1)
}

/* --------------------------------------------------------------- admin API */

let token = ""

async function admin(method, route, body, { raw } = {}) {
  const res = await fetch(`${BACKEND}${route}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(raw ? {} : { "content-type": "application/json" }),
    },
    body: raw ? body : body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  let json
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    json = { raw: text }
  }

  if (!res.ok) {
    const detail = json?.message || json?.raw || res.statusText
    throw new Error(`${method} ${route} -> ${res.status}: ${String(detail).slice(0, 400)}`)
  }
  return json
}

async function login() {
  if (!EMAIL || !PASSWORD) {
    throw new Error(
      "Set MEDUSA_ADMIN_EMAIL and MEDUSA_ADMIN_PASSWORD (in the environment, or apps/backend/.env)."
    )
  }
  const res = await fetch(`${BACKEND}/auth/user/emailpass`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  const json = await res.json().catch(() => ({}))
  if (!json.token) {
    throw new Error(
      `Could not sign in to ${BACKEND} as ${EMAIL}: ${json.message || res.status}`
    )
  }
  token = json.token
}

/* ---------------------------------------------------------- reading a row */

const HEADINGS = {
  "product name": "name",
  size: "size",
  "price qar": "price",
  "was price qar": "wasPrice",
  "category 1": "cat1",
  "category 2": "cat2",
  "category 3": "cat3",
  "main flower": "variety",
  colour: "colour",
  color: "colour",
  stems: "stems",
  description: "description",
  photo: "photo",
  "photo file name": "photoFile",
  "publish?": "publish",
  stock: "stock",
  "in stock": "stock",
  publish: "publish",
}

/** "Product name *" and "  PRODUCT NAME" are the same column. */
const normaliseHeading = (v) =>
  String(v ?? "")
    .replace(/\*/g, "")
    .trim()
    .toLowerCase()

const cellText = (cell) => {
  const v = cell?.value
  if (v == null) return ""
  if (typeof v === "object") {
    // A hyperlink or rich-text cell. Excel produces these from a paste.
    if (Array.isArray(v.richText)) return v.richText.map((t) => t.text).join("")
    if (v.text != null) return String(v.text)
    if (v.result != null) return String(v.result)
    return ""
  }
  return String(v).trim()
}

const cellNumber = (cell) => {
  const t = cellText(cell).replace(/[^0-9.]/g, "")
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

const handleize = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

/* --------------------------------------------------------------- the sheet */

/**
 * Load the workbook, surviving the cell comments the template ships with.
 *
 * The template puts its guidance in cell notes. Some editors re-save those
 * with an absolute relationship target (`/xl/comments/comment1.xml`) where
 * exceljs expects a relative one, and exceljs then dies on load with
 * "Cannot read properties of undefined (reading 'comments')" — before the
 * importer sees a single row.
 *
 * That is exactly the round trip every filled-in sheet makes, so the comment
 * relationships are stripped from an in-memory copy first. Nothing is read
 * from them, and the file on disk is not touched.
 */
async function loadWorkbook(file) {
  const wb = new ExcelJS.Workbook()
  try {
    await wb.xlsx.readFile(file)
    return wb
  } catch (err) {
    if (!/reading 'comments'/.test(err.message)) throw err
  }

  const zip = await JSZip.loadAsync(readFileSync(file))
  for (const name of Object.keys(zip.files)) {
    if (/^xl\/worksheets\/_rels\/.*\.rels$/.test(name)) {
      const xml = await zip.file(name).async("string")
      zip.file(
        name,
        xml.replace(
          /<Relationship\b[^>]*\/(?:comments|vmlDrawing)"[^>]*\/>/g,
          ""
        )
      )
    }
  }

  const clean = new ExcelJS.Workbook()
  await clean.xlsx.load(await zip.generateAsync({ type: "nodebuffer" }))
  console.log("Note: stripped cell comments to read this workbook.\n")
  return clean
}

async function readSheet() {
  const wb = await loadWorkbook(SHEET)

  const ws =
    wb.getWorksheet("Products") ??
    wb.worksheets.find((w) => w.state !== "veryHidden" && w.rowCount > 1)

  if (!ws) throw new Error("No Products sheet in that workbook.")

  // Column letters by meaning, so a reordered or renamed-with-a-star sheet
  // still imports. A heading we do not recognise is reported, not ignored:
  // silently dropping a column is how a price column goes missing.
  const byKey = {}
  const unknown = []
  ws.getRow(1).eachCell((cell, col) => {
    const key = HEADINGS[normaliseHeading(cell.value)]
    if (key) byKey[key] = col
    else if (normaliseHeading(cell.value)) unknown.push(cellText(cell))
  })

  for (const required of ["name", "price", "cat1"]) {
    if (!byKey[required]) {
      throw new Error(
        `The sheet has no "${required}" column. Headings found: ${ws
          .getRow(1)
          .values.filter(Boolean)
          .join(", ")}`
      )
    }
  }
  if (unknown.length) {
    console.log(`Note: ignoring unrecognised column(s): ${unknown.join(", ")}`)
  }

  /* Photos pasted into cells.
   *
   * xlsx stores them as floating pictures anchored to a position, not as cell
   * values, so they come from getImages() rather than from the row. The
   * anchor's top-left row is 0-based, hence the +1. A picture dragged a little
   * high can anchor to the row above the one it looks like it is in, so the
   * anchor is rounded down and the nearest row *with a product name* wins. */
  const images = new Map()
  for (const img of ws.getImages?.() ?? []) {
    const row = Math.floor(img.range?.tl?.nativeRow ?? img.range?.tl?.row ?? 0) + 1
    const media = wb.getImage(Number(img.imageId))
    if (media?.buffer && !images.has(row)) {
      images.set(row, { buffer: media.buffer, extension: media.extension || "png" })
    }
  }

  const rows = []
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r)
    const get = (key) => (byKey[key] ? cellText(row.getCell(byKey[key])) : "")
    const num = (key) => (byKey[key] ? cellNumber(row.getCell(byKey[key])) : null)

    const name = get("name")
    if (!name) continue
    if (/^example\b/i.test(name.replace(/^\W+/, ""))) continue

    rows.push({
      rowNumber: r,
      name,
      size: get("size"),
      price: num("price"),
      wasPrice: num("wasPrice"),
      stock: num("stock"),
      categories: [get("cat1"), get("cat2"), get("cat3")].filter(Boolean),
      variety: get("variety"),
      colour: get("colour").toLowerCase(),
      stems: num("stems"),
      description: get("description"),
      photoFile: get("photoFile"),
      publish: !/^no$/i.test(get("publish")),
      image: images.get(r) ?? null,
    })
  }

  return rows
}

/* ------------------------------------------------------------------ photos */

/**
 * One photo per product, normalised before it is uploaded.
 *
 * A phone photo is 3–8 MB and 4000px wide. Uploading that as-is means the
 * storefront serves it to a 375px card — which is the exact problem
 * build-image-variants.mjs was written to fix. 1600px WebP is plenty for the
 * largest place any product photo appears.
 */
async function prepareImage(source, handle) {
  const buffer = await sharp(source.buffer)
    .rotate() // honour the phone's EXIF orientation, or portraits arrive sideways
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer()

  return { buffer, filename: `${handle}.webp`, type: "image/webp" }
}

async function uploadImage(prepared) {
  const form = new FormData()
  form.append(
    "files",
    new Blob([prepared.buffer], { type: prepared.type }),
    prepared.filename
  )
  const res = await fetch(`${BACKEND}/admin/uploads`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: form,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || !json.files?.[0]?.url) {
    throw new Error(
      `Upload failed (${res.status}): ${json.message || JSON.stringify(json).slice(0, 200)}`
    )
  }
  return json.files[0].url
}

/* ------------------------------------------------------------------- main */

async function main() {
  const rows = await readSheet()
  if (!rows.length) {
    console.log("No product rows found — every row after the header was blank.")
    return
  }

  // Rows sharing a name are sizes of one product.
  const groups = new Map()
  for (const row of rows) {
    const key = row.name.trim().toLowerCase()
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  }

  // The target is printed before anything happens, every time. This writes to
  // a live catalogue, and "which store did that go into" is not a question
  // anyone should have to answer after the fact.
  console.log(`Sheet:    ${SHEET}`)
  console.log(`Target:   ${BACKEND}`)
  console.log(
    `Products: ${rows.length} row(s) -> ${groups.size} product(s)` +
      (APPLY ? "" : "   [DRY RUN — nothing will be written]") +
      "\n"
  )

  await login()

  /* Everything a product needs to reference, fetched once. */
  const [cats, tags, channels, profiles] = await Promise.all([
    admin("GET", "/admin/product-categories?limit=100&fields=id,name,handle"),
    admin("GET", "/admin/product-tags?limit=100"),
    admin("GET", "/admin/sales-channels?limit=10"),
    admin("GET", "/admin/shipping-profiles?limit=10"),
  ])
  const { stock_locations } = await admin(
    "GET",
    "/admin/stock-locations?limit=10&fields=id,name"
  )
  const stockLocationId = (
    stock_locations.find((l) => /doha/i.test(l.name)) ?? stock_locations[0]
  )?.id

  const catIdByName = new Map(
    (cats.product_categories ?? []).map((c) => [c.name.trim().toLowerCase(), c.id])
  )
  const tagIdByValue = new Map((tags.product_tags ?? []).map((t) => [t.value, t.id]))
  const salesChannelId = channels.sales_channels?.[0]?.id
  const shippingProfileId = profiles.shipping_profiles?.[0]?.id

  if (!salesChannelId || !shippingProfileId) {
    throw new Error(
      "The store has no sales channel or shipping profile. Run seed-qatar.ts first."
    )
  }

  const existing = await admin(
    "GET",
    "/admin/products?limit=500&fields=id,title,handle"
  )
  const idByHandle = new Map(
    (existing.products ?? []).map((p) => [p.handle, p.id])
  )

  /**
   * Puts each size's stock at the warehouse.
   *
   * A blank Stock cell means DEFAULT_STOCK on a new product and "leave it" on
   * an existing one, so re-importing the sheet as a price list never resets
   * counts the florist has since changed in the admin.
   */
  async function setStock(productId, rows, isNew) {
    const { product } = await admin(
      "GET",
      `/admin/products/${productId}?fields=variants.id,variants.title,variants.inventory_items.inventory_item_id,variants.inventory_items.inventory.location_levels.location_id`
    )
    for (const v of product.variants ?? []) {
      const row = rows.find((r) => (r.size || "One size") === v.title)
      const wanted = row?.stock ?? (isNew ? DEFAULT_STOCK : null)
      const link = v.inventory_items?.[0]
      if (wanted == null || !link || !stockLocationId) continue
      const hasLevel = (link.inventory?.location_levels ?? []).some(
        (l) => l.location_id === stockLocationId
      )
      await admin(
        "POST",
        hasLevel
          ? `/admin/inventory-items/${link.inventory_item_id}/location-levels/${stockLocationId}`
          : `/admin/inventory-items/${link.inventory_item_id}/location-levels`,
        hasLevel
          ? { stocked_quantity: wanted }
          : { location_id: stockLocationId, stocked_quantity: wanted }
      )
    }
  }

  /** Tags are created on demand so a new colour does not need a code change. */
  async function tagIdFor(value) {
    if (!value) return null
    if (tagIdByValue.has(value)) return tagIdByValue.get(value)
    if (!APPLY) return `(new tag ${value})`
    const created = await admin("POST", "/admin/product-tags", { value })
    tagIdByValue.set(value, created.product_tag.id)
    return created.product_tag.id
  }

  let created = 0
  let updated = 0
  const problems = []

  for (const [, variantRows] of groups) {
    const lead = variantRows[0]
    const handle = handleize(lead.name)
    const where = `row ${variantRows.map((r) => r.rowNumber).join("+")}`

    /* ---- validate before touching anything ---------------------------- */
    const missingPrice = variantRows.filter((r) => r.price == null)
    if (missingPrice.length) {
      problems.push(`${where} "${lead.name}": no price — skipped`)
      continue
    }

    const catIds = []
    for (const name of new Set(variantRows.flatMap((r) => r.categories))) {
      const id = catIdByName.get(name.trim().toLowerCase())
      if (id) catIds.push(id)
      else
        problems.push(
          `${where} "${lead.name}": category "${name}" does not exist in Medusa — ignored`
        )
    }
    if (!catIds.length) {
      problems.push(
        `${where} "${lead.name}": none of its categories exist — skipped`
      )
      continue
    }

    /* ---- photo -------------------------------------------------------- */
    let imageUrl = null
    let imageSource = null

    if (lead.image) {
      imageSource = "pasted into the sheet"
    } else if (lead.photoFile) {
      const candidate = path.resolve(path.dirname(SHEET), lead.photoFile)
      if (existsSync(candidate)) {
        lead.image = { buffer: readFileSync(candidate), extension: "file" }
        imageSource = lead.photoFile
      } else {
        problems.push(
          `${where} "${lead.name}": photo file "${lead.photoFile}" is not next to the spreadsheet — imported without a photo`
        )
      }
    } else {
      problems.push(`${where} "${lead.name}": no photo`)
    }

    // The photo is uploaded only once the product call has succeeded — see
    // below. Uploading first left an orphaned file in R2 for every product
    // the API then rejected.

    /* ---- body --------------------------------------------------------- */
    const hasSizes = variantRows.some((r) => r.size)
    const options = hasSizes
      ? [{ title: "Size", values: variantRows.map((r) => r.size || "Standard") }]
      : [{ title: "Size", values: ["One size"] }]

    const description = [
      lead.description,
      lead.variety ? `Made with ${lead.variety}.` : "",
      lead.stems ? `${lead.stems} stems.` : "",
    ]
      .filter(Boolean)
      .join(" ")

    const colourTag = await tagIdFor(lead.colour)

    const body = {
      title: lead.name,
      handle,
      description,
      status: lead.publish ? "published" : "draft",
      // The HTTP API takes objects. `category_ids` is the shape the internal
      // workflows use, and the route rejects it outright.
      categories: catIds.map((id) => ({ id })),
      ...(colourTag && APPLY ? { tags: [{ id: colourTag }] } : {}),
      shipping_profile_id: shippingProfileId,
      sales_channels: [{ id: salesChannelId }],
      options,
      variants: variantRows.map((r) => ({
        title: r.size || "One size",
        // Stock is counted: each order takes one off and the storefront shows
        // "sold out" at zero. Medusa makes the inventory item here; the level
        // at the warehouse is set once the product exists (setStock below).
        manage_inventory: true,
        options: { Size: r.size || "One size" },
        prices: [{ amount: r.price, currency_code: "qar" }],
        ...(r.wasPrice
          ? { metadata: { original_price: String(r.wasPrice) } }
          : {}),
      })),
    }

    const existingId = idByHandle.get(handle)
    const verb = existingId ? "update" : "create"

    if (!APPLY) {
      console.log(
        `would ${verb.padEnd(6)} ${lead.name}  —  QAR ${variantRows
          .map((r) => r.price)
          .join("/")}, ${catIds.length} categor${catIds.length === 1 ? "y" : "ies"}` +
          `${hasSizes ? `, ${variantRows.length} sizes` : ""}` +
          `${imageSource ? `, photo ${imageSource}` : ", NO PHOTO"}` +
          `${lead.publish ? "" : ", draft"}`
      )
      existingId ? updated++ : created++
      continue
    }

    try {
      let productId = existingId
      if (existingId) {
        // Variants and options cannot be replaced wholesale on an update —
        // Medusa treats them as their own resources — so an existing product
        // takes everything except its variants. Prices on a product that
        // already has sizes are changed in the admin, or by deleting it first.
        const { options: _o, variants: _v, ...rest } = body
        await admin("POST", `/admin/products/${existingId}`, rest)
        updated++
      } else {
        const res = await admin("POST", "/admin/products", body)
        productId = res.product.id
        created++
      }

      // Stock goes on once the product exists: the create makes each size's
      // inventory item, but not the level at the warehouse, and a size with no
      // level anywhere reads as sold out. On an update only a Stock cell that
      // was filled in changes anything — a blank one leaves the count alone.
      await setStock(productId, variantRows, !existingId)

      // Now that the product exists, the photo has somewhere to go. A failure
      // here leaves a product without a photo, which is reported and fixable
      // in the admin — never a file in R2 that nothing points at.
      let photoNote = ""
      if (lead.image) {
        try {
          imageUrl = await uploadImage(await prepareImage(lead.image, handle))
          await admin("POST", `/admin/products/${productId}`, {
            images: [{ url: imageUrl }],
            thumbnail: imageUrl,
          })
          photoNote = " + photo"
        } catch (err) {
          problems.push(`${where} "${lead.name}": saved without a photo — ${err.message}`)
        }
      }
      console.log(`${existingId ? "updated" : "created"}  ${lead.name}${photoNote}`)
    } catch (err) {
      problems.push(`${where} "${lead.name}": ${err.message}`)
    }
  }

  /* ------------------------------------------------------------- report */
  console.log(
    APPLY
      ? `\n${created} created, ${updated} updated.`
      : `\n${created} would be created, ${updated} would be updated.`
  )

  if (problems.length) {
    console.log(`\n${problems.length} thing(s) worth looking at:`)
    problems.forEach((p) => console.log(`  - ${p}`))
  }

  if (APPLY && created + updated > 0) {
    console.log(
      "\nNext: re-run the image ladder so the new photos are served at phone sizes —\n" +
        "  node scripts/build-image-variants.mjs\n" +
        "then redeploy the storefront (or wait a minute for the cache to expire)."
    )
  } else if (!APPLY) {
    console.log("\nNothing was written. Re-run with --apply to import.")
  }
}

main().catch((err) => {
  console.error(`\n${err.message}`)
  process.exit(1)
})
