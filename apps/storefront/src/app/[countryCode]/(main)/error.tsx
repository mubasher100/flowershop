"use client"

import { useTranslations } from "@lib/i18n/use-translations"
import { unstable_isUnrecognizedActionError } from "next/navigation"
import { useEffect } from "react"

/**
 * The last line of defence for a page that has gone wrong.
 *
 * The usual cause is a deploy: a page loaded from the previous build calls a
 * Server Action by an id the new build does not have. That page is simply
 * out of date, so it reloads itself onto the current build rather than
 * showing anything. Ordering does not depend on this — add to bag, the bag
 * and placing an order go through routes whose addresses never change — but
 * anything else that still uses a Server Action lands here.
 *
 * Anything else gets a plain apology and a way to try again, instead of
 * Next's bare "Application error".
 */
export default function Error({ error }: { error: Error & { digest?: string } }) {
  const { t } = useTranslations()
  const stale = unstable_isUnrecognizedActionError(error)

  useEffect(() => {
    if (stale) window.location.reload()
  }, [stale])

  if (stale) return null

  return (
    <div className="content-container flex min-h-[50vh] flex-col items-center justify-center gap-4 py-16 text-center">
      <h1 className="font-display text-3xl text-ink-900">{t("error.title")}</h1>
      <p className="max-w-md text-base text-ink-700">{t("error.body")}</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex min-h-[3rem] items-center justify-center rounded-full bg-blush-600 px-8 text-base font-semibold text-white hover:bg-blush-700"
      >
        {t("error.retry")}
      </button>
    </div>
  )
}
