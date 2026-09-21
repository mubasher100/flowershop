import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { HOMEPAGE_MODULE } from "../../modules/homepage"

/**
 * Types a section may take. Kept here rather than in the data model so adding
 * one is a storefront concern, not a migration — but validated on the way in,
 * because a typo would render nothing and look like data loss.
 */
export const SECTION_TYPES = [
  "hero_slide",
  "product_rail",
  "category_tiles",
  "banner",
] as const

export type SectionType = (typeof SECTION_TYPES)[number]

export type SectionInput = {
  type: string
  title: string
  title_ar?: string | null
  resource_handle?: string | null
  subtitle?: string | null
  image_url?: string | null
  cta_label?: string | null
  cta_href?: string | null
  rank?: number
  enabled?: boolean
}

type HomepageSectionRow = {
  id: string
  type: string
  title: string
  title_ar: string | null
  resource_handle: string | null
  subtitle: string | null
  image_url: string | null
  cta_label: string | null
  cta_href: string | null
  rank: number
  enabled: boolean
}

type HomepageService = {
  createHomepageSections(data: SectionInput | SectionInput[]): Promise<HomepageSectionRow[]>
  updateHomepageSections(data: Record<string, unknown>): Promise<HomepageSectionRow[]>
  deleteHomepageSections(ids: string | string[]): Promise<void>
  listHomepageSections(
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ): Promise<HomepageSectionRow[]>
  retrieveHomepageSection(id: string): Promise<HomepageSectionRow>
}

/**
 * A rail with no collection behind it renders as an empty heading, which reads
 * as a broken page rather than an unfinished one. Catching it here means the
 * admin form gets a real error instead of silently saving something inert.
 */
function assertShape(input: SectionInput) {
  if (!SECTION_TYPES.includes(input.type as SectionType)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Unknown section type "${input.type}". Expected one of: ${SECTION_TYPES.join(", ")}.`
    )
  }

  const needsResource = input.type === "product_rail"
  if (needsResource && !input.resource_handle?.trim()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "A product rail needs a collection handle to draw its products from."
    )
  }

  if (input.type === "banner" && !input.image_url?.trim()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "A banner needs an image."
    )
  }

  // A hero slide is almost entirely its photograph — without one there is
  // nothing to show, since the carousel has no fallback art.
  if (input.type === "hero_slide" && !input.image_url?.trim()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "A hero slide needs an image."
    )
  }
}

export const createHomepageSectionStep = createStep(
  "create-homepage-section",
  async (input: SectionInput, { container }) => {
    assertShape(input)

    const service = container.resolve(HOMEPAGE_MODULE) as HomepageService

    // New sections go to the bottom unless a rank was given, so adding one
    // never silently reorders what is already there.
    const existing = await service.listHomepageSections()
    const nextRank =
      input.rank ??
      existing.reduce((max, s) => Math.max(max, s.rank ?? 0), 0) + 10

    const [created] = await service.createHomepageSections({
      ...input,
      rank: nextRank,
    })

    return new StepResponse(created, created.id)
  },
  async (id, { container }) => {
    if (!id) return
    const service = container.resolve(HOMEPAGE_MODULE) as HomepageService
    await service.deleteHomepageSections(id)
  }
)

export const updateHomepageSectionStep = createStep(
  "update-homepage-section",
  async (input: { id: string } & Partial<SectionInput>, { container }) => {
    const service = container.resolve(HOMEPAGE_MODULE) as HomepageService

    // Snapshot first: compensation has to put back what was there, and the
    // row is gone from memory once the update lands.
    const before = await service.retrieveHomepageSection(input.id)

    assertShape({ ...before, ...input } as SectionInput)

    // The generated service returns one row for one input and an array for
    // an array. Destructuring the single case as an array threw
    // "not iterable" and every rename from the admin came back as a 500.
    const result = await service.updateHomepageSections(input)
    const updated = Array.isArray(result) ? result[0] : result

    return new StepResponse(updated, before)
  },
  async (before, { container }) => {
    if (!before) return
    const service = container.resolve(HOMEPAGE_MODULE) as HomepageService
    await service.updateHomepageSections(before)
  }
)

export const deleteHomepageSectionStep = createStep(
  "delete-homepage-section",
  async (input: { id: string }, { container }) => {
    const service = container.resolve(HOMEPAGE_MODULE) as HomepageService

    const before = await service.retrieveHomepageSection(input.id)
    await service.deleteHomepageSections(input.id)

    return new StepResponse({ id: input.id }, before)
  },
  async (before, { container }) => {
    if (!before) return
    const service = container.resolve(HOMEPAGE_MODULE) as HomepageService
    // Recreated with its original id, so anything referencing it still points
    // at the same section after a rollback.
    await service.createHomepageSections(before as unknown as SectionInput)
  }
)

export const reorderHomepageSectionsStep = createStep(
  "reorder-homepage-sections",
  async (input: { order: string[] }, { container }) => {
    const service = container.resolve(HOMEPAGE_MODULE) as HomepageService

    const before = await service.listHomepageSections()
    const known = new Set(before.map((s) => s.id))
    const unknown = input.order.filter((id) => !known.has(id))

    if (unknown.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Unknown section id(s): ${unknown.join(", ")}.`
      )
    }

    // Spaced by 10 so a later single-item move can be inserted between two
    // neighbours without rewriting every row.
    await Promise.all(
      input.order.map((id, index) =>
        service.updateHomepageSections({ id, rank: (index + 1) * 10 })
      )
    )

    return new StepResponse(
      { order: input.order },
      before.map((s) => ({ id: s.id, rank: s.rank }))
    )
  },
  async (before, { container }) => {
    if (!before) return
    const service = container.resolve(HOMEPAGE_MODULE) as HomepageService
    await Promise.all(
      before.map((s) => service.updateHomepageSections({ id: s.id, rank: s.rank }))
    )
  }
)
