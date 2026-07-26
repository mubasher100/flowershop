import { listProducts } from "@lib/data/products"
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
}: {
  collection: HttpTypes.StoreCollection
  region: HttpTypes.StoreRegion
}) {
  const {
    response: { products: pricedProducts },
  } = await listProducts({
    regionId: region.id,
    queryParams: {
      collection_id: collection.id,
      fields: "*variants.calculated_price",
      limit: 8,
    },
  })

  if (!pricedProducts?.length) {
    return null
  }

  return (
    <section className="content-container py-8 small:py-12">
      <div className="mb-4 flex items-baseline justify-between gap-4 small:mb-6">
        <h2 className="text-2xl text-ink-900 small:text-3xl">
          {collection.title}
        </h2>
        <LocalizedClientLink
          href={`/collections/${collection.handle}`}
          aria-label={`View all in ${collection.title}`}
          className="inline-flex min-h-[2.75rem] flex-none items-center whitespace-nowrap text-sm font-semibold text-blush-700 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blush-700"
        >
          View all
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
            className="w-[43vw] max-w-[15rem] flex-none snap-start xsmall:w-[31vw] small:w-auto small:max-w-none"
          >
            <ProductPreview product={product} region={region} isFeatured />
          </li>
        ))}
      </ul>
    </section>
  )
}
