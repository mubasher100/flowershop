import type { MetadataRoute } from "next"

import { listCategories } from "@lib/data/categories"
import { listCollections } from "@lib/data/collections"
import { listProducts } from "@lib/data/products"
import { getBaseURL } from "@lib/util/env"
import { LOCALES, buildSegment } from "@lib/util/locale"

/**
 * The sitemap, in both languages.
 *
 * /sitemap.xml used to return the homepage's HTML with a 200, so nothing told
 * Google that the product and category URLs existed at all — which for a new
 * domain is most of the SEO that matters.
 *
 * Every entry is emitted once per locale with the other locale as its
 * alternate, which is what stops en and ar reading as duplicate content.
 */
export const revalidate = 3600

const COUNTRY = "qa"

type Entry = { path: string; changeFrequency: "daily" | "weekly" | "monthly"; priority: number }

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getBaseURL()

  const entries: Entry[] = [
    { path: "", changeFrequency: "daily", priority: 1 },
    { path: "/store", changeFrequency: "daily", priority: 0.9 },
    { path: "/delivery", changeFrequency: "monthly", priority: 0.6 },
    { path: "/flower-care", changeFrequency: "monthly", priority: 0.5 },
    { path: "/contact", changeFrequency: "monthly", priority: 0.5 },
    { path: "/terms", changeFrequency: "monthly", priority: 0.3 },
    { path: "/privacy", changeFrequency: "monthly", priority: 0.3 },
    { path: "/returns", changeFrequency: "monthly", priority: 0.3 },
  ]

  // A failure here must not take the sitemap down with it: a partial map is
  // far better than a 500 where crawlers expect XML.
  try {
    const [{ response }, categories, { collections }] = await Promise.all([
      listProducts({ countryCode: COUNTRY, queryParams: { limit: 100, fields: "handle" } }),
      listCategories({ limit: 50 }),
      listCollections({ fields: "handle", limit: "50" }),
    ])

    for (const p of response?.products ?? []) {
      if (p.handle) {
        entries.push({ path: `/products/${p.handle}`, changeFrequency: "weekly", priority: 0.8 })
      }
    }
    for (const c of categories ?? []) {
      if (c.handle) {
        entries.push({ path: `/categories/${c.handle}`, changeFrequency: "weekly", priority: 0.7 })
      }
    }
    for (const c of collections ?? []) {
      if (c.handle) {
        entries.push({ path: `/collections/${c.handle}`, changeFrequency: "weekly", priority: 0.7 })
      }
    }
  } catch (error) {
    console.error("Sitemap: could not list the catalogue", error)
  }

  const now = new Date()

  return entries.flatMap((entry) =>
    LOCALES.map((locale) => ({
      url: `${base}/${buildSegment(locale, COUNTRY)}${entry.path}`,
      lastModified: now,
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
      alternates: {
        languages: Object.fromEntries(
          LOCALES.map((l) => [
            `${l}-${COUNTRY.toUpperCase()}`,
            `${base}/${buildSegment(l, COUNTRY)}${entry.path}`,
          ])
        ),
      },
    }))
  )
}
