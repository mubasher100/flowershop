import { segmentsFor } from "@lib/util/locale"
import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getCategoryByHandle, listCategories } from "@lib/data/categories"
import { listRegions } from "@lib/data/regions"
import { HttpTypes, StoreRegion } from "@medusajs/types"
import CategoryTemplate from "@modules/categories/templates"
import { BRAND_NAME } from "@modules/common/components/brand"
import { localizedCategoryName } from "@lib/util/categories"

type Props = {
  params: Promise<{ category: string[]; countryCode: string }>
}

export async function generateStaticParams() {
  const product_categories = await listCategories()

  if (!product_categories) {
    return []
  }

  const countryCodes = await listRegions().then((regions: StoreRegion[]) =>
    regions?.map((r) => r.countries?.map((c) => c.iso_2)).flat()
  )

  const categoryHandles = product_categories.map(
    (category: HttpTypes.StoreProductCategory) => category.handle
  )

  const staticParams = segmentsFor(countryCodes ?? [])
    .map((countryCode: string | undefined) =>
      categoryHandles.map((handle: string) => ({
        countryCode,
        category: [handle],
      }))
    )
    .flat()

  return staticParams
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  try {
    const productCategory = await getCategoryByHandle(params.category)

    // The brand used to be appended twice ("Birthday | Brand | Brand").
    const title = `${localizedCategoryName(
      productCategory.handle,
      productCategory.name,
      params.countryCode,
      productCategory.metadata
    )} | ${BRAND_NAME}`

    const description = productCategory.description || title

    return {
      title,
      description,
      alternates: {
        canonical: `${params.category.join("/")}`,
      },
    }
  } catch {
    notFound()
  }
}

/** Ready-made: reads no query. A filtered view is ../../filtered. */
export default async function CategoryPage(props: Props) {
  const params = await props.params
  const productCategory = await getCategoryByHandle(params.category)

  if (!productCategory) {
    notFound()
  }

  return (
    <CategoryTemplate
      category={productCategory}
      countryCode={params.countryCode}
    />
  )
}
