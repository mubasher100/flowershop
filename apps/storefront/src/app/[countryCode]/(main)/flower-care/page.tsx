import { getTranslations } from "@lib/i18n/dictionary"
import { alternatesFor, segmentsFor } from "@lib/util/locale"
import ContentPage, {
  ContentList,
} from "@modules/content/components/content-page"
import { Metadata } from "next"

import { listRegions } from "@lib/data/regions"

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
    title: `${t("page.careTitle")} | Flowershop`,
    description: t("page.careIntro"),
    alternates: alternatesFor(countryCode, "/flower-care"),
  }
}

export default async function FlowerCarePage(props: Props) {
  const { countryCode } = await props.params
  const { t } = getTranslations(countryCode)

  // The same five points as the product page accordion — one source, so
  // advice cannot drift between the two places it appears.
  const points = [
    t("care.trim"),
    t("care.water"),
    t("care.sun"),
    t("care.fruit"),
    t("care.leaves"),
  ]

  return (
    <ContentPage
      title={t("page.careTitle")}
      intro={t("page.careIntro")}
      backLabel={t("page.backToShop")}
    >
      <ContentList items={points} />
    </ContentPage>
  )
}
