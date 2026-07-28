import { Metadata } from "next"

import { getBaseURL } from "@lib/util/env"
import { getTranslations } from "@lib/i18n/dictionary"
import Footer from "@modules/layout/templates/footer"
import BottomNav from "@modules/layout/components/bottom-nav"
import DirectionSync from "@modules/layout/components/direction-sync"
import Nav from "@modules/layout/templates/nav"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

/**
 * The layout deliberately fetches nothing.
 *
 * It used to call retrieveCustomer(), retrieveCart() and listCartOptions() on
 * every page to feed two components that could never render here:
 *
 *   - CartMismatchBanner needs a logged-in customer, and this shop has no
 *     accounts, so `customer` was always null.
 *   - FreeShippingPriceNudge needs a shipping option carrying an item_total
 *     price rule; ours are flat 25/50 QAR with no free-shipping tier.
 *
 * That was three backend round trips per page for markup nobody ever saw —
 * and because all three read cookies, it forced every route under (main) into
 * dynamic rendering, which is why the R2 incremental cache could not help the
 * homepage.
 *
 * Restore the nudge when a free-shipping promotion actually exists, but fetch
 * the cart inside that component rather than here.
 */
export default async function PageLayout(props: {
  children: React.ReactNode
  params: Promise<{ countryCode: string }>
}) {
  // The layout is the only place that sees the locale segment for every page
  // under it, so the chrome gets its translator from here rather than each
  // component re-deriving it.
  const { countryCode } = await props.params

  const { t } = getTranslations(countryCode)

  return (
    <>
      <DirectionSync />

      {/* Skip link. Every page puts a delivery bar, a menu, a brand, search,
          a language switch, a bag and a row of categories before the content —
          around a dozen stops for someone tabbing or using a screen reader.
          Visually hidden until focused, which is the point: it is there for
          the keyboard, not the layout. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-[100] focus:inline-flex focus:min-h-[2.75rem] focus:items-center focus:rounded-full focus:bg-blush-700 focus:px-6 focus:text-sm focus:font-semibold focus:text-white"
      >
        {t("a11y.skipToContent")}
      </a>

      <Nav segment={countryCode} />

      {/* pb-16 on mobile keeps the last of the page clear of the fixed bottom
          bar — without it the footer's final links sit underneath it. */}
      <main id="main-content" className="pb-16 small:pb-0">
        {props.children}
      </main>

      <Footer segment={countryCode} />
      <BottomNav />
    </>
  )
}
