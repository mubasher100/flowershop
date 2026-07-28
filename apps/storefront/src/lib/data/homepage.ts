"use server"

import { sdk } from "@lib/config"
import type { HomepageSection } from "@lib/util/homepage"
import { getPublicCacheOptions } from "./cookies"

/**
 * The homepage layout, as configured in the admin.
 *
 * Which rails appear, in what order and under what heading used to be a
 * hardcoded list in this repo. It now comes from the backend, so the
 * shopkeeper can rename a section or add a seasonal one without a deploy.
 *
 * Only the fetch lives here. Every export from a "use server" module is
 * treated as a Server Action and must be async, so the section type and the
 * heading helper sit in lib/util/homepage.ts.
 */
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
