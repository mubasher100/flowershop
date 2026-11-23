import { notFound } from "next/navigation"

import { getCategoryByHandle } from "@lib/data/categories"
import { queryString } from "@lib/util/filtered-path"
import { parseOptionValueIds } from "@lib/util/product-option-filters"
import CategoryTemplate from "@modules/categories/templates"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

export { generateMetadata } from "../../../categories/[...category]/page"

type Props = {
  params: Promise<{ category: string[]; countryCode: string }>
  searchParams: Promise<
    Record<string, string | string[] | undefined> & {
      sortBy?: SortOptions
      page?: string
    }
  >
}

/** A category with a sort or page in its address. See lib/util/filtered-path. */
export default async function FilteredCategoryPage(props: Props) {
  const params = await props.params
  const searchParams = await props.searchParams
  const productCategory = await getCategoryByHandle(params.category)

  if (!productCategory) {
    notFound()
  }

  return (
    <CategoryTemplate
      category={productCategory}
      sortBy={searchParams.sortBy}
      page={searchParams.page}
      countryCode={params.countryCode}
      optionValueIds={parseOptionValueIds(searchParams)}
      query={queryString(searchParams)}
    />
  )
}
