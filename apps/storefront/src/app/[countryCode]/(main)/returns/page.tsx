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
  { heading: "returns.s1.h", body: "returns.s1.b" },
  { heading: "returns.s2.h", body: "returns.s2.b" },
  { heading: "returns.s3.h", body: "returns.s3.b" },
  { heading: "returns.s4.h", body: "returns.s4.b" },
  { heading: "returns.s5.h", body: "returns.s5.b" },
  {
    heading: "returns.s6.h",
    body: "returns.s6.b",
    links: [{ label: "footer.contact", href: "/contact" }],
  },
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
    title: `${t("page.returnsTitle")} | ${BRAND_NAME}`,
    description: t("page.returnsIntro"),
    alternates: alternatesFor(countryCode, "/returns"),
  }
}

export default async function ReturnsPage(props: Props) {
  const { countryCode } = await props.params
  return (
    <PolicyPage
      segment={countryCode}
      title="page.returnsTitle"
      intro="page.returnsIntro"
      sections={SECTIONS}
      LinkComponent={LocalizedClientLink}
    />
  )
}
