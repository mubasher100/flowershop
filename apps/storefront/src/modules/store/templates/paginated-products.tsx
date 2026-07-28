import { listProductsWithSort } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { getTranslations } from "@lib/i18n/dictionary"
import { OptionValueIds } from "@lib/util/product-option-filters"
import ProductPreview from "@modules/products/components/product-preview"
import { Pagination } from "@modules/store/components/pagination"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

const PRODUCT_LIMIT = 12

type PaginatedProductsParams = {
  limit: number
  collection_id?: string[]
  category_id?: string[]
  tag_id?: string[]
  id?: string[]
  q?: string
  order?: string
}

export type CatalogueFilters = {
  q?: string
  tagIds?: string[]
  categoryIds?: string[]
  minPrice?: number
  maxPrice?: number
}

export default async function PaginatedProducts({
  sortBy,
  page,
  collectionId,
  categoryId,
  productsIds,
  countryCode,
  optionValueIds,
  filters,
}: {
  sortBy?: SortOptions
  page: number
  collectionId?: string
  categoryId?: string
  productsIds?: string[]
  countryCode: string
  optionValueIds?: OptionValueIds
  filters?: CatalogueFilters
}) {
  const { t } = getTranslations(countryCode)

  const hasPriceFilter =
    filters?.minPrice !== undefined || filters?.maxPrice !== undefined

  const queryParams: PaginatedProductsParams = {
    // Price lives on variants and the Store API cannot filter by it, so a
    // price range has to be applied after fetching. Pull the whole catalogue
    // in that case and paginate below. Fine at this size; revisit past a few
    // hundred products, where it should move to a search index.
    limit: hasPriceFilter ? 100 : PRODUCT_LIMIT,
  }

  if (collectionId) {
    queryParams["collection_id"] = [collectionId]
  }

  // A category page scopes to its own category; the filter panel can narrow
  // further within it.
  const categoryIds = [
    ...(categoryId ? [categoryId] : []),
    ...(filters?.categoryIds ?? []),
  ]
  if (categoryIds.length) {
    queryParams["category_id"] = categoryIds
  }

  if (filters?.tagIds?.length) {
    queryParams["tag_id"] = filters.tagIds
  }

  if (filters?.q) {
    queryParams["q"] = filters.q
  }

  if (productsIds) {
    queryParams["id"] = productsIds
  }

  if (sortBy === "created_at") {
    queryParams["order"] = "created_at"
  }

  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  const {
    response: { products: fetched, count: fetchedCount },
  } = await listProductsWithSort({
    page: hasPriceFilter ? 1 : page,
    queryParams,
    sortBy,
    countryCode,
    optionValueIds,
  })

  let products = fetched
  let count = fetchedCount

  if (hasPriceFilter) {
    const min = filters?.minPrice ?? 0
    const max = filters?.maxPrice ?? Number.MAX_SAFE_INTEGER
    // Compare against the cheapest variant, which is the price shown on the
    // card — filtering on any other variant would contradict what is visible.
    const inRange = products.filter((p) => {
      const prices = (p.variants ?? [])
        .map((v) => v.calculated_price?.calculated_amount)
        .filter((n): n is number => typeof n === "number")
      if (!prices.length) return false
      const cheapest = Math.min(...prices)
      return cheapest >= min && cheapest <= max
    })

    count = inRange.length
    const start = (page - 1) * PRODUCT_LIMIT
    products = inRange.slice(start, start + PRODUCT_LIMIT)
  }

  if (!products.length) {
    return (
      <div className="py-16 text-center">
        <p className="font-display text-2xl text-ink-900">
          {t("filter.emptyTitle")}
        </p>
        <p className="mt-2 text-base text-ink-600">{t("filter.emptyBody")}</p>
      </div>
    )
  }

  const totalPages = Math.ceil(count / PRODUCT_LIMIT)

  return (
    <>
      {/* min-w-0 on the items is load-bearing: grid children default to
          min-width:auto, so a long unbreakable product name widens its track
          past its share and scrolls the whole page sideways. Gaps are also
          tighter on phones — gap-x-6 left the two columns cramped at 320px. */}
      <ul
        className="grid w-full grid-cols-2 gap-x-3 gap-y-8 small:grid-cols-3 small:gap-x-6 medium:grid-cols-4"
        data-testid="products-list"
      >
        {products.map((p) => {
          return (
            <li key={p.id} className="min-w-0">
              <ProductPreview
                product={p}
                region={region}
                segment={countryCode}
                headingLevel={2}
              />
            </li>
          )
        })}
      </ul>
      {totalPages > 1 && (
        <Pagination
          data-testid="product-pagination"
          page={page}
          totalPages={totalPages}
        />
      )}
    </>
  )
}
