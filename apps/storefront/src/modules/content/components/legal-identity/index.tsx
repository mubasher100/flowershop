import { getTranslations } from "@lib/i18n/dictionary"
import { BRAND_NAME } from "@modules/common/components/brand"

/**
 * Who the trader is.
 *
 * Qatar's consumer-protection rules for online sellers require the legal
 * name, commercial registration number, address and a way to reach the
 * business to be shown, and the privacy law needs a contact for data
 * requests. This block is that, in one place, so the footer and each policy
 * page show the same details.
 *
 * Values come from environment variables and rows without a value are not
 * rendered: a made-up CR number or address on a legal page is worse than a
 * missing one. Set them as repo variables (LEGAL_*) for the deploy.
 */
export const LEGAL = {
  name: process.env.NEXT_PUBLIC_LEGAL_NAME?.trim() || BRAND_NAME,
  cr: process.env.NEXT_PUBLIC_LEGAL_CR?.trim() || null,
  address: process.env.NEXT_PUBLIC_LEGAL_ADDRESS?.trim() || null,
  email: process.env.NEXT_PUBLIC_LEGAL_EMAIL?.trim() || null,
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP?.replace(/\D/g, "") || null,
}

export default function LegalIdentity({ segment }: { segment?: string }) {
  const { t } = getTranslations(segment)

  const rows: [string, React.ReactNode][] = [
    [t("legal.tradingName"), LEGAL.name],
  ]
  if (LEGAL.cr) rows.push([t("legal.cr"), <span dir="ltr">{LEGAL.cr}</span>])
  if (LEGAL.address) rows.push([t("legal.address"), LEGAL.address])
  if (LEGAL.whatsapp) {
    rows.push([
      t("legal.whatsapp"),
      <a
        href={`https://wa.me/${LEGAL.whatsapp}`}
        className="inline-flex min-h-[2.75rem] items-center text-blush-700 underline-offset-4 hover:underline"
      >
        <span dir="ltr">+{LEGAL.whatsapp}</span>
      </a>,
    ])
  }
  if (LEGAL.email) {
    rows.push([
      t("legal.email"),
      <a
        href={`mailto:${LEGAL.email}`}
        className="inline-flex min-h-[2.75rem] items-center text-blush-700 underline-offset-4 hover:underline"
      >
        {LEGAL.email}
      </a>,
    ])
  }

  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-base text-ink-600 xsmall:grid-cols-[auto_1fr]">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="font-medium text-ink-800">{label}</dt>
          <dd className="m-0">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
