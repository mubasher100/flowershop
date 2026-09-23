import Medusa from "@medusajs/js-sdk"

// Defaults to standard port for Medusa server
let MEDUSA_BACKEND_URL = "http://localhost:9000"

if (process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL) {
  MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
}

/**
 * The Medusa client.
 *
 * `sdk.client.fetch` used to be wrapped so every request carried an
 * `x-medusa-locale` header read from a cookie. That one line cost the site
 * its entire cache: reading a cookie during render opts the route out of
 * static rendering, so *every* page that fetched anything — the homepage, the
 * catalogue, every product — was rendered on demand. Nothing landed in the
 * prerender manifest, so the R2 incremental cache had nothing to serve,
 * OpenNext's cache interception never fired, and every visit re-rendered in
 * the Worker and waited on Railway in Singapore. Every response went out as
 * `private, no-cache, no-store`, so browsers could not reuse pages either.
 * The cookie read was inside a try/catch, so nothing ever warned about it.
 *
 * The header was redundant as well as expensive: the locale is in the URL by
 * design — see the localization notes in CLAUDE.md — and the catalogue is not
 * translated, so nothing was reading it. Anything that genuinely needs to
 * tell the backend a locale passes the header on that call.
 */
export const sdk = new Medusa({
  baseUrl: MEDUSA_BACKEND_URL,
  debug: process.env.NODE_ENV === "development",
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
})
