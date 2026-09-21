"use client"

import { localeOf } from "@lib/util/locale"
import { useParams } from "next/navigation"
import { useMemo } from "react"
import { translate, TranslationKey } from "./dictionary"

/**
 * Translator for client components.
 *
 * Reads the locale from the route rather than from context, so there is no
 * provider to thread through the tree and no serialisation boundary to cross —
 * the segment is already in the URL that rendered the page.
 */
export function useTranslations() {
  const params = useParams()
  const segment = Array.isArray(params?.countryCode)
    ? params.countryCode[0]
    : (params?.countryCode as string | undefined)

  return useMemo(() => {
    const locale = localeOf(segment)
    return {
      locale,
      /** The raw URL segment, for anything that needs to build a path. */
      segment: segment ?? "",
      isRtl: locale === "ar",
      t: (key: TranslationKey, vars?: Record<string, string | number>) =>
        translate(locale, key, vars),
    }
  }, [segment])
}
