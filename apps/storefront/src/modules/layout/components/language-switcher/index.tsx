"use client"

import { useTranslations } from "@lib/i18n/use-translations"
import { buildSegment, countryOf, parseSegment } from "@lib/util/locale"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { Suspense } from "react"

/**
 * English ⇄ Arabic toggle.
 *
 * Renders a plain link to the same page in the other language rather than a
 * button that re-routes on click. That keeps the switch crawlable — each
 * locale's pages are prerendered and should be discoverable — and it means the
 * page swaps with a normal navigation instead of a client round trip.
 *
 * The label is always written in the language being offered, which is the
 * convention on every bilingual Gulf storefront: an Arabic speaker looking for
 * their language scans for Arabic script, not for the word "Arabic".
 *
 * A cookie records the choice so the middleware honours it on a later visit
 * that lands on a bare URL.
 */

const linkClass =
  "inline-flex min-h-[2.75rem] items-center px-1 text-sm text-ink-700 transition-colors hover:text-blush-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blush-700"

/** Swaps the locale segment, leaving the rest of the path alone. */
function useTargetPath() {
  const pathname = usePathname()
  const { locale } = useTranslations()

  const segments = pathname.split("/").filter(Boolean)
  const { countryCode } = parseSegment(segments[0])
  const target = locale === "ar" ? "en" : "ar"
  const rest = segments.slice(1)

  // Product and category handles are not translated, so only the first
  // segment differs between the two language trees.
  const base =
    `/${buildSegment(target, countryOf(countryCode))}` +
    (rest.length ? `/${rest.join("/")}` : "")

  return { target, base }
}

function SwitcherLink({ href, target }: { href: string; target: string }) {
  const { t } = useTranslations()

  const remember = () => {
    document.cookie = `_medusa_locale=${target}; path=/; max-age=${
      60 * 60 * 24 * 365
    }; samesite=lax`

    // Flip the document now rather than waiting for DirectionSync's effect,
    // which lands a frame after the route commits — long enough to paint the
    // new language in the old direction. DirectionSync still owns the general
    // case (back, forward, any other route change); this just makes the
    // deliberate switch instant.
    document.documentElement.lang = target
    document.documentElement.dir = target === "ar" ? "rtl" : "ltr"
  }

  return (
    <Link
      href={href}
      onClick={remember}
      hrefLang={target}
      aria-label={t("lang.label")}
      data-testid="language-switcher"
      className={linkClass}
    >
      {/* Rendered in its own script, so it must not inherit the page's
          direction — otherwise the Arabic label mis-orders beside Latin
          punctuation in the header. */}
      <span dir={target === "ar" ? "rtl" : "ltr"}>{t("lang.switchTo")}</span>
    </Link>
  )
}

/** Carries the current filters and page across the language switch. */
function SwitcherWithQuery() {
  const searchParams = useSearchParams()
  const { target, base } = useTargetPath()
  const query = searchParams.toString()

  return <SwitcherLink href={base + (query ? `?${query}` : "")} target={target} />
}

export default function LanguageSwitcher() {
  const { target, base } = useTargetPath()

  /**
   * useSearchParams() opts a component out of static rendering unless it sits
   * under a Suspense boundary — without one the whole product page failed to
   * prerender, because this switcher lives in the nav on every page.
   *
   * The fallback is the same link minus the query string, so the prerendered
   * HTML is already correct and crawlable; the query-preserving version takes
   * over on hydration. Switching language from a filtered catalogue keeps the
   * filters, and every other page is unaffected either way.
   */
  return (
    <Suspense fallback={<SwitcherLink href={base} target={target} />}>
      <SwitcherWithQuery />
    </Suspense>
  )
}
