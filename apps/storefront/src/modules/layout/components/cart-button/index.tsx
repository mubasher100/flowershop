"use client"

import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

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
 * Renders "Bag" immediately and fills the count in when it arrives, so
 * nothing blocks paint.
 */
export default function CartButton() {
  const [count, setCount] = useState<number | null>(null)
  const pathname = usePathname()
  const { t } = useTranslations()

  useEffect(() => {
    let cancelled = false

    fetch("/api/cart-count", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { count: 0 }))
      .then((d) => {
        if (!cancelled) setCount(d.count ?? 0)
      })
      .catch(() => {
        if (!cancelled) setCount(0)
      })

    return () => {
      cancelled = true
    }
    // Re-runs after navigation, so the badge updates once an item is added.
  }, [pathname])

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
