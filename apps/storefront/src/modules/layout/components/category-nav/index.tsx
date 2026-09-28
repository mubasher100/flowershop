import { listCategories } from "@lib/data/categories"
import { getTranslations } from "@lib/i18n/dictionary"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { TYPE_HANDLES } from "@lib/util/categories"

/**
 * Category strip under the header.
 *
 * The reference site keeps its whole catalogue one tap from every page, so a
 * visitor never has to go back to the homepage to change direction. Ours had
 * only a hamburger, which hides the range entirely.
 *
 * Scrolls horizontally on phones rather than collapsing — a visible, swipeable
 * row of categories advertises the range in a way a closed menu cannot.
 */

export default async function CategoryNav({ segment }: { segment?: string }) {
  const { t } = getTranslations(segment)
  const categories = await listCategories({ limit: 50 })

  const ordered = TYPE_HANDLES.map((h) =>
    categories?.find((c) => c.handle === h)
  ).filter(Boolean) as NonNullable<typeof categories>

  if (!ordered.length) {
    return null
  }

  return (
    <nav
      aria-label="Product categories"
      className="border-b border-ink-200/70 bg-white"
    >
      {/* The scroll container must be a separate, width-constrained element.
          Putting overflow-x-auto on the same node as `content-container` let
          the element itself grow past the viewport instead of scrolling
          inside it, so the whole page scrolled sideways on phones. */}
      <div className="no-scrollbar w-full max-w-full overflow-x-auto">
        <ul className="content-container flex w-max min-w-full snap-x gap-1 small:w-auto small:justify-center">
        {ordered.map((category) => (
          <li key={category.id} className="flex-none snap-start">
            <LocalizedClientLink
              href={`/categories/${category.handle}`}
              className="inline-flex min-h-[2.75rem] items-center whitespace-nowrap px-3 text-[0.72rem] font-medium uppercase tracking-[0.16em] text-ink-700 transition-colors hover:text-blush-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blush-700 small:px-4 small:text-xs"
            >
              {category.name}
            </LocalizedClientLink>
          </li>
        ))}
        <li className="flex-none snap-start">
          <LocalizedClientLink
            href="/store"
            className="inline-flex min-h-[2.75rem] items-center whitespace-nowrap px-3 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-blush-700 transition-colors hover:text-blush-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blush-700 small:px-4 small:text-xs"
          >
            {t("nav.allFlowers")}
          </LocalizedClientLink>
        </li>
        </ul>
      </div>
    </nav>
  )
}
