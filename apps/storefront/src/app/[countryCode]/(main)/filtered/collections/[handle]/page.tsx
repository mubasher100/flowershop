import { notFound } from "next/navigation"

import { getCollectionByHandle } from "@lib/data/collections"
import { queryString } from "@lib/util/filtered-path"
import { parseOptionValueIds } from "@lib/util/product-option-filters"
import CollectionTemplate from "@modules/collections/templates"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

export { generateMetadata } from "../../../collections/[handle]/page"

type Props = {
  params: Promise<{ handle: string; countryCode: string }>
  searchParams: Promise<
    Record<string, string | string[] | undefined> & {
      sortBy?: SortOptions
      page?: string
    }
  >
}

/** A collection with a sort or page in its address. See lib/util/filtered-path. */
export default async function FilteredCollectionPage(props: Props) {
  const params = await props.params
  const searchParams = await props.searchParams
  const collection = await getCollectionByHandle(params.handle)

  if (!collection) {
    notFound()
  }

  return (
    <CollectionTemplate
      collection={collection}
      sortBy={searchParams.sortBy}
      page={searchParams.page}
      countryCode={params.countryCode}
      optionValueIds={parseOptionValueIds(searchParams)}
      query={queryString(searchParams)}
    />
  )
}
