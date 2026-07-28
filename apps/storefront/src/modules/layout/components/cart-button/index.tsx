"use client"

import { useCartCount } from "@lib/hooks/use-cart-count"
import { useTranslations } from "@lib/i18n/use-translations"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * Cart badge.
 *
 * Fetches the count client-side from /api/cart-count rather than reading the
 * cart during render. Reading the cart cookie server-side forced every page
 * into dynamic rendering — the reason the R2 incremental cache could not
 * serve the homepage.
 *
 * This also drops the hover dropdown that previewed cart contents. It was
 * desktop-only and cost a full cart fetch on every page load; the bag link
 * goes to the same place in one tap.
 *
 * The count comes from useCartCount, which also listens for adds — it used to
 * refetch only when the pathname changed, so adding to the bag left the badge
 * reading "Bag (0)" until you navigated somewhere.
 */
export default function CartButton() {
  const count = useCartCount()
  const { t } = useTranslations()

  return (
    <LocalizedClientLink
      className="inline-flex min-h-[2.75rem] items-center text-ink-700 hover:text-blush-700"
      href="/cart"
      data-testid="nav-cart-link"
    >
      {t("nav.bag")}
      {count !== null ? ` (${count})` : ""}
    </LocalizedClientLink>
  )
}
