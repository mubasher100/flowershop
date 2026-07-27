import { segmentsFor } from "@lib/util/locale"
import { Metadata } from "next"

import DeliveryStrip from "@modules/home/components/delivery-strip"
import OccasionTiles from "@modules/home/components/occasion-tiles"
import FeaturedProducts from "@modules/home/components/featured-products"
import HeroCarousel, {
  HeroSlide,
} from "@modules/home/components/hero-carousel"

/**
 * Hero slides.
 *
 * Photography is CC0 (public domain) — see public/IMAGE-CREDITS.json for the
 * source of every file. Swap these for real studio shots of our own
 * arrangements when they exist; nothing else needs to change.
 */
const HERO_SLIDES: HeroSlide[] = [
  {
    image: "/hero/hero-01.jpg",
    alt: "A loose hand-tied bouquet of mixed seasonal flowers",
    eyebrow: "Doha · Same-day delivery",
    title: "Flowers worth the journey",
    body: "Arranged the morning they're delivered. Order before 6pm and it arrives today.",
    ctaLabel: "Shop all flowers",
    href: "/store",
  },
  {
    image: "/hero/hero-02.jpg",
    alt: "Roses arranged closely in a clear glass vase",
    eyebrow: "Signature roses",
    title: "Fifty stems, one gesture",
    body: "Hand-spiralled so the heads sit level, in glass or wrapped in matte paper.",
    ctaLabel: "Shop roses",
    href: "/categories/roses",
  },
  {
    image: "/hero/hero-03.jpg",
    alt: "Pale garden flowers in soft daylight",
    eyebrow: "In season",
    title: "Peonies are back, briefly",
    body: "Six weeks a year, and then they're gone until next spring.",
    ctaLabel: "Shop the season",
    href: "/collections/new-this-week",
  },
  {
    image: "/hero/hero-04.jpg",
    alt: "A luxury flower arrangement in a dark ceramic vase",
    eyebrow: "The luxury edit",
    title: "For the occasions that matter",
    body: "Crystal spheres, hatboxes and hundred-stem arrangements, built to order.",
    ctaLabel: "Browse luxury",
    href: "/collections/luxury-edit",
  },
]
import { listCollections } from "@lib/data/collections"
import { getRegion, listRegions } from "@lib/data/regions"

export const metadata: Metadata = {
  title: "Flowershop — Same-day flower delivery in Doha",
  description:
    "Hand-tied bouquets, vase arrangements and signature roses, arranged in Doha and delivered the same day. Order by 6pm.",
}

/**
 * Rebuild at most every 5 minutes, serving from the R2 incremental cache in
 * between. The homepage shows the catalogue, which is identical for every
 * visitor, yet it was re-rendering and re-fetching collections, categories
 * and five product rails on every single request.
 */
export const revalidate = 300

/**
 * Without this, Next has no way to know which country codes exist, so it
 * renders the homepage on demand — it showed as `ƒ` in the build output while
 * category and product pages showed `●`. That is why the incremental cache
 * had nothing to serve for the busiest page on the site.
 */
export async function generateStaticParams() {
  const countryCodes = await listRegions().then((regions) =>
    regions?.flatMap((r) => r.countries?.map((c) => c.iso_2) ?? [])
  )

  return segmentsFor(countryCodes ?? []).map((countryCode) => ({ countryCode }))
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params

  const { countryCode } = params

  const region = await getRegion(countryCode)

  const { collections } = await listCollections({
    fields: "id, handle, title",
  })

  if (!collections || !region) {
    return null
  }

  return (
    <>
      <HeroCarousel slides={HERO_SLIDES} />

      {/* Best Sellers leads, directly under the carousel — the "Shop by type"
          tiles that used to sit here were removed on request. */}
      <ul className="flex flex-col">
        <FeaturedProducts collections={collections} region={region} />
      </ul>

      {/* Delivery reassurance: in flower gifting, "will it arrive in time"
          blocks the purchase more often than "is it pretty". */}
      <DeliveryStrip />

      {/* Occasion-led browsing is how flower gifting usually starts —
          someone has a birthday, not a craving for hydrangea. */}
      <OccasionTiles />
    </>
  )
}
