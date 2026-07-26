import { HttpTypes } from "@medusajs/types"
import ProductRail from "@modules/home/components/featured-products/product-rail"
import PromoBanner, {
  PromoBannerProps,
} from "@modules/home/components/promo-banner"

/**
 * The homepage body: product rails with promotional banners cut between them.
 *
 * This alternation is the defining rhythm of the reference homepage — banner,
 * rail, banner, rail. Stacking every collection back to back instead reads as
 * one undifferentiated scroll, which is what the starter did.
 *
 * Banners are keyed by position so they stay put as collections are added or
 * reordered in the admin.
 */
const BANNERS: Record<number, PromoBannerProps> = {
  1: {
    eyebrow: "In season",
    title: "Peonies are back, briefly",
    body: "Six weeks a year, and then they're gone until next spring.",
    ctaLabel: "Shop the season",
    href: "/collections/new-this-week",
    from: "var(--blush-300)",
    to: "var(--blush-600)",
    tone: "light",
    size: "tall",
  },
  2: {
    eyebrow: "Doha, today",
    title: "Ordered by 6pm, delivered by 9",
    body: "Choose a two-hour window at checkout and we'll hit it.",
    ctaLabel: "Send flowers today",
    href: "/store",
    from: "var(--sage-200)",
    to: "var(--sage-500)",
    tone: "light",
  },
  4: {
    eyebrow: "Gifting",
    title: "Every note handwritten",
    body: "Tell us what to say and we'll write it by hand, sealed in the box.",
    ctaLabel: "Browse gifting",
    href: "/collections/luxury-edit",
    from: "var(--champagne-200)",
    to: "var(--champagne-400)",
    tone: "dark",
  },
}

export default async function FeaturedProducts({
  collections,
  region,
}: {
  collections: HttpTypes.StoreCollection[]
  region: HttpTypes.StoreRegion
}) {
  return collections.map((collection, index) => {
    const banner = BANNERS[index]

    return (
      <li key={collection.id}>
        {banner && <PromoBanner {...banner} />}
        <ProductRail collection={collection} region={region} />
      </li>
    )
  })
}
