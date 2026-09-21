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
  { heading: "terms.s1.h" },
  { heading: "terms.s2.h", body: "terms.s2.b" },
  { heading: "terms.s3.h", body: "terms.s3.b" },
  {
    heading: "terms.s4.h",
    body: "terms.s4.b",
    links: [{ label: "footer.deliveryAreas", href: "/delivery" }],
  },
  { heading: "terms.s5.h", body: "terms.s5.b" },
  {
    heading: "terms.s6.h",
    body: "terms.s6.b",
    links: [{ label: "footer.returns", href: "/returns" }],
  },
  { heading: "terms.s7.h", body: "terms.s7.b" },
  { heading: "terms.s8.h", body: "terms.s8.b" },
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
    title: `${t("page.termsTitle")} | ${BRAND_NAME}`,
    description: t("page.termsIntro"),
    alternates: alternatesFor(countryCode, "/terms"),
  }
}

export default async function TermsPage(props: Props) {
  const { countryCode } = await props.params
  return (
    <PolicyPage
      segment={countryCode}
      title="page.termsTitle"
      intro="page.termsIntro"
      sections={SECTIONS}
      LinkComponent={LocalizedClientLink}
    />
  )
}
