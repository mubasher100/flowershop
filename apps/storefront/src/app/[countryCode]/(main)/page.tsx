import { alternatesFor, segmentsFor } from "@lib/util/locale"
import { Metadata } from "next"

import DeliveryStrip from "@modules/home/components/delivery-strip"
import OccasionTiles from "@modules/home/components/occasion-tiles"
import FeaturedProducts from "@modules/home/components/featured-products"
import HeroCarousel, {
  HeroSlide,
} from "@modules/home/components/hero-carousel"

import { getTranslations } from "@lib/i18n/dictionary"
import { listCollections } from "@lib/data/collections"
import { listHomepageSections } from "@lib/data/homepage"
import { getRegion, listRegions } from "@lib/data/regions"
import { headingFor } from "@lib/util/homepage"
import { BRAND_NAME } from "@modules/common/components/brand"
import ProductRail from "@modules/home/components/featured-products/product-rail"
import PromoBanner from "@modules/home/components/promo-banner"

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
  // The brand slide. The photograph is cropped from the brand reference —
  // tulips in blush wrapping with the shop's own ribbon — and the title is
  // the wordmark rather than text.
  { image: "/hero/tulips.jpg", key: "hero.1", href: "/store", wordmark: true },
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
    alternates: alternatesFor(countryCode),
  }
}

/**
 * Effectively static, refreshed by tag invalidation rather than by a timer.
 *
 * This was 300s, which meant the heaviest page on the site re-rendered every
 * five minutes per locale — hero, three product rails and the occasion tiles,
 * seven backend calls and around twenty product cards. That does not fit in a
 * Cloudflare Worker's CPU allowance, so the render died with a 1102 and the
 * cache was never repopulated: the Arabic homepage could not recover, because
 * every attempt to produce a cached copy was the thing that failed.
 *
 * A day is long enough that the page is served from cache essentially always.
 * Freshness comes from the `homepage` and `products` tags instead — the
 * backend purges them when the shopkeeper changes anything, which it can now
 * actually do since the tag cache is real.
 */
export const revalidate = 86400

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
  const { t, locale } = getTranslations(countryCode)

  const { collections } = await listCollections({
    fields: "id, handle, title",
  })

  if (!collections || !region) {
    return null
  }

  const slides: HeroSlide[] = HERO_SLIDES.map((slide) => ({
    image: slide.image,
    href: slide.href,
    wordmark: "wordmark" in slide && slide.wordmark,
    // The const assertion above narrows `key` to the literal union, so these
    // template keys are checked against the dictionary — a typo or a missing
    // hero string is a build error, not a raw key rendered on the page.
    alt: t(`${slide.key}.alt`),
    eyebrow: t(`${slide.key}.eyebrow`),
    title: t(`${slide.key}.title`),
    body: t(`${slide.key}.body`),
    ctaLabel: t(`${slide.key}.cta`),
  }))

  /**
   * The blocks below the carousel come from the admin. If the request fails or
   * nothing has been configured yet, fall back to the layout this page used to
   * hardcode — an unreachable backend should cost the homepage its rails, not
   * render an empty shop.
   */
  const sections = await listHomepageSections()
  const collectionByHandle = new Map(collections.map((c) => [c.handle, c]))

  /**
   * Hero slides ride on the same request as everything else.
   *
   * Deliberately not a second endpoint: the homepage render has to fit inside
   * a Worker's CPU allowance, and an extra round trip on the busiest page is
   * exactly what it cannot afford. Configured slides replace the built-in
   * ones entirely; with none configured the hardcoded set still shows, so the
   * carousel is never empty.
   */
  const configuredHero = sections.filter((s) => s.type === "hero_slide")
  const bodySections = sections.filter((s) => s.type !== "hero_slide")

  const heroSlides: HeroSlide[] = configuredHero.length
    ? configuredHero.map((s) => {
        const heading = headingFor(s, locale)
        return {
          image: s.image_url ?? "",
          // The heading sits next to the image, so repeating it as alt text
          // would be read twice. It is the best available description short
          // of a dedicated field, and better than an empty string here.
          alt: heading,
          eyebrow: s.subtitle ?? "",
          title: heading,
          body: s.subtitle ?? "",
          ctaLabel: s.cta_label ?? t("nav.shopAll"),
          href: s.cta_href ?? "/store",
        }
      })
    : slides

  return (
    <>
      {/* The homepage had no h1 at all — the carousel's slide titles are h2s
          that change every few seconds, so there was nothing stating what the
          page is, for either a screen reader or a search engine. Visually
          hidden because the carousel already says it in pictures. */}
      <h1 className="sr-only">
        {BRAND_NAME} — {t("home.title")}
      </h1>

      <HeroCarousel slides={heroSlides} />

      {bodySections.length === 0 ? (
        <>
          <ul className="flex flex-col">
            <FeaturedProducts
              collections={collections}
              region={region}
              segment={countryCode}
            />
          </ul>
          <DeliveryStrip segment={countryCode} />
          <OccasionTiles segment={countryCode} />
        </>
      ) : (
        <>
          {bodySections.map((section, index) => {
            const heading = headingFor(section, locale)

            if (section.type === "product_rail") {
              const collection = section.resource_handle
                ? collectionByHandle.get(section.resource_handle)
                : undefined

              // A rail pointing at a collection that has since been deleted
              // renders nothing rather than an empty heading.
              if (!collection) return null

              return (
                <ProductRail
                  key={section.id}
                  collection={{ ...collection, title: heading }}
                  region={region}
                  segment={countryCode}
                />
              )
            }

            if (section.type === "category_tiles") {
              return (
                <OccasionTiles
                  key={section.id}
                  segment={countryCode}
                  heading={heading}
                  handle={section.resource_handle}
                />
              )
            }

            return (
              <PromoBanner
                key={section.id}
                title={heading}
                body={section.subtitle ?? undefined}
                image={section.image_url}
                ctaLabel={section.cta_label ?? ""}
                href={section.cta_href ?? "/store"}
                // The first banner is likely above the fold on a phone.
                size={index === 0 ? "tall" : "standard"}
              />
            )
          })}

          {/* Delivery reassurance is not a section the shopkeeper manages: in
              flower gifting "will it arrive in time" blocks the purchase more
              often than "is it pretty", so it always shows. */}
          <DeliveryStrip segment={countryCode} />
        </>
      )}
    </>
  )
}
