import { Suspense } from "react"

import { listCategories } from "@lib/data/categories"
import { listProducts } from "@lib/data/products"
import { OptionValueIds } from "@lib/util/product-option-filters"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import FilterPanel, {
  FilterOption,
} from "@modules/store/components/filter-panel"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

import PaginatedProducts, { CatalogueFilters } from "./paginated-products"

/** Type categories only — occasions have their own homepage section. */
const TYPE_HANDLES = ["bouquets", "vases", "roses", "luxury", "everyday"]

/**
 * Builds the colour and price facets from the catalogue itself rather than a
 * hardcoded list, so a colour added in the admin shows up as a filter without
 * a code change.
 */
async function getFacets(countryCode: string) {
  const { response } = await listProducts({
    countryCode,
    queryParams: { limit: 100, fields: "*tags,*variants.calculated_price" },
  })

  const colourCounts = new Map<string, { id: string; n: number }>()
  let maxPrice = 0

  for (const product of response.products) {
    for (const tag of product.tags ?? []) {
      if (!tag?.value || !tag.id) continue
      const entry = colourCounts.get(tag.value) ?? { id: tag.id, n: 0 }
      entry.n += 1
      colourCounts.set(tag.value, entry)
    }
    for (const variant of product.variants ?? []) {
      const amount = variant.calculated_price?.calculated_amount
      if (typeof amount === "number" && amount > maxPrice) maxPrice = amount
    }
  }

  const colours: FilterOption[] = Array.from(colourCounts.entries())
    .sort((a, b) => b[1].n - a[1].n)
    .map(([value]) => ({
      label: value.charAt(0).toUpperCase() + value.slice(1),
      value,
    }))

  const tagIdByValue = new Map(
    Array.from(colourCounts.entries()).map(([value, { id }]) => [value, id])
  )

  return {
    colours,
    tagIdByValue,
    // Rounded up so the placeholder max never sits just below a real product.
    maxPrice: Math.ceil(maxPrice / 50) * 50 || 1500,
  }
}

const StoreTemplate = async ({
  sortBy,
  page,
  countryCode,
  optionValueIds,
  filters,
}: {
  sortBy?: SortOptions
  page?: string
  countryCode: string
  optionValueIds?: OptionValueIds
  filters?: {
    q?: string
    colours?: string[]
    categories?: string[]
    minPrice?: number
    maxPrice?: number
  }
}) => {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  const [{ colours, tagIdByValue, maxPrice }, allCategories] =
    await Promise.all([getFacets(countryCode), listCategories({ limit: 20 })])

  const categoryOptions: FilterOption[] = TYPE_HANDLES.map((h) =>
    allCategories?.find((c) => c.handle === h)
  )
    .filter(Boolean)
    .map((c) => ({ label: c!.name ?? "", value: c!.handle ?? "" }))

  const categoryIdByHandle = new Map(
    (allCategories ?? []).map((c) => [c.handle, c.id])
  )

  // The URL speaks in human-readable handles and colour names; the Store API
  // needs IDs. Resolving here keeps the shareable URL readable.
  const resolved: CatalogueFilters = {
    q: filters?.q,
    tagIds: (filters?.colours ?? [])
      .map((c) => tagIdByValue.get(c))
      .filter(Boolean) as string[],
    categoryIds: (filters?.categories ?? [])
      .map((h) => categoryIdByHandle.get(h))
      .filter(Boolean) as string[],
    minPrice: filters?.minPrice,
    maxPrice: filters?.maxPrice,
  }

  return (
    <div
      className="content-container flex flex-col gap-8 py-6 small:flex-row small:items-start small:gap-12"
      data-testid="category-container"
    >
      <FilterPanel
        sortBy={sort}
        colours={colours}
        categories={categoryOptions}
        maxPrice={maxPrice}
      />

      {/* min-w-0 so a long product name can't widen the grid past the row. */}
      <div className="w-full min-w-0">
        <h1
          className="mb-6 font-display text-3xl text-ink-900 small:text-4xl"
          data-testid="store-page-title"
        >
          All flowers
        </h1>
        <Suspense fallback={<SkeletonProductGrid />}>
          <PaginatedProducts
            sortBy={sort}
            page={pageNumber}
            countryCode={countryCode}
            optionValueIds={optionValueIds}
            filters={resolved}
          />
        </Suspense>
      </div>
    </div>
  )
}

export default StoreTemplate
