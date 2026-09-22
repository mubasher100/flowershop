import { HttpTypes } from "@medusajs/types"

import { getBaseURL } from "@lib/util/env"
import { BRAND_NAME } from "@modules/common/components/brand"
import { LEGAL } from "@modules/content/components/legal-identity"

/**
 * Structured data.
 *
 * Search engines cannot read a price out of a page's layout — without this,
 * a result for "La Vie en Rose" is a blue link with no price, no availability
 * and no shop behind it. The values come from the same data the page renders,
 * so the markup cannot drift from what the customer sees.
 *
 * Emitted as a plain script tag rather than next/script: this has to be in
 * the HTML a crawler receives, not added after hydration.
 */
const JsonLd = ({ data }: { data: Record<string, unknown> }) => (
  <script
    type="application/ld+json"
    // The payload is our own data, and JSON.stringify escapes it; the
    // closing-tag guard is what stops a product description ending the
    // script element early.
    dangerouslySetInnerHTML={{
      __html: JSON.stringify(data).replace(/</g, "\\u003c"),
    }}
  />
)

/** The shop itself. Rendered once, in the locale layout. */
export function LocalBusinessJsonLd({ segment }: { segment: string }) {
  const base = getBaseURL()

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Florist",
        name: LEGAL.name || BRAND_NAME,
        url: `${base}/${segment}`,
        image: `${base}/brand/logo.png`,
        areaServed: { "@type": "Country", name: "Qatar" },
        address: {
          "@type": "PostalAddress",
          addressCountry: "QA",
          addressLocality: "Doha",
          ...(LEGAL.address ? { streetAddress: LEGAL.address } : {}),
        },
        ...(LEGAL.whatsapp ? { telephone: `+${LEGAL.whatsapp}` } : {}),
        ...(LEGAL.email ? { email: LEGAL.email } : {}),
        currenciesAccepted: "QAR",
        priceRange: "QAR",
        openingHoursSpecification: {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: [
            "Monday", "Tuesday", "Wednesday", "Thursday",
            "Friday", "Saturday", "Sunday",
          ],
          opens: "09:00",
          closes: "21:00",
        },
      }}
    />
  )
}

/** One product, with the price and availability a result can show. */
export function ProductJsonLd({
  product,
  segment,
  currencyCode,
}: {
  product: HttpTypes.StoreProduct
  segment: string
  currencyCode?: string
}) {
  const base = getBaseURL()
  const url = `${base}/${segment}/products/${product.handle}`

  const prices = (product.variants ?? [])
    .map((v) => v.calculated_price?.calculated_amount)
    .filter((p): p is number => typeof p === "number")

  const offers = prices.length
    ? {
        "@type": "AggregateOffer",
        priceCurrency: (currencyCode ?? "qar").toUpperCase(),
        lowPrice: Math.min(...prices),
        highPrice: Math.max(...prices),
        offerCount: prices.length,
        availability: "https://schema.org/InStock",
        url,
      }
    : undefined

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.title,
        description: product.description ?? undefined,
        image: [product.thumbnail, ...(product.images ?? []).map((i) => i.url)]
          .filter(Boolean)
          .slice(0, 5),
        sku: product.handle,
        brand: { "@type": "Brand", name: BRAND_NAME },
        ...(offers ? { offers } : {}),
      }}
    />
  )
}

/** Where the page sits, so a result can show the path rather than a raw URL. */
export function BreadcrumbJsonLd({
  segment,
  trail,
}: {
  segment: string
  trail: { name: string; path: string }[]
}) {
  const base = getBaseURL()

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: trail.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: item.name,
          item: `${base}/${segment}${item.path}`,
        })),
      }}
    />
  )
}
