import { localizedCategoryName } from "@lib/util/categories"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type ProductInfoProps = {
  product: HttpTypes.StoreProduct
  /** The locale URL segment, for the collection's name. */
  segment?: string
}

const ProductInfo = ({ product, segment }: ProductInfoProps) => {
  return (
    <div id="product-info" className="flex flex-col gap-3">
      {product.collection && (
        <LocalizedClientLink
          href={`/collections/${product.collection.handle}`}
          // -my-2 absorbs the extra height back out of the layout, so the
          // link is a 44px target without opening a gap above the title.
          className="-my-2 inline-flex min-h-[2.75rem] w-fit items-center text-xs font-semibold uppercase tracking-[0.14em] text-blush-700 hover:underline rtl:tracking-normal"
        >
          {localizedCategoryName(
            product.collection.handle,
            product.collection.title,
            segment
          )}
        </LocalizedClientLink>
      )}

      {/* h1, not h2: this is the page's subject. The starter used h2 and left
          the page without a top-level heading. */}
      <h1
        className="font-display text-4xl leading-tight text-ink-900 small:text-5xl"
        data-testid="product-title"
      >
        {product.title}
      </h1>

      <p
        className="max-w-[52ch] whitespace-pre-line text-base leading-relaxed text-ink-600"
        data-testid="product-description"
      >
        {product.description}
      </p>
    </div>
  )
}

export default ProductInfo
