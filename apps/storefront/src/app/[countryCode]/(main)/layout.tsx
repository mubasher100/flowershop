import { Metadata } from "next"

import { getBaseURL } from "@lib/util/env"
import Footer from "@modules/layout/templates/footer"
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
export default async function PageLayout(props: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      {props.children}
      <Footer />
    </>
  )
}
