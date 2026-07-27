import { Metadata } from "next"

import { parseOptionValueIds } from "@lib/util/product-option-filters"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import StoreTemplate from "@modules/store/templates"

export const metadata: Metadata = {
  title: "Store",
  description: "Explore all of our products.",
}

type StorePageSearchParams = Record<string, string | string[] | undefined> & {
  sortBy?: SortOptions
  page?: string
  optionValueIds?: string | string[]
}

type Params = {
  searchParams: Promise<StorePageSearchParams>
  params: Promise<{
    countryCode: string
  }>
}

/** A repeated query param arrives as string[]; a single one as string. */
const toArray = (v: string | string[] | undefined): string[] =>
  v === undefined ? [] : Array.isArray(v) ? v : [v]

const toNumber = (v: string | string[] | undefined): number | undefined => {
  const raw = Array.isArray(v) ? v[0] : v
  if (!raw) return undefined
  const n = Number(raw)
  // Ignore junk rather than filtering everything out on a typo'd URL.
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

export default async function StorePage(props: Params) {
  const params = await props.params
  const searchParams = await props.searchParams
  const { sortBy, page } = searchParams
  const optionValueIds = parseOptionValueIds(searchParams)

  const q = Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q

  return (
    <StoreTemplate
      sortBy={sortBy}
      page={page}
      countryCode={params.countryCode}
      optionValueIds={optionValueIds}
      filters={{
        q: q?.trim() || undefined,
        colours: toArray(searchParams.colour),
        categories: toArray(searchParams.category),
        minPrice: toNumber(searchParams.minPrice),
        maxPrice: toNumber(searchParams.maxPrice),
      }}
    />
  )
}
