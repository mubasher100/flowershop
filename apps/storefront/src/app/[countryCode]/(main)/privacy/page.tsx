import { Metadata } from "next"

import { getTranslations } from "@lib/i18n/dictionary"
import { listRegions } from "@lib/data/regions"
import { alternatesFor, segmentsFor } from "@lib/util/locale"
import { BRAND_NAME } from "@modules/common/components/brand"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import PolicyPage, {
  PolicySection,
} from "@modules/content/components/policy-page"

type Props = { params: Promise<{ countryCode: string }> }

const SECTIONS: PolicySection[] = [
  { heading: "privacy.s1.h", body: "privacy.s1.b" },
  { heading: "privacy.s2.h", body: "privacy.s2.b" },
  { heading: "privacy.s3.h", body: "privacy.s3.b" },
  { heading: "privacy.s4.h", body: "privacy.s4.b" },
  { heading: "privacy.s5.h", body: "privacy.s5.b" },
  { heading: "privacy.s6.h", body: "privacy.s6.b" },
  { heading: "privacy.s7.h" },
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
    title: `${t("page.privacyTitle")} | ${BRAND_NAME}`,
    description: t("page.privacyIntro"),
    alternates: alternatesFor(countryCode, "/privacy"),
  }
}

export default async function PrivacyPage(props: Props) {
  const { countryCode } = await props.params
  return (
    <PolicyPage
      segment={countryCode}
      title="page.privacyTitle"
      intro="page.privacyIntro"
      sections={SECTIONS}
      LinkComponent={LocalizedClientLink}
    />
  )
}
