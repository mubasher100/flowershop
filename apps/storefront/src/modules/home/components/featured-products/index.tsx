import { HttpTypes } from "@medusajs/types"
import ProductRail from "@modules/home/components/featured-products/product-rail"

/**
 * The homepage product rails.
 *
 * Rail order and membership are driven entirely by collections in the Medusa
 * admin — reorder or rename a collection there and the homepage follows. The
 * only thing hardcoded here is which collections are hidden.
 *
 * Promotional banners between rails were removed on request, along with the
 * Roses and Luxury rails.
 */

/** Collections that exist for browsing but should not get a homepage rail. */
const HIDDEN_FROM_HOMEPAGE = new Set(["roses-always", "luxury-edit"])

/** Best Sellers leads, directly under the carousel. */
const RAIL_ORDER = ["best-sellers", "new-this-week", "under-400"]

export default async function FeaturedProducts({
  collections,
  region,
  segment,
}: {
  collections: HttpTypes.StoreCollection[]
  region: HttpTypes.StoreRegion
  segment?: string
}) {
  const visible = collections.filter(
    (c) => !HIDDEN_FROM_HOMEPAGE.has(c.handle ?? "")
  )

  // Known handles first in a fixed order, then anything new from the admin.
  const ordered = [
    ...RAIL_ORDER.map((h) => visible.find((c) => c.handle === h)).filter(
      Boolean
    ),
    ...visible.filter((c) => !RAIL_ORDER.includes(c.handle ?? "")),
  ] as HttpTypes.StoreCollection[]

  return ordered.map((collection) => (
    <li key={collection.id}>
      <ProductRail
        collection={collection}
        region={region}
        segment={segment}
      />
    </li>
  ))
}
