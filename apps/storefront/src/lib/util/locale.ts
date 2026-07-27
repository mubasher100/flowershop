/**
 * Locale-aware URL segments.
 *
 * The first path segment carries both language and country — `/en-qa/...`,
 * `/ar-qa/...` — which is the shape the local competitors use.
 *
 * Locale has to be in the URL rather than a cookie because catalogue pages
 * are statically prerendered: a cookie is unreadable during static
 * generation, so a cached page would always ship the default language. In the
 * URL, each locale gets its own prerendered variant and caching still works.
 */

export const LOCALES = ["en", "ar"] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = "en"

/** Languages written right to left. */
const RTL_LOCALES = new Set<string>(["ar"])

export const isRtl = (locale: string) => RTL_LOCALES.has(locale.split("-")[0])

/**
 * Splits a URL segment into its language and country parts.
 *
 * Accepts a bare country code too ("qa"), so links and requests written
 * before locales existed keep resolving instead of 404ing.
 */
export function parseSegment(segment?: string | null): {
  locale: Locale
  countryCode: string
} {
  const raw = (segment ?? "").toLowerCase()
  const [first, second] = raw.split("-")

  if (second && LOCALES.includes(first as Locale)) {
    return { locale: first as Locale, countryCode: second }
  }

  // Bare country code, e.g. "qa".
  return { locale: DEFAULT_LOCALE, countryCode: first }
}

/** Builds the segment for a language and country: ("ar", "qa") → "ar-qa". */
export const buildSegment = (locale: string, countryCode: string) =>
  `${locale}-${countryCode}`.toLowerCase()

/** The country part alone, for anything that talks to the Store API. */
export const countryOf = (segment?: string | null) =>
  parseSegment(segment).countryCode

/** The language part alone, for `lang` and `dir`. */
export const localeOf = (segment?: string | null) =>
  parseSegment(segment).locale

/**
 * Every locale-and-country segment to prerender, for generateStaticParams.
 *
 * One entry per language per country, so each locale has its own static page
 * and the incremental cache can serve both.
 */
export const segmentsFor = (countryCodes: (string | undefined)[]) =>
  countryCodes
    .filter((c): c is string => Boolean(c))
    .flatMap((countryCode) =>
      LOCALES.map((locale) => buildSegment(locale, countryCode))
    )
