import { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  PriceListStatus,

} from "@medusajs/framework/utils"
import {
  createPriceListsWorkflow,
  deletePriceListsWorkflow,
  updateProductVariantsWorkflow,
} from "@medusajs/medusa/core-flows"

/**
 * Competitive pricing, with genuine "was" prices.
 *
 * Benchmarked against the Doha market — mayfairqatar.com and floward.com sit
 * in the 230–1,240 QAR band for comparable arrangements, and both run
 * near-permanent discounts on their rose lines.
 *
 * The mechanics matter here. A struck-through price in Medusa comes from a
 * SALE PRICE LIST overriding a higher default price — it is not a cosmetic
 * field. So the variant's own price is set to the "was" figure and the sale
 * list carries the "now" figure. The storefront then reads price_list_type
 * and renders the strike itself.
 *
 * Products not listed in DISCOUNTS keep a single price and show no strike.
 * Marking the whole catalogue "on sale" permanently is both a dark pattern
 * and, in many jurisdictions, unlawful pricing.
 *
 * Idempotent — the sale list is deleted and rebuilt on each run.
 *
 * Run with:
 *   npx medusa exec ./src/scripts/seed-pricing.ts
 */

const SALE_LIST_TITLE = "Everyday value"

/** Size ladder multipliers, matching seed-catalog. */
const SIZE_FACTOR: Record<string, number> = {
  Petite: 0.75,
  Classic: 1,
  Grandeur: 1.45,
  Majestic: 2.1,
}

/**
 * handle → { was, now } at Classic size, in QAR.
 *
 * Discounts concentrate on the rose and vase lines, which is where the local
 * competition discounts hardest.
 */
const DISCOUNTS: Record<string, { was: number; now: number }> = {
  "50-red-rose-vase": { was: 310, now: 260 },
  "50-white-rose-vase": { was: 310, now: 280 },
  "50-red-rose-wrap": { was: 310, now: 260 },
  "50-pink-rose-vase": { was: 360, now: 310 },
  "100-red-rose-black-vase": { was: 670, now: 570 },
  "200-white-roses": { was: 1240, now: 980 },
  "adliswil-black-vase": { was: 380, now: 320 },
  "astoria-vase": { was: 380, now: 320 },
  "springvale-vase": { was: 390, now: 330 },
  "wellington-vase": { was: 300, now: 240 },
  "chadstone-vase": { was: 400, now: 340 },
  "9-pink-hydrangea-black-vase": { was: 390, now: 330 },
  "9-white-hydrangea-black-vase": { was: 390, now: 330 },
  "chadstone-lisle": { was: 360, now: 300 },
  "gladstone": { was: 420, now: 360 },
  "leukerbad": { was: 380, now: 320 },
  "woburn": { was: 440, now: 380 },
  "james": { was: 430, now: 370 },
  "endless-love": { was: 1350, now: 1150 },
  "montreux-crystal-sphere": { was: 1080, now: 920 },
  "victoria-crystal-sphere": { was: 1420, now: 1220 },
}

const round5 = (n: number) => Math.round(n / 5) * 5

export default async function seedPricing({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "variants.id", "variants.title"],
  })

  type VariantRow = { id: string; title?: string }
  type ProductRow = { handle?: string; variants?: (VariantRow | null)[] | null }

  // --- 1. Raise default prices to the "was" figure -----------------------
  let repriced = 0
  const salePrices: { amount: number; currency_code: string; variant_id: string }[] =
    []

  for (const product of products as unknown as ProductRow[]) {
    const discount = DISCOUNTS[product.handle ?? ""]
    if (!discount) continue

    for (const variant of product.variants ?? []) {
      if (!variant) continue
      const factor = SIZE_FACTOR[variant.title ?? "Classic"] ?? 1

      const was = round5(discount.was * factor)
      const now = round5(discount.now * factor)

      await updateProductVariantsWorkflow(container).run({
        input: {
          selector: { id: variant.id },
          update: { prices: [{ currency_code: "qar", amount: was }] },
        },
      })
      repriced++

      salePrices.push({
        amount: now,
        currency_code: "qar",
        variant_id: variant.id,
      })
    }
  }

  logger.info(`Set "was" prices on ${repriced} variants.`)

  // --- 2. Rebuild the sale price list ------------------------------------
  const { data: existingLists } = await query.graph({
    entity: "price_list",
    fields: ["id", "title"],
  })
  const stale = existingLists.filter((l) => l.title === SALE_LIST_TITLE)

  if (stale.length) {
    await deletePriceListsWorkflow(container).run({
      input: { ids: stale.map((l) => l.id) },
    })
    logger.info(`Removed ${stale.length} existing sale list(s).`)
  }

  if (!salePrices.length) {
    logger.info("No discounted products configured.")
    return
  }

  await createPriceListsWorkflow(container).run({
    input: {
      price_lists_data: [
        {
          title: SALE_LIST_TITLE,
          description:
            "Standing discounts on the rose and vase lines, matching the Doha market.",
          // `type` is not on the workflow's input DTO, but the PriceList model
          // defaults it to SALE — which is what makes the storefront render a
          // struck-through price.
          status: PriceListStatus.ACTIVE,
          prices: salePrices,
        },
      ],
    },
  })

  logger.info(
    `Created sale list "${SALE_LIST_TITLE}" with ${salePrices.length} prices across ${
      Object.keys(DISCOUNTS).length
    } products.`
  )
}
