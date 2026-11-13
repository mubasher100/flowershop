import { listCategories } from "@lib/data/categories"
import { getTranslations } from "@lib/i18n/dictionary"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { localizedCategoryName, typeCategories } from "@lib/util/categories"

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

  const ordered = typeCategories(categories)

  if (!ordered.length) {
    return null
  }

  return (
    <nav
      aria-label={t("nav.categoriesLabel")}
      className="border-b border-ink-200/70 bg-white"
    >
      {/* The scroll container must be a separate, width-constrained element.
          Putting overflow-x-auto on the same node as `content-container` let
          the element itself grow past the viewport instead of scrolling
          inside it, so the whole page scrolled sideways on phones. */}
      <div className="no-scrollbar w-full max-w-full overflow-x-auto">
        {/* Always exactly as wide as its items (w-max), at least the screen
            (min-w-full), centred only within spare room. It used to be the
            capped-width content-container with justify-center, so once the
            row outgrew it — Table Arrangements did that at 1280px — it spilled
            out of both sides and the first category could not be reached. */}
        <ul className="mx-auto flex w-max min-w-full snap-x justify-start gap-1 px-4 small:justify-center small:px-6">
        {ordered.map((category) => (
          <li key={category.id} className="flex-none snap-start">
            <LocalizedClientLink
              href={`/categories/${category.handle}`}
              className="inline-flex min-h-[2.75rem] items-center whitespace-nowrap px-3 text-[0.72rem] font-medium uppercase tracking-[0.16em] text-ink-700 rtl:tracking-normal transition-colors hover:text-blush-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blush-700 small:px-4 small:text-xs"
            >
              {localizedCategoryName(category.handle, category.name, segment, category.metadata)}
            </LocalizedClientLink>
          </li>
        ))}
        <li className="flex-none snap-start">
          <LocalizedClientLink
            href="/store"
            className="inline-flex min-h-[2.75rem] items-center whitespace-nowrap px-3 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-blush-700 rtl:tracking-normal transition-colors hover:text-blush-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blush-700 small:px-4 small:text-xs"
          >
            {t("nav.allFlowers")}
          </LocalizedClientLink>
        </li>
        </ul>
      </div>
    </nav>
  )
}
