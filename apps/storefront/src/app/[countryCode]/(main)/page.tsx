import { segmentsFor } from "@lib/util/locale"
import { Metadata } from "next"

import DeliveryStrip from "@modules/home/components/delivery-strip"
import OccasionTiles from "@modules/home/components/occasion-tiles"
import FeaturedProducts from "@modules/home/components/featured-products"
import HeroCarousel, {
  HeroSlide,
} from "@modules/home/components/hero-carousel"

import { getTranslations } from "@lib/i18n/dictionary"
import { listCollections } from "@lib/data/collections"
import { getRegion, listRegions } from "@lib/data/regions"

/**
 * Hero slides.
 *
 * Only the image and destination are fixed here; every word comes from the
 * dictionary, so the carousel — the largest block of type on the site — reads
 * in the visitor's language rather than staying English on /ar-qa.
 *
 * Photography is CC0 (public domain) — see public/IMAGE-CREDITS.json for the
 * source of every file. Swap these for real studio shots of our own
 * arrangements when they exist; nothing else needs to change.
 */
const HERO_SLIDES = [
  { image: "/hero/hero-01.jpg", key: "hero.1", href: "/store" },
  { image: "/hero/hero-02.jpg", key: "hero.2", href: "/categories/roses" },
  {
    image: "/hero/hero-03.jpg",
    key: "hero.3",
    href: "/collections/new-this-week",
  },
  {
    image: "/hero/hero-04.jpg",
    key: "hero.4",
    href: "/collections/luxury-edit",
  },
] as const

export async function generateMetadata(props: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  const { countryCode } = await props.params
  const { t } = getTranslations(countryCode)

  return {
    title: t("meta.homeTitle"),
    description: t("meta.homeDescription"),
  }
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
  const { t } = getTranslations(countryCode)

  const { collections } = await listCollections({
    fields: "id, handle, title",
  })

  if (!collections || !region) {
    return null
  }

  const slides: HeroSlide[] = HERO_SLIDES.map((slide) => ({
    image: slide.image,
    href: slide.href,
    // The const assertion above narrows `key` to the literal union, so these
    // template keys are checked against the dictionary — a typo or a missing
    // hero string is a build error, not a raw key rendered on the page.
    alt: t(`${slide.key}.alt`),
    eyebrow: t(`${slide.key}.eyebrow`),
    title: t(`${slide.key}.title`),
    body: t(`${slide.key}.body`),
    ctaLabel: t(`${slide.key}.cta`),
  }))

  return (
    <>
      <HeroCarousel slides={slides} />

      {/* Best Sellers leads, directly under the carousel — the "Shop by type"
          tiles that used to sit here were removed on request. */}
      <ul className="flex flex-col">
        <FeaturedProducts
          collections={collections}
          region={region}
          segment={countryCode}
        />
      </ul>

      {/* Delivery reassurance: in flower gifting, "will it arrive in time"
          blocks the purchase more often than "is it pretty". */}
      <DeliveryStrip segment={countryCode} />

      {/* Occasion-led browsing is how flower gifting usually starts —
          someone has a birthday, not a craving for hydrangea. */}
      <OccasionTiles segment={countryCode} />
    </>
  )
}
