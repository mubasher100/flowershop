"use client"

import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

import { TranslationKey } from "@lib/i18n/dictionary"
import { useTranslations } from "@lib/i18n/use-translations"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { clx } from "@modules/common/components/ui"

/**
 * Mobile bottom navigation.
 *
 * Phone-only, matching how the local flower-delivery sites are laid out: the
 * primary destinations sit in the thumb zone at the bottom of the screen
 * rather than behind a hamburger at the top, which on a large phone is the
 * hardest part of the display to reach one-handed.
 *
 * Hidden from 1024px up, where the header nav is already reachable.
 *
 * Icons are inline SVG rather than an icon package — five glyphs do not
 * justify a dependency, and these can be tuned to the type weight beside them.
 */

type Item = {
  href: string
  /** Stable identity for keys and the bag-badge check, never rendered. */
  id: string
  label: TranslationKey
  icon: React.ReactNode
  /** Matches this item when the path starts with any of these. */
  match: string[]
}

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
}

const ITEMS: Item[] = [
  {
    href: "/",
    id: "home",
    label: "nav.home",
    match: [""],
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
        <path {...stroke} d="M3 10.5 12 3l9 7.5" />
        <path {...stroke} d="M5.5 9.5V20h13V9.5" />
      </svg>
    ),
  },
  {
    href: "/store",
    id: "shop",
    label: "nav.shop",
    match: ["store", "categories", "collections"],
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
        <path {...stroke} d="M4 7h16l-1.2 12.2a1.8 1.8 0 0 1-1.8 1.6H7a1.8 1.8 0 0 1-1.8-1.6Z" />
        <path {...stroke} d="M9 7a3 3 0 0 1 6 0" />
      </svg>
    ),
  },
  {
    href: "/store?focus=search",
    id: "search",
    label: "nav.search",
    match: ["search"],
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
        <circle {...stroke} cx="11" cy="11" r="6.5" />
        <path {...stroke} d="m16 16 4.5 4.5" />
      </svg>
    ),
  },
  {
    href: "/categories/birthday",
    id: "occasions",
    label: "nav.occasions",
    match: ["birthday", "anniversary", "congratulations"],
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
        <path {...stroke} d="M12 21c-4.5-3-7.5-6-7.5-9.6A4 4 0 0 1 12 8.6a4 4 0 0 1 7.5 2.8C19.5 15 16.5 18 12 21Z" />
      </svg>
    ),
  },
  {
    href: "/cart",
    id: "bag",
    label: "nav.bag",
    match: ["cart", "checkout"],
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
        <path {...stroke} d="M6 8h12l1 12H5Z" />
        <path {...stroke} d="M9 8V6a3 3 0 0 1 6 0v2" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()
  const [count, setCount] = useState<number | null>(null)
  const { t } = useTranslations()

  useEffect(() => {
    let cancelled = false
    fetch("/api/cart-count", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { count: 0 }))
      .then((d) => !cancelled && setCount(d.count ?? 0))
      .catch(() => !cancelled && setCount(0))
    return () => {
      cancelled = true
    }
  }, [pathname])

  // Path is /{countryCode}/rest — compare on the segment after the locale.
  const segment = pathname.split("/").filter(Boolean)[1] ?? ""

  return (
    <nav
      aria-label={t("nav.menu")}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-ink-200/70 bg-white small:hidden"
      // Keeps the bar clear of the iPhone home indicator.
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {ITEMS.map((item) => {
          const active = item.match.includes(segment)
          return (
            <li key={item.id}>
              <LocalizedClientLink
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={clx(
                  "flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[0.68rem] font-medium transition-colors",
                  active ? "text-blush-700" : "text-ink-600"
                )}
              >
                <span className="relative">
                  {item.icon}
                  {item.id === "bag" && count !== null && count > 0 && (
                    <span className="absolute -end-2 -top-1 min-w-[1.05rem] rounded-full bg-blush-600 px-1 text-center text-[0.6rem] font-bold leading-[1.05rem] text-white">
                      {count > 9 ? "9+" : count}
                    </span>
                  )}
                </span>
                {t(item.label)}
              </LocalizedClientLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
