import { notFound } from "next/navigation"

/**
 * Catch-all for unmatched paths inside a locale.
 *
 * Without it, /ar-qa/anything-wrong fell through to the root not-found, which
 * renders outside the [countryCode] route — so there was no locale to read and
 * an Arabic visitor got an English 404, with no nav or footer to get back from.
 *
 * Calling notFound() here hands off to the not-found boundary in this segment
 * instead, which sits inside the locale layout: correct language, correct
 * direction, and the usual header and footer around it.
 *
 * More specific routes still win — /store, /products/[handle] and the rest are
 * matched before a catch-all, so this only ever sees genuinely unknown paths.
 */
export default function CatchAll() {
  notFound()
}
