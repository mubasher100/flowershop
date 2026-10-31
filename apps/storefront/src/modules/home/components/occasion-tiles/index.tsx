import Image from "next/image"

import { listCategories } from "@lib/data/categories"
import { getTranslations } from "@lib/i18n/dictionary"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * "Shop by occasion".
 *
 * The reference site leads with occasion navigation because that is how
 * flower gifting actually starts — someone has a birthday, not a craving for
 * hydrangea. Its absence was the largest structural gap in our homepage.
 *
 * Circular tiles, matching the reference's treatment: they read as distinct
 * from the square type tiles above, so the two rows don't blur together.
 */
const OCCASION_HANDLES = [
  "birthday",
  "anniversary",
  "congratulations",
  "get-well-soon",
  "new-baby",
  "thank-you",
]

/**
 * The shop's own photography (31 Oct 2026), each a flower that is actually on
 * sale and sits in that occasion, cropped square around the flower heads so
 * the circle frames the roses rather than the wrapping.
 *
 * These used to be stock photographs from the starter catalogue, of flowers
 * the shop has never sold.
 */
const TILE_IMAGE: Record<string, string> = {
  birthday: "/occasions/birthday.webp",
  anniversary: "/occasions/anniversary.webp",
  congratulations: "/occasions/congratulations.webp",
  "get-well-soon": "/occasions/get-well-soon.webp",
  "new-baby": "/occasions/new-baby.webp",
  "thank-you": "/occasions/thank-you.webp",
}

export default async function OccasionTiles({
  segment,
  heading,
  handle,
}: {
  segment?: string
  /** Set from the admin; falls back to the built-in "Shop by occasion". */
  heading?: string
  /** A single category to show. Blank means every occasion. */
  handle?: string | null
}) {
  const categories = await listCategories({ limit: 50 })
  const { t } = getTranslations(segment)

  // A handle from the admin narrows this to one tile; the shadowed parameter
  // in the map below was renamed so it cannot collide with it.
  const wanted = handle?.trim() ? [handle.trim()] : OCCASION_HANDLES

  const occasions = wanted
    .map((h) => categories?.find((c) => c.handle === h))
    .filter(Boolean) as NonNullable<typeof categories>

  if (!occasions.length) {
    return null
  }

  return (
    <section className="content-container py-8 small:py-12">
      <h2 className="mb-5 font-display text-3xl text-ink-900 small:mb-7 small:text-4xl">
        {heading?.trim() || t("section.shopByOccasion")}
      </h2>

      <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1 small:mx-0 small:grid small:grid-cols-6 small:gap-6 small:overflow-visible small:px-0">
        {occasions.map((occasion) => (
          <li
            key={occasion.id}
            className="w-[6.5rem] flex-none snap-start small:w-auto"
          >
            <LocalizedClientLink
              href={`/categories/${occasion.handle}`}
              className="group flex flex-col items-center gap-2.5 text-center focus-visible:outline-none"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-full ring-1 ring-inset ring-ink-200/60 transition-transform duration-200 group-hover:-translate-y-1 group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-blush-700">
                <Image
                  src={
                    TILE_IMAGE[occasion.handle ?? ""] ?? "/occasions/birthday.webp"
                  }
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 25vw, 12vw"
                  className="object-cover object-center"
                />
              </div>
              <span className="text-sm font-medium leading-snug text-ink-800">
                {occasion.name}
              </span>
            </LocalizedClientLink>
          </li>
        ))}
      </ul>
    </section>
  )
}
