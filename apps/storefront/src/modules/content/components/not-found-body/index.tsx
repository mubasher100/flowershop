"use client"

import { useTranslations } from "@lib/i18n/use-translations"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * Body of the 404 page.
 *
 * A client component because Next does not pass route params to not-found.tsx,
 * so the locale has to come from useParams. If there is no segment to read —
 * the root 404, reached before any locale is known — it falls back to English,
 * which is what localeOf does with an empty segment.
 *
 * The starter's version said "Page not found / The page you tried to access
 * does not exist" over a bare white screen with no nav. UMN calls out custom
 * 404s specifically: a dead end should still offer a way back into the shop.
 */
export default function NotFoundBody() {
  const { t } = useTranslations()

  return (
    <div className="content-container flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <h1 className="font-display text-4xl text-ink-900 small:text-5xl">
        {t("notFound.title")}
      </h1>

      <p className="mt-4 max-w-[46ch] text-base leading-relaxed text-ink-600">
        {t("notFound.body")}
      </p>

      <div className="mt-8 flex flex-col items-center gap-3 xsmall:flex-row">
        <LocalizedClientLink
          href="/store"
          className="inline-flex min-h-[3rem] items-center justify-center rounded-full bg-blush-600 px-8 text-base font-semibold text-white transition-colors hover:bg-blush-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blush-700"
        >
          {t("notFound.shop")}
        </LocalizedClientLink>

        <LocalizedClientLink
          href="/"
          className="inline-flex min-h-[3rem] items-center justify-center px-4 text-base font-semibold text-blush-700 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blush-700"
        >
          {t("notFound.home")}
        </LocalizedClientLink>
      </div>
    </div>
  )
}
