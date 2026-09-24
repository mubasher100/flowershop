import { getTranslations } from "@lib/i18n/dictionary"
import ContactForm from "@modules/content/components/contact-form"
import { alternatesFor, segmentsFor } from "@lib/util/locale"
import ContentPage, {
  ContentBlock,
} from "@modules/content/components/content-page"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Metadata } from "next"

import { listRegions } from "@lib/data/regions"
import { BRAND_NAME } from "@modules/common/components/brand"

type Props = { params: Promise<{ countryCode: string }> }

/**
 * The shop's WhatsApp number, once there is one.
 *
 * Deliberately not invented: a wrong number on a contact page is worse than no
 * number, because it looks answerable and never is. Set NEXT_PUBLIC_WHATSAPP
 * (digits only, with country code, e.g. 97430000000) and the page turns it
 * into a working wa.me link. Until then it explains the ordering flow, which
 * is genuinely how this shop is reached.
 */
const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP?.replace(/\D/g, "") || null

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
    title: `${t("page.contactTitle")} | ${BRAND_NAME}`,
    description: t("page.contactIntro"),
    alternates: alternatesFor(countryCode, "/contact"),
  }
}

export default async function ContactPage(props: Props) {
  const { countryCode } = await props.params
  const { t } = getTranslations(countryCode)

  return (
    <ContentPage
      title={t("page.contactTitle")}
      intro={t("page.contactIntro")}
      backLabel={t("page.backToShop")}
    >
      {WHATSAPP && (
        <ContentBlock heading={t("contact.askHeading")}>
          <ContactForm whatsapp={WHATSAPP} />
        </ContentBlock>
      )}

      {WHATSAPP && (
        <ContentBlock heading="WhatsApp">
          <a
            href={`https://wa.me/${WHATSAPP}`}
            className="inline-flex min-h-[2.75rem] w-fit items-center rounded-full bg-blush-600 px-6 text-base font-semibold text-white transition-colors hover:bg-blush-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blush-700"
          >
            {/* dir="ltr": a phone number reads left to right in Arabic too. */}
            <span dir="ltr">+{WHATSAPP}</span>
          </a>
        </ContentBlock>
      )}

      <ContentBlock heading={t("page.contactOrder")}>
        <p className="text-base leading-relaxed text-ink-600">
          {t("page.contactOrderBody")}
        </p>
        <LocalizedClientLink
          href="/store"
          className="inline-flex min-h-[2.75rem] w-fit items-center text-sm font-semibold text-blush-700 underline-offset-4 hover:underline"
        >
          {t("nav.shopAll")}
        </LocalizedClientLink>
      </ContentBlock>

      <ContentBlock heading={t("page.contactHours")}>
        <p className="text-base leading-relaxed text-ink-600">
          {t("page.contactHoursBody")}
        </p>
      </ContentBlock>
    </ContentPage>
  )
}
