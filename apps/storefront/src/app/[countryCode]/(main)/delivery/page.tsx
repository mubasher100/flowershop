import { getTranslations } from "@lib/i18n/dictionary"
import { alternatesFor, segmentsFor } from "@lib/util/locale"
import ContentPage, {
  ContentBlock,
  ContentList,
} from "@modules/content/components/content-page"
import { Metadata } from "next"

import { listRegions } from "@lib/data/regions"
import {
  DELIVERY_AREAS as AREAS,
  DELIVERY_WINDOWS as WINDOWS,
} from "@lib/util/delivery"
import { BRAND_NAME } from "@modules/common/components/brand"

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
    title: `${t("page.deliveryTitle")} | ${BRAND_NAME}`,
    description: t("page.deliveryIntro"),
    alternates: alternatesFor(countryCode, "/delivery"),
  }
}

export default async function DeliveryPage(props: Props) {
  const { countryCode } = await props.params
  const { t } = getTranslations(countryCode)

  return (
    <ContentPage
      title={t("page.deliveryTitle")}
      intro={t("page.deliveryIntro")}
      backLabel={t("page.backToShop")}
    >
      <ContentBlock heading={t("promise.title")}>
        <p className="text-base leading-relaxed text-ink-600">
          {t("product.promiseBody")}
        </p>
      </ContentBlock>

      <ContentBlock heading={t("page.windowsHeading")}>
        <ContentList items={WINDOWS} />
      </ContentBlock>

      <ContentBlock heading={t("page.areasHeading")}>
        {/* Two columns from the small breakpoint up; sixteen areas is a long
            single column on a wide screen and a fine one on a phone. */}
        <ul className="grid grid-cols-1 gap-x-8 gap-y-2 text-base text-ink-600 xsmall:grid-cols-2">
          {AREAS.map((area) => (
            <li key={area}>{area}</li>
          ))}
        </ul>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">
          {t("page.areasNote")}
        </p>
      </ContentBlock>
    </ContentPage>
  )
}
