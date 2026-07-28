import { listProducts } from "@lib/data/products"
import { getTranslations } from "@lib/i18n/dictionary"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ProductPreview from "@modules/products/components/product-preview"

/**
 * A titled product rail.
 *
 * Horizontal snap-scroll on phones, grid on desktop. The starter shipped a
 * two-column grid at every width with a 6rem row gap, which on mobile buried
 * the third product far below the fold. Scrolling rails let the homepage
 * carry five collections without becoming endless.
 */
export default async function ProductRail({
  collection,
  region,
  segment,
}: {
  collection: HttpTypes.StoreCollection
  region: HttpTypes.StoreRegion
  segment?: string
}) {
  const { t } = getTranslations(segment)

  const {
    response: { products: pricedProducts },
  } = await listProducts({
    regionId: region.id,
    queryParams: {
      collection_id: collection.id,
      fields: "*variants.calculated_price",
      // Six, not eight. Desktop shows one row of four and a phone scrolls
      // through them, so the last two were never reached — and every extra
      // card is React work in a render that has to fit inside a Worker's CPU
      // allowance. Three rails at eight cards was a third of the homepage's
      // rendering cost going to products nobody saw.
      limit: 6,
    },
  })

  if (!pricedProducts?.length) {
    return null
  }

  return (
    <section className="content-container py-8 small:py-12">
      <div className="mb-4 flex items-baseline justify-between gap-4 small:mb-6">
        <h2 className="font-display text-3xl text-ink-900 small:text-4xl">
          {collection.title}
        </h2>
        <LocalizedClientLink
          href={`/collections/${collection.handle}`}
          aria-label={`${t("section.viewAll")} — ${collection.title}`}
          className="inline-flex min-h-[2.75rem] flex-none items-center whitespace-nowrap text-sm font-semibold text-blush-700 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blush-700"
        >
          {t("section.viewAll")}
        </LocalizedClientLink>
      </div>

      {/* Bleeds to the screen edge on mobile so the next card is visibly
          clipped — that peek is what tells a thumb there is more to see. */}
      <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 small:mx-0 small:grid small:grid-cols-4 small:gap-6 small:overflow-visible small:px-0">
        {/* Card width gives ~2.2 per phone viewport, matching the reference's
            density. At 63vw only one card fit and every rail read as a dead
            end. */}
        {pricedProducts.map((product) => (
          <li
            key={product.id}
            // On desktop the rail is a four-column grid, so any collection
            // whose size is not a multiple of four left a ragged part-row —
            // Best Sellers has five products, which showed as four and a lone
            // orphan. Everything past the fourth is hidden at that width, so
            // every rail is exactly one clean row and "View all" carries the
            // rest. On a phone it stays a scroll, where the count is free.
            className="w-[43vw] max-w-[15rem] flex-none snap-start xsmall:w-[31vw] small:w-auto small:max-w-none small:[&:nth-child(n+5)]:hidden"
          >
            <ProductPreview
              product={product}
              region={region}
              segment={segment}
              isFeatured
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
