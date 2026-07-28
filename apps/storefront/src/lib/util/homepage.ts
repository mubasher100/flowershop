/**
 * Homepage section shape and pure helpers.
 *
 * Deliberately separate from lib/data/homepage.ts, which is a "use server"
 * module: there, every export is treated as a Server Action and must be an
 * async function. A synchronous helper alongside the fetch fails the build
 * with "Server Actions must be async functions" — and `tsc` does not catch
 * it, because it is a Next.js rule rather than a type error.
 */

export type HomepageSection = {
  id: string
  type: "product_rail" | "category_tiles" | "banner"
  title: string
  title_ar: string | null
  resource_handle: string | null
  subtitle: string | null
  image_url: string | null
  cta_label: string | null
  cta_href: string | null
  rank: number
}

/**
 * The heading to show for a section, in the visitor's language.
 *
 * Arabic is optional in the admin, so a section added before anyone
 * translated it falls back to the English heading rather than rendering a
 * blank line above the products.
 */
export const headingFor = (section: HomepageSection, locale: string) =>
  locale === "ar" && section.title_ar?.trim() ? section.title_ar : section.title
