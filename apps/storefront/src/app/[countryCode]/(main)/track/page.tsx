import { Metadata } from "next"

import { getTranslations } from "@lib/i18n/dictionary"
import { listRegions } from "@lib/data/regions"
import { alternatesFor, segmentsFor } from "@lib/util/locale"
import { BRAND_NAME } from "@modules/common/components/brand"
import ContentPage from "@modules/content/components/content-page"
import TrackOrder from "@modules/order/templates/track-order"

type Props = { params: Promise<{ countryCode: string }> }

export async function generateStaticParams() {
  const countryCodes = await listRegions().then((regions) =>
    regions?.flatMap((r) => r.countries?.map((c) => c.iso_2) ?? [])
  )
  return segmentsFor(countryCodes ?? []).map((countryCode) => ({ countryCode }))
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { countryCode } = await props.params
  const { t } = getTranslations(countryCode)
  return {
    title: `${t("page.trackTitle")} | ${BRAND_NAME}`,
    description: t("page.trackIntro"),
    alternates: alternatesFor(countryCode, "/track"),
  }
}

/**
 * The way back to an order.
 *
 * Guest checkout means no account to log into, and nothing is emailed, so
 * without this page a closed browser tab lost the order for good.
 */
export default async function TrackPage(props: Props) {
  const { countryCode } = await props.params
  const { t } = getTranslations(countryCode)

  return (
    <ContentPage
      title={t("page.trackTitle")}
      intro={t("page.trackIntro")}
      backLabel={t("page.backToShop")}
    >
      <TrackOrder />
    </ContentPage>
  )
}
