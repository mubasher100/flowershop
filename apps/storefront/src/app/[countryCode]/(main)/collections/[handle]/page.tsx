import { segmentsFor } from "@lib/util/locale"
import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getCollectionByHandle, listCollections } from "@lib/data/collections"
import { listRegions } from "@lib/data/regions"
import { StoreCollection, StoreRegion } from "@medusajs/types"
import CollectionTemplate from "@modules/collections/templates"
import { BRAND_NAME } from "@modules/common/components/brand"
import { localizedCategoryName } from "@lib/util/categories"

type Props = {
  params: Promise<{ handle: string; countryCode: string }>
}

export const PRODUCT_LIMIT = 12

export async function generateStaticParams() {
  const { collections } = await listCollections({
    fields: "*products",
  })

  if (!collections) {
    return []
  }

  const countryCodes = await listRegions().then(
    (regions: StoreRegion[]) =>
      regions
        ?.map((r) => r.countries?.map((c) => c.iso_2))
        .flat()
        .filter(Boolean) as string[]
  )

  const collectionHandles = collections.map(
    (collection: StoreCollection) => collection.handle
  )

  const staticParams = segmentsFor(countryCodes ?? [])
    .map((countryCode: string) =>
      collectionHandles.map((handle: string | undefined) => ({
        countryCode,
        handle,
      }))
    )
    .flat()

  return staticParams
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const collection = await getCollectionByHandle(params.handle)

  if (!collection) {
    notFound()
  }

  const name = localizedCategoryName(
    collection.handle,
    collection.title,
    params.countryCode
  )
  const metadata = {
    title: `${name} | ${BRAND_NAME}`,
    description: `${name} | ${BRAND_NAME}`,
  } as Metadata

  return metadata
}

/** Ready-made: reads no query. A filtered view is ../../filtered. */
export default async function CollectionPage(props: Props) {
  const params = await props.params
  const collection = await getCollectionByHandle(params.handle)

  if (!collection) {
    notFound()
  }

  return (
    <CollectionTemplate
      collection={collection}
      countryCode={params.countryCode}
    />
  )
}
