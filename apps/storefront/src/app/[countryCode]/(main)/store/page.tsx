import { Metadata } from "next"

import { getTranslations } from "@lib/i18n/dictionary"
import { listRegions } from "@lib/data/regions"
import { alternatesFor, segmentsFor } from "@lib/util/locale"
import StoreTemplate from "@modules/store/templates"
import { BRAND_NAME } from "@modules/common/components/brand"

/**
 * "Store / Explore all of our products" was the starter's, and said nothing a
 * searcher would type. UMN's SEO guidance is explicit about putting the words
 * people search for in titles and descriptions.
 */
export async function generateMetadata(props: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  const { countryCode } = await props.params
  const { t } = getTranslations(countryCode)

  return {
    title: `${t("nav.allFlowers")} | ${BRAND_NAME}`,
    description: t("meta.homeDescription"),
    alternates: alternatesFor(countryCode, "/store"),
  }
}

/** Without it Next does not know the locales and renders on demand. */
export async function generateStaticParams() {
  const regions = await listRegions()
  return segmentsFor(
    regions?.flatMap((r) => r.countries?.map((c) => c.iso_2) ?? []) ?? []
  ).map((countryCode) => ({ countryCode }))
}

/** Ready-made: reads no query. A filtered view is ../filtered/store. */
export default async function StorePage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params

  return <StoreTemplate countryCode={countryCode} />
}
