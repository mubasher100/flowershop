import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"

import { HOMEPAGE_MODULE } from "../modules/homepage"
import { HOMEPAGE_SECTION_CHANGED } from "../workflows/manage-homepage-sections"

/**
 * Seeds the homepage layout that used to be hardcoded in the storefront.
 *
 * Running this leaves the homepage looking exactly as it did — the point is
 * that from here on it is editable in the admin instead of in source.
 *
 * Idempotent: a section is matched on type plus resource handle, so re-running
 * updates the existing rows rather than stacking duplicates. Headings are only
 * written when a section is created, so a rename made in the admin survives.
 */

type SeedSection = {
  type: "product_rail" | "category_tiles" | "banner"
  title: string
  title_ar: string | null
  resource_handle: string | null
  rank: number
  subtitle?: string
  image_url?: string
  cta_label?: string
  cta_href?: string
}

/**
 * The order the storefront used: Best Sellers directly under the carousel,
 * then the rest, with occasions last. `roses-always` and `luxury-edit` were
 * deliberately excluded from the homepage and stay excluded — they exist for
 * browsing, not for a rail.
 */
const RAILS: { handle: string; title_ar: string }[] = [
  { handle: "best-sellers", title_ar: "الأكثر مبيعاً" },
  { handle: "new-this-week", title_ar: "جديد هذا الأسبوع" },
  { handle: "under-400", title_ar: "أقل من ٤٠٠ ريال" },
]

export default async function seedHomepage({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const homepage = container.resolve(HOMEPAGE_MODULE) as {
    listHomepageSections(f?: Record<string, unknown>): Promise<
      { id: string; type: string; resource_handle: string | null }[]
    >
    createHomepageSections(data: Record<string, unknown>): Promise<unknown>
    updateHomepageSections(data: Record<string, unknown>): Promise<unknown>
  }

  // Headings come from the collections themselves, so the seeded homepage
  // reads exactly as the hardcoded one did.
  const { data: collections } = await query.graph({
    entity: "product_collection",
    fields: ["handle", "title"],
  })

  const titleByHandle = new Map(
    (collections as { handle: string; title: string }[]).map((c) => [
      c.handle,
      c.title,
    ])
  )

  const desired: SeedSection[] = []
  let rank = 10

  for (const rail of RAILS) {
    const title = titleByHandle.get(rail.handle)
    if (!title) {
      logger.warn(
        `Collection "${rail.handle}" not found — skipping its homepage rail.`
      )
      continue
    }
    desired.push({
      type: "product_rail",
      title,
      title_ar: rail.title_ar,
      resource_handle: rail.handle,
      rank,
    })
    rank += 10
  }

  // 11:59, as a banner between the first rail and the rest — the homepage
  // rhythm is banner-alternating-with-rail, and this is the one delivery
  // option that sells itself. Rank 15 slots it after Best Sellers (10).
  // Editable, movable and hideable in Admin → Homepage like any section;
  // the photograph is a stand-in until there is one shot for it.
  desired.push({
    type: "banner",
    title: "11:59 — the midnight surprise",
    title_ar: "١١:٥٩ — مفاجأة منتصف الليل",
    resource_handle: "midnight",
    rank: 15,
    subtitle:
      "We arrive at 11:59pm the night before, so it is in their hands the moment the day begins.",
    image_url: "/hero/hero-04.jpg",
    cta_label: "How it works",
    cta_href: "/delivery",
  })

  desired.push({
    type: "category_tiles",
    title: "Shop by occasion",
    title_ar: "تسوق حسب المناسبة",
    // Blank means every occasion category, which is what the storefront's
    // OccasionTiles component already did.
    resource_handle: null,
    rank,
  })

  const existing = await homepage.listHomepageSections()

  for (const section of desired) {
    const match = existing.find(
      (e) =>
        e.type === section.type && e.resource_handle === section.resource_handle
    )

    if (match) {
      // Rank only. Overwriting the heading would undo a rename made in the
      // admin, which is the whole reason this table exists.
      await homepage.updateHomepageSections({ id: match.id, rank: section.rank })
      logger.info(`Homepage: kept "${section.title}" (rank ${section.rank}).`)
      continue
    }

    await homepage.createHomepageSections({ ...section, enabled: true })
    logger.info(`Homepage: added "${section.title}".`)
  }

  // The admin edits go through a workflow that emits this, and a subscriber
  // turns it into a storefront cache purge. Writing through the module skips
  // the workflow, so without this the live homepage kept serving the old
  // section list until its cache happened to expire.
  const eventBus = container.resolve(Modules.EVENT_BUS)
  await eventBus.emit({ name: HOMEPAGE_SECTION_CHANGED, data: {} })

  logger.info("Homepage sections seeded.")
}
