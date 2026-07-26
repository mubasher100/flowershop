import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type ProductInfoProps = {
  product: HttpTypes.StoreProduct
}

const ProductInfo = ({ product }: ProductInfoProps) => {
  return (
    <div id="product-info" className="flex flex-col gap-3">
      {product.collection && (
        <LocalizedClientLink
          href={`/collections/${product.collection.handle}`}
          className="inline-flex w-fit text-xs font-semibold uppercase tracking-[0.14em] text-blush-700 hover:underline"
        >
          {product.collection.title}
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
