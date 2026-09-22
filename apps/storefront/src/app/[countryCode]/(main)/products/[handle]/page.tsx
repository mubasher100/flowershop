import { alternatesFor, segmentsFor } from "@lib/util/locale"
import {
  BreadcrumbJsonLd,
  ProductJsonLd,
} from "@modules/common/components/structured-data"
import { Metadata } from "next"
import { notFound } from "next/navigation"
import { listProducts } from "@lib/data/products"
import { getRegion, listRegions } from "@lib/data/regions"
import ProductTemplate from "@modules/products/templates"
import { HttpTypes } from "@medusajs/types"
import { BRAND_NAME } from "@modules/common/components/brand"

type Props = {
  params: Promise<{ countryCode: string; handle: string }>
  searchParams: Promise<{ v_id?: string }>
}

export async function generateStaticParams() {
  try {
    const countryCodes = await listRegions().then((regions) =>
      regions?.map((r) => r.countries?.map((c) => c.iso_2)).flat()
    )

    if (!countryCodes) {
      return []
    }

    const promises = countryCodes.map(async (country) => {
      const { response } = await listProducts({
        countryCode: country,
        queryParams: { limit: 100, fields: "handle" },
      })

      return {
        country,
        products: response.products,
      }
    })

    const countryProducts = await Promise.all(promises)

    // Products are fetched once per country, then fanned out across the
    // languages — the catalogue is identical in both, so fetching per locale
    // would double the build's API calls for no gain.
    return countryProducts
      .flatMap((countryData) =>
        segmentsFor([countryData.country]).flatMap((countryCode) =>
          countryData.products.map((product) => ({
            countryCode,
            handle: product.handle,
          }))
        )
      )
      .filter((param) => param.handle)
  } catch (error) {
    console.error(
      `Failed to generate static paths for product pages: ${
        error instanceof Error ? error.message : "Unknown error"
      }.`
    )
    return []
  }
}

function getImagesForVariant(
  product: HttpTypes.StoreProduct,
  selectedVariantId?: string
) {
  if (!selectedVariantId || !product.variants) {
    return product.images
  }

  const variant = product.variants!.find((v) => v.id === selectedVariantId)
  if (!variant || !variant.images?.length) {
    return product.images
  }

  const imageIdsMap = new Map(variant.images!.map((i) => [i.id, true]))
  return product.images?.filter((i) => imageIdsMap.has(i.id)) ?? null
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const { handle } = params
  const region = await getRegion(params.countryCode)

  if (!region) {
    notFound()
  }

  const product = await listProducts({
    countryCode: params.countryCode,
    queryParams: { handle },
  }).then(({ response }) => response.products[0])

  if (!product) {
    notFound()
  }

  // The description was the title again, which gives a search result two
  // copies of the same line and nothing about the product.
  const description =
    product.description?.trim().slice(0, 155) ||
    `${product.title} — arranged in Doha and delivered the same day.`

  return {
    title: `${product.title} | ${BRAND_NAME}`,
    description,
    alternates: alternatesFor(params.countryCode, `/products/${handle}`),
    openGraph: {
      title: `${product.title} | ${BRAND_NAME}`,
      description,
      images: product.thumbnail ? [product.thumbnail] : [],
    },
  }
}

export default async function ProductPage(props: Props) {
  const params = await props.params
  const region = await getRegion(params.countryCode)
  const searchParams = await props.searchParams

  const selectedVariantId = searchParams.v_id

  if (!region) {
    notFound()
  }

  const pricedProduct = await listProducts({
    countryCode: params.countryCode,
    queryParams: { handle: params.handle },
  }).then(({ response }) => response.products[0])

  // Before anything reads the product: a handle that no longer exists — a
  // flower taken off the shop, an old link — is a 404, not a crash.
  if (!pricedProduct) {
    notFound()
  }

  const images = getImagesForVariant(pricedProduct, selectedVariantId)

  return (
    <>
      {/* So a search result can carry the price and the shop, not just a link. */}
      <ProductJsonLd
        product={pricedProduct}
        segment={params.countryCode}
        currencyCode={region.currency_code}
      />
      <BreadcrumbJsonLd
        segment={params.countryCode}
        trail={[
          { name: "Home", path: "" },
          { name: "All flowers", path: "/store" },
          { name: pricedProduct.title, path: `/products/${pricedProduct.handle}` },
        ]}
      />
      <ProductTemplate
        product={pricedProduct}
        region={region}
        countryCode={params.countryCode}
        images={images ?? []}
      />
    </>
  )
}
