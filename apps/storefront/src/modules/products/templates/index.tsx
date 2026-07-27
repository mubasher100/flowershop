import React, { Suspense } from "react"

import { getTranslations } from "@lib/i18n/dictionary"
import ImageGallery from "@modules/products/components/image-gallery"
import ProductActions from "@modules/products/components/product-actions"
import ProductTabs from "@modules/products/components/product-tabs"
import RelatedProducts from "@modules/products/components/related-products"
import ProductInfo from "@modules/products/templates/product-info"
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products"
import { notFound } from "next/navigation"
import { HttpTypes } from "@medusajs/types"

import ProductActionsWrapper from "./product-actions-wrapper"

type ProductTemplateProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  countryCode: string
  images: HttpTypes.StoreProductImage[]
}

/**
 * Product page.
 *
 * The starter used three columns — info, gallery, actions — which on a phone
 * stacked into title, description, accordions, THEN the photograph, and only
 * then the price and add-to-bag. The thing being sold appeared halfway down
 * the page.
 *
 * This is a conventional two-column layout: photograph first on mobile, then
 * name, price and size, with supporting detail below. The gallery sticks on
 * desktop so it stays visible while reading.
 */
const ProductTemplate: React.FC<ProductTemplateProps> = ({
  product,
  region,
  countryCode,
  images,
}) => {
  if (!product || !product.id) {
    return notFound()
  }

  const { t } = getTranslations(countryCode)

  return (
    <>
      <div
        className="content-container flex flex-col gap-8 py-6 small:grid small:grid-cols-2 small:items-start small:gap-14 small:py-10"
        data-testid="product-container"
      >
        <div className="small:sticky small:top-40">
          <ImageGallery images={images} />
        </div>

        <div className="flex flex-col gap-8">
          <ProductInfo product={product} />

          <Suspense
            fallback={
              <ProductActions
                disabled={true}
                product={product}
                region={region}
              />
            }
          >
            <ProductActionsWrapper id={product.id} region={region} />
          </Suspense>

          {/* Delivery promise sits with the buy button rather than inside an
              accordion — for flower gifting it is the question that decides
              the purchase, so it should not need a tap to reveal. */}
          <div className="flex flex-col gap-1 rounded-2xl bg-blush-50 p-4">
            <p className="text-sm font-semibold text-ink-900">
              {t("promise.title")}
            </p>
            <p className="text-sm leading-relaxed text-ink-600">
              {t("product.promiseBody")}
            </p>
          </div>

          <ProductTabs />
        </div>
      </div>

      <div
        className="content-container my-12 small:my-20"
        data-testid="related-products-container"
      >
        <Suspense fallback={<SkeletonRelatedProducts />}>
          <RelatedProducts product={product} countryCode={countryCode} />
        </Suspense>
      </div>
    </>
  )
}

export default ProductTemplate
