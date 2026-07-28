import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { getTranslations } from "@lib/i18n/dictionary"
import { HttpTypes } from "@medusajs/types"
import Product from "../product-preview"

type RelatedProductsProps = {
  product: HttpTypes.StoreProduct
  countryCode: string
}

export default async function RelatedProducts({
  product,
  countryCode,
}: RelatedProductsProps) {
  const region = await getRegion(countryCode)
  const { t } = getTranslations(countryCode)

  if (!region) {
    return null
  }

  // edit this function to define your related products logic
  const queryParams: HttpTypes.StoreProductListParams = {}
  if (region?.id) {
    queryParams.region_id = region.id
  }
  if (product.collection_id) {
    queryParams.collection_id = [product.collection_id]
  }
  if (product.tags) {
    queryParams.tag_id = product.tags
      .map((t) => t.id)
      .filter(Boolean) as string[]
  }
  queryParams.is_giftcard = false

  const products = await listProducts({
    queryParams,
    countryCode,
  }).then(({ response }) => {
    return response.products.filter(
      (responseProduct) => responseProduct.id !== product.id
    )
  })

  if (!products.length) {
    return null
  }

  return (
    <div className="product-page-constraint">
      {/* Was an unheaded span plus "You might also want to check out these
          products" — starter copy, untranslated, and no heading at all, so
          the section did not appear in the outline a screen reader builds. */}
      <h2 className="mb-6 font-display text-3xl text-ink-900 small:text-4xl">
        {t("product.related")}
      </h2>

      {/* Same min-w-0 guard as the store grid: without it a long product name
          widens its track past its share and scrolls the page sideways. */}
      <ul className="grid w-full grid-cols-2 gap-x-3 gap-y-8 small:grid-cols-3 small:gap-x-6 medium:grid-cols-4">
        {products.map((product) => (
          <li key={product.id} className="min-w-0">
            <Product region={region} product={product} segment={countryCode} />
          </li>
        ))}
      </ul>
    </div>
  )
}
