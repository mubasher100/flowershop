import { listCategories } from "@lib/data/categories"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * "Shop by type" tiles.
 *
 * Horizontally scrollable on phones — the pattern every flower-delivery site
 * in this market uses, because five categories will not fit legibly across a
 * 375px viewport as a grid. Snap points keep it from feeling loose.
 */

/** Per-category gradient, drawn from brand tokens. Falls back for new ones. */
const TILE_ART: Record<string, string> = {
  bouquets: "linear-gradient(150deg, var(--blush-200), var(--blush-100))",
  vases: "linear-gradient(150deg, var(--sage-200), var(--sage-100))",
  roses: "linear-gradient(150deg, var(--blush-300), var(--blush-100))",
  luxury: "linear-gradient(150deg, var(--champagne-300), var(--champagne-100))",
  everyday: "linear-gradient(150deg, var(--sage-100), var(--blush-100))",
}
const FALLBACK_ART = "linear-gradient(150deg, var(--blush-100), var(--sage-100))"

export default async function CategoryTiles() {
  const categories = await listCategories({ limit: 8 })

  if (!categories?.length) {
    return null
  }

  return (
    <section className="content-container py-10 small:py-14">
      <h2 className="mb-5 font-display text-3xl text-ink-900 small:mb-7 small:text-4xl">
        Shop by type
      </h2>

      {/* Negative margin lets the rail bleed to the screen edge on mobile so
          the last tile is visibly cut off — the affordance that says "scroll". */}
      <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 small:mx-0 small:grid small:grid-cols-5 small:gap-5 small:overflow-visible small:px-0">
        {categories.map((category) => (
          <li
            key={category.id}
            className="w-[8.5rem] flex-none snap-start small:w-auto"
          >
            <LocalizedClientLink
              href={`/categories/${category.handle}`}
              className="group flex flex-col gap-2.5 focus-visible:outline-none"
            >
              <div
                className="aspect-square w-full rounded-2xl ring-1 ring-inset ring-ink-200/70 transition-transform duration-200 group-hover:-translate-y-0.5 group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-blush-700"
                style={{
                  background: TILE_ART[category.handle ?? ""] ?? FALLBACK_ART,
                }}
              />
              <span className="text-sm font-medium leading-snug text-ink-800 small:text-base">
                {category.name}
              </span>
            </LocalizedClientLink>
          </li>
        ))}
      </ul>
    </section>
  )
}
