"use server"

import { sdk } from "@lib/config"
import { getPublicCacheOptions } from "./cookies"

/**
 * The homepage layout, as configured in the admin.
 *
 * Which rails appear, in what order and under what heading used to be a
 * hardcoded list in this repo. It now comes from the backend, so the
 * shopkeeper can rename a section or add a seasonal one without a deploy.
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

export const listHomepageSections = async (): Promise<HomepageSection[]> => {
  const next = {
    ...getPublicCacheOptions("homepage"),
  }

  try {
    const { sections } = await sdk.client.fetch<{
      sections: HomepageSection[]
    }>("/store/homepage-sections", {
      next,
      cache: "force-cache",
    })

    return sections ?? []
  } catch (error) {
    // A homepage with no rails is a bad page; a homepage that fails to render
    // is a broken shop. The caller falls back to its built-in layout.
    console.error("Failed to load homepage sections", error)
    return []
  }
}

/**
 * The heading to show for a section, in the visitor's language.
 *
 * Arabic is optional in the admin, so a section added before anyone
 * translated it falls back to the English heading rather than rendering a
 * blank line above the products.
 */
export const headingFor = (section: HomepageSection, locale: string) =>
  locale === "ar" && section.title_ar?.trim()
    ? section.title_ar
    : section.title
