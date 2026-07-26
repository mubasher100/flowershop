import { Suspense } from "react"

import { listLocales } from "@lib/data/locales"
import { getLocale } from "@lib/data/locale-actions"
import { listRegions } from "@lib/data/regions"
import { StoreRegion } from "@medusajs/types"
import Brand from "@modules/common/components/brand"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import CategoryNav from "@modules/layout/components/category-nav"
import SideMenu from "@modules/layout/components/side-menu"

export default async function Nav() {
  const [regions, locales, currentLocale] = await Promise.all([
    listRegions().then((regions: StoreRegion[]) => regions),
    listLocales(),
    getLocale(),
  ])

  return (
    <div className="sticky top-0 inset-x-0 z-50 group">
      {/* Delivery bar. The reference site states its promise on every page,
          not just the homepage — the answer to "can it get there in time"
          should never be more than a glance away. */}
      <div className="bg-blush-600 text-white">
        <div className="content-container flex h-8 items-center justify-center gap-2 text-center text-xs font-medium">
          <span>Same-day delivery across Doha · Order before 6pm</span>
        </div>
      </div>

      <header className="relative h-16 mx-auto border-b duration-200 bg-white border-ui-border-base">
        <nav className="content-container txt-xsmall-plus text-ui-fg-subtle flex items-center justify-between w-full h-full text-small-regular">
          <div className="flex-1 basis-0 h-full flex items-center">
            <div className="h-full">
              <SideMenu regions={regions} locales={locales} currentLocale={currentLocale} />
            </div>
          </div>

          <div className="flex items-center h-full">
            <Brand />
          </div>

          {/* min-h-11 on every target: these were 16-20px tall, well under the
              44px a thumb needs. */}
          <div className="flex items-center gap-x-4 h-full flex-1 basis-0 justify-end small:gap-x-6">
            <div className="hidden small:flex items-center gap-x-6 h-full">
              <LocalizedClientLink
                className="inline-flex min-h-[2.75rem] items-center text-ink-700 hover:text-blush-700"
                href="/account"
                data-testid="nav-account-link"
              >
                Account
              </LocalizedClientLink>
            </div>
            <Suspense
              fallback={
                <LocalizedClientLink
                  className="inline-flex min-h-[2.75rem] items-center gap-2 text-ink-700 hover:text-blush-700"
                  href="/cart"
                  data-testid="nav-cart-link"
                >
                  Cart (0)
                </LocalizedClientLink>
              }
            >
              <CartButton />
            </Suspense>
          </div>
        </nav>
      </header>

      <CategoryNav />
    </div>
  )
}
