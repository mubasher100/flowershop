import { getTranslations } from "@lib/i18n/dictionary"
import Brand from "@modules/common/components/brand"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ChevronDown from "@modules/common/icons/chevron-down"

/**
 * Checkout chrome.
 *
 * Deliberately stripped back — no nav, no rails, nothing to wander off into
 * once someone has decided to buy. The only way out is back to the bag.
 *
 * The starter footed this page with "Powered by Medusa & Next.js" linking to
 * both projects. That is someone else's branding on the last screen before a
 * customer commits, and the two logo links carried no text, so they were also
 * a WCAG 2.1 AA failure (link-name). Removed rather than patched with
 * aria-labels: the fix for branding that should not be there is to delete it.
 */
export default async function CheckoutLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await params
  const { t } = getTranslations(countryCode)

  return (
    <div className="relative w-full bg-white small:min-h-screen">
      <div className="h-16 border-b bg-white">
        <nav className="content-container flex h-full items-center justify-between">
          <LocalizedClientLink
            href="/cart"
            className="flex min-h-[2.75rem] flex-1 basis-0 items-center gap-x-2 text-sm text-ink-600 transition-colors hover:text-ink-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blush-700"
            data-testid="back-to-cart-link"
          >
            {/* rotate-90 points it left; in Arabic the row mirrors, so it has
                to point the other way to still mean "back". */}
            <ChevronDown className="rotate-90 rtl:-rotate-90" size={16} />
            <span>{t("cart.title")}</span>
          </LocalizedClientLink>

          <Brand className="text-xl" />

          <div className="flex-1 basis-0" />
        </nav>
      </div>

      <div className="relative" data-testid="checkout-container">
        {children}
      </div>
    </div>
  )
}
