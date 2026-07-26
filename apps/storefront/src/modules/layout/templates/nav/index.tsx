import { Suspense } from "react"

import { listCategories } from "@lib/data/categories"
import Brand from "@modules/common/components/brand"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import CategoryNav from "@modules/layout/components/category-nav"
import SideMenu, { MenuLink } from "@modules/layout/components/side-menu"

const TYPE_HANDLES = ["bouquets", "vases", "roses", "luxury", "everyday"]
const OCCASION_HANDLES = [
  "birthday",
  "anniversary",
  "congratulations",
  "get-well-soon",
  "new-baby",
  "thank-you",
]

const pick = (
  all: { name?: string; handle?: string }[] | null,
  handles: string[]
): MenuLink[] =>
  handles
    .map((h) => all?.find((c) => c.handle === h))
    .filter(Boolean)
    .map((c) => ({ name: c!.name ?? "", handle: c!.handle ?? "" }))

export default async function Nav() {
  const categories = await listCategories({ limit: 20 })

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
        {/* Header type was txt-xsmall-plus — visibly smaller than everything
            below it, which made the whole bar read as secondary. Matched to
            the body scale instead. */}
        <nav className="content-container flex h-full w-full items-center justify-between text-sm text-ink-700 small:text-base">
          <div className="flex h-full flex-1 basis-0 items-center">
            <SideMenu
              categories={pick(categories, TYPE_HANDLES)}
              occasions={pick(categories, OCCASION_HANDLES)}
            />
          </div>

          <div className="flex items-center h-full">
            <Brand />
          </div>

          {/* No account link. Ordering is guest-only by design — the shop
              confirms stock and follows up on WhatsApp, so an account would
              be a barrier with nothing behind it. */}
          <div className="flex h-full flex-1 basis-0 items-center justify-end">
            <Suspense
              fallback={
                <LocalizedClientLink
                  className="inline-flex min-h-[2.75rem] items-center gap-2 text-ink-700 hover:text-blush-700"
                  href="/cart"
                  data-testid="nav-cart-link"
                >
                  Bag (0)
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
