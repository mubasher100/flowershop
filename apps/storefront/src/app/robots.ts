import type { MetadataRoute } from "next"

import { getBaseURL } from "@lib/util/env"

/**
 * robots.txt.
 *
 * Before this existed, /robots.txt fell through to the catch-all route and
 * returned the homepage's HTML with a 200 — so crawlers got markup where
 * crawl directives should be, and never found a sitemap.
 *
 * Cart, checkout, the order pages and the tracking form are all per-visitor
 * and already noindex; keeping them out of the crawl saves the budget for
 * pages that can rank.
 */
export const dynamic = "force-static"

export default function robots(): MetadataRoute.Robots {
  const base = getBaseURL()

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/*/cart", "/*/checkout", "/*/order/", "/*/track"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
