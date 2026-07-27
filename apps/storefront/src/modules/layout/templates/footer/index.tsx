import { listCategories } from "@lib/data/categories"
import { listCollections } from "@lib/data/collections"
import { getTranslations, TranslationKey } from "@lib/i18n/dictionary"

import Brand, { BRAND_NAME } from "@modules/common/components/brand"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * Site footer.
 *
 * Replaces the starter's version, which linked to Medusa's GitHub, docs and
 * source — developer links that mean nothing to someone buying flowers — and
 * used 10rem of vertical padding, roughly a full phone screen of emptiness.
 *
 * Every link is a 44px touch target. The starter's were 20px tall, below what
 * a thumb can reliably hit.
 */

// "Your account" used to sit at the end of this list, pointing at /account —
// a page that no longer exists, since ordering became guest-only. The bag is
// what someone reaching for it actually wants.
const HELP_LINKS: { label: TranslationKey; href: string }[] = [
  { label: "footer.deliveryAreas", href: "/delivery" },
  { label: "footer.flowerCare", href: "/flower-care" },
  { label: "footer.contact", href: "/contact" },
  { label: "footer.yourBag", href: "/cart" },
]

const linkClass =
  "inline-flex min-h-[2.75rem] items-center text-sm text-ink-600 transition-colors hover:text-blush-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blush-700"

const headingClass =
  "text-xs font-semibold uppercase tracking-[0.14em] text-ink-900"

export default async function Footer({ segment }: { segment?: string }) {
  const { collections } = await listCollections({ fields: "id, handle, title" })
  const productCategories = await listCategories({ limit: 8 })
  const { t } = getTranslations(segment)

  return (
    <footer className="mt-8 border-t border-ink-200/70 bg-blush-50">
      <div className="content-container flex flex-col">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 py-12 small:grid-cols-4 small:py-16">
          <div className="col-span-2 flex flex-col gap-3 small:col-span-1">
            <Brand className="text-2xl" />
            <p className="max-w-[28ch] text-sm leading-relaxed text-ink-600">
              {t("footer.tagline")}
            </p>
          </div>

          {productCategories?.length > 0 && (
            <nav aria-labelledby="footer-shop" className="flex flex-col gap-1">
              <span id="footer-shop" className={headingClass}>
                {t("section.shop")}
              </span>
              <ul className="flex flex-col" data-testid="footer-categories">
                {productCategories
                  .filter((c) => !c.parent_category)
                  .slice(0, 6)
                  .map((c) => (
                    <li key={c.id}>
                      <LocalizedClientLink
                        className={linkClass}
                        href={`/categories/${c.handle}`}
                        data-testid="category-link"
                      >
                        {c.name}
                      </LocalizedClientLink>
                    </li>
                  ))}
              </ul>
            </nav>
          )}

          {collections?.length > 0 && (
            <nav
              aria-labelledby="footer-collections"
              className="flex flex-col gap-1"
            >
              <span id="footer-collections" className={headingClass}>
                {t("section.collections")}
              </span>
              <ul className="flex flex-col">
                {collections.slice(0, 6).map((c) => (
                  <li key={c.id}>
                    <LocalizedClientLink
                      className={linkClass}
                      href={`/collections/${c.handle}`}
                    >
                      {c.title}
                    </LocalizedClientLink>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <nav aria-labelledby="footer-help" className="flex flex-col gap-1">
            <span id="footer-help" className={headingClass}>
              {t("section.help")}
            </span>
            <ul className="flex flex-col">
              {HELP_LINKS.map((link) => (
                <li key={link.href}>
                  <LocalizedClientLink className={linkClass} href={link.href}>
                    {t(link.label)}
                  </LocalizedClientLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="border-t border-ink-200/70 py-6">
          <p className="text-xs text-ink-500">
            © {new Date().getFullYear()} {BRAND_NAME}. {t("footer.rights")}
          </p>
        </div>
      </div>
    </footer>
  )
}
