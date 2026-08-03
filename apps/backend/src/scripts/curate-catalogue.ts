import fs from "fs"
import path from "path"

import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"
import { deleteProductsWorkflow } from "@medusajs/medusa/core-flows"

/**
 * Trims the catalogue to a working size and moves its photography to R2.
 *
 * Two problems, one script, because they touch the same rows.
 *
 * The images were relative paths — `/products/ashford.jpg`. The storefront
 * serves those out of `public/`, so they looked fine there, but the admin runs
 * on the backend domain where the same path is a 404. That is why no
 * thumbnails appeared in the dashboard. Absolute R2 URLs work from both.
 *
 * Which products survive is chosen rather than arbitrary: everything the
 * homepage rails point at is kept, and at least one product per category, so
 * no rail or occasion tile ends up empty. The rest fills by price spread so
 * the range still looks like a shop.
 *
 * Run:  npx medusa exec ./src/scripts/curate-catalogue.ts
 */

const KEEP = Number(process.env.CATALOGUE_SIZE ?? 20)

/** Collections the homepage draws rails from — their products are kept first. */
const RAIL_COLLECTIONS = ["best-sellers", "new-this-week", "under-400"]

const IMAGE_DIR = path.resolve(
  process.cwd(),
  "../storefront/public/products"
)

type Row = {
  id: string
  title: string
  handle: string
  thumbnail: string | null
  collection?: { handle: string } | null
  categories?: { handle: string }[]
  variants?: { prices?: { amount: number }[] }[]
}

export default async function curateCatalogue({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fileService = container.resolve(Modules.FILE)
  const productService = container.resolve(Modules.PRODUCT)

  const { data } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "handle",
      "thumbnail",
      "collection.handle",
      "categories.handle",
      "variants.prices.amount",
    ],
  })

  const products = data as unknown as Row[]
  logger.info(`Catalogue has ${products.length} products; keeping ${KEEP}.`)

  // --- Choose what to keep ------------------------------------------------
  const keep = new Set<string>()
  const coveredCategories = new Set<string>()

  const cheapest = (p: Row) =>
    Math.min(
      ...(p.variants ?? []).flatMap((v) => (v.prices ?? []).map((x) => x.amount)),
      Number.MAX_SAFE_INTEGER
    )

  /**
   * Category coverage comes first.
   *
   * Rails were selected first originally, and the three of them filled all
   * twenty slots between them — so "luxury" and "new-baby" ended up with no
   * products, and their category pages and occasion tiles led nowhere. An
   * empty rail is a missing row; an empty category is a dead end a customer
   * can click into, which is worse.
   *
   * Products are sorted by how many uncovered categories each one brings, so
   * a product in two unrepresented categories is taken before two products in
   * one each.
   */
  const allCategories = new Set(
    products.flatMap((p) => (p.categories ?? []).map((c) => c.handle))
  )

  while (coveredCategories.size < allCategories.size && keep.size < KEEP) {
    const next = products
      .filter((p) => !keep.has(p.id))
      .map((p) => ({
        p,
        gain: (p.categories ?? []).filter(
          (c) => !coveredCategories.has(c.handle)
        ).length,
      }))
      .sort((a, b) => b.gain - a.gain)[0]

    if (!next || next.gain === 0) break

    keep.add(next.p.id)
    next.p.categories?.forEach((c) => coveredCategories.add(c.handle))
  }

  // Then the homepage rails, so each has something to show.
  for (const p of products) {
    if (keep.size >= KEEP) break
    if (keep.has(p.id)) continue
    if (p.collection?.handle && RAIL_COLLECTIONS.includes(p.collection.handle)) {
      keep.add(p.id)
      p.categories?.forEach((c) => coveredCategories.add(c.handle))
    }
  }

  // 3. Fill the rest across the price range rather than taking the first N,
  //    so the shop does not end up all budget or all luxury.
  const remaining = products
    .filter((p) => !keep.has(p.id))
    .sort((a, b) => cheapest(a) - cheapest(b))

  const gap = KEEP - keep.size
  if (gap > 0 && remaining.length) {
    const stride = Math.max(1, Math.floor(remaining.length / gap))
    for (let i = 0; keep.size < KEEP && i < remaining.length; i += stride) {
      keep.add(remaining[i].id)
    }
    // Stride can undershoot; top up from whatever is left.
    for (const p of remaining) {
      if (keep.size >= KEEP) break
      keep.add(p.id)
    }
  }

  const kept = products.filter((p) => keep.has(p.id))
  const drop = products.filter((p) => !keep.has(p.id))

  // --- Move photography to R2 --------------------------------------------
  // Only the survivors, so nothing is uploaded that is about to be deleted.
  let uploaded = 0
  let skipped = 0

  for (const p of kept) {
    const current = p.thumbnail ?? ""

    // Already absolute (an admin upload, or a previous run) — leave alone.
    if (/^https?:\/\//i.test(current)) {
      skipped++
      continue
    }

    const file = path.join(IMAGE_DIR, `${p.handle}.jpg`)
    if (!fs.existsSync(file)) {
      logger.warn(`No local image for "${p.title}" (${p.handle}.jpg) — skipped.`)
      skipped++
      continue
    }

    const [stored] = await fileService.createFiles([
      {
        filename: `${p.handle}.jpg`,
        mimeType: "image/jpeg",
        // base64, not "binary". The provider detects base64 by round-tripping
        // the string and only falls back to a binary decode otherwise, so
        // base64 is the branch that is unambiguous for image bytes.
        content: fs.readFileSync(file).toString("base64"),
        access: "public",
      },
    ])

    await productService.updateProducts(p.id, {
      thumbnail: stored.url,
      images: [{ url: stored.url }],
    })

    uploaded++
    logger.info(`  ${p.title} -> ${stored.url}`)
  }

  logger.info(`Uploaded ${uploaded} image(s); skipped ${skipped}.`)

  // --- Remove the rest ----------------------------------------------------
  if (drop.length) {
    await deleteProductsWorkflow(container).run({
      input: { ids: drop.map((p) => p.id) },
    })
    logger.info(`Removed ${drop.length} product(s).`)
  }

  logger.info(
    `Done. ${kept.length} products remain, covering ${coveredCategories.size} categories.`
  )
}
