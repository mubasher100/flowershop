import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../thumbnail"
import PreviewPrice from "./price"

/**
 * Product card.
 *
 * Every product carries a Petite/Classic/Grandeur size ladder, so the card
 * shows a "from" price. Quoting the Classic price would misstate what the
 * cheapest option costs; quoting nothing makes a rail unscannable.
 *
 * Title and price stack rather than sitting on one row — at 375px a name like
 * "100 Red Rose Black Vase" and a price cannot share a line without wrapping
 * into each other.
 */
export default async function ProductPreview({
  product,
  isFeatured,
  region: _region,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  region: HttpTypes.StoreRegion
}) {
  const { cheapestPrice } = getProductPrice({ product })

  const hasSizeLadder = (product.variants?.length ?? 0) > 1

  return (
    <LocalizedClientLink
      href={`/products/${product.handle}`}
      className="group block focus-visible:outline-none"
    >
      <div data-testid="product-wrapper" className="flex flex-col gap-3">
        <Thumbnail
          thumbnail={product.thumbnail}
          images={product.images}
          size="full"
          isFeatured={isFeatured}
          className="group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-blush-700"
        />

        <div className="flex flex-col gap-1">
          <h3
            className="text-sm leading-snug text-ink-900 small:text-base"
            data-testid="product-title"
          >
            {product.title}
          </h3>

          {cheapestPrice && (
            <div className="flex items-center gap-x-1.5 text-sm small:text-base">
              {hasSizeLadder && <span className="text-ink-500">From</span>}
              <PreviewPrice price={cheapestPrice} />
            </div>
          )}
        </div>
      </div>
    </LocalizedClientLink>
  )
}
