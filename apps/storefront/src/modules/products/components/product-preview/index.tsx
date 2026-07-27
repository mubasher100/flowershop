import { getTranslations } from "@lib/i18n/dictionary"
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
  segment,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  region: HttpTypes.StoreRegion
  segment?: string
}) {
  const { cheapestPrice } = getProductPrice({ product })
  const { t } = getTranslations(segment)

  const hasSizeLadder = (product.variants?.length ?? 0) > 1

  const isOnSale = cheapestPrice?.price_type === "sale"
  const discountPercent =
    isOnSale && cheapestPrice
      ? Math.round(
          ((cheapestPrice.original_price_number -
            cheapestPrice.calculated_price_number) /
            cheapestPrice.original_price_number) *
            100
        )
      : 0

  return (
    <LocalizedClientLink
      href={`/products/${product.handle}`}
      className="group block focus-visible:outline-none"
    >
      <div data-testid="product-wrapper" className="flex flex-col gap-3">
        <div className="relative">
          <Thumbnail
            thumbnail={product.thumbnail}
            images={product.images}
            size="full"
            isFeatured={isFeatured}
            className="group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-blush-700"
          />

          {/* Only shown when a sale price list actually applies, so the badge
              always reflects a real reduction against a real former price. */}
          {isOnSale && discountPercent > 0 && (
            <span className="absolute start-2 top-2 rounded-full bg-blush-600 px-2.5 py-1 text-xs font-bold text-white">
              −{discountPercent}%
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <h3
            className="text-sm leading-snug text-ink-900 small:text-base"
            data-testid="product-title"
          >
            {product.title}
          </h3>

          {/* Wraps, because a discounted item shows two prices side by side
              ("From QAR 1,015.00  QAR 865.00"). Unwrapped, that set a ~165px
              minimum per card and pushed a two-column grid past a 320px
              viewport. */}
          {cheapestPrice && (
            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-sm small:text-base">
              {hasSizeLadder && (
                <span className="text-ink-500">{t("product.from")}</span>
              )}
              <PreviewPrice price={cheapestPrice} />
            </div>
          )}
        </div>
      </div>
    </LocalizedClientLink>
  )
}
