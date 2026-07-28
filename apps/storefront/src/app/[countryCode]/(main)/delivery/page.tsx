import { getTranslations } from "@lib/i18n/dictionary"
import { segmentsFor } from "@lib/util/locale"
import ContentPage, {
  ContentBlock,
  ContentList,
} from "@modules/content/components/content-page"
import { Metadata } from "next"

import { listRegions } from "@lib/data/regions"

type Props = { params: Promise<{ countryCode: string }> }

/**
 * Areas and windows are the same lists the checkout form offers. They stay in
 * English in both locales on purpose: the shopkeeper reads the area off the
 * order, and a translated address is one they have to translate back.
 */
const AREAS = [
  "Al Dafna", "West Bay", "The Pearl", "Lusail", "Msheireb", "Al Sadd",
  "Bin Mahmoud", "Al Waab", "Aziziya", "Al Rayyan", "Umm Salal",
  "Al Wakrah", "Al Khor", "Education City", "Old Airport", "Muaither",
]

const WINDOWS = [
  "10am – 12pm", "12pm – 2pm", "2pm – 4pm",
  "4pm – 6pm", "6pm – 8pm", "8pm – 9pm",
]

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
    title: `${t("page.deliveryTitle")} | Flowershop`,
    description: t("page.deliveryIntro"),
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
