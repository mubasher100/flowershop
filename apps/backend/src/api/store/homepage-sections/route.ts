import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { HOMEPAGE_MODULE } from "../../../modules/homepage"

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

/**
 * The homepage layout, as the storefront should render it.
 *
 * Only enabled sections, already in order, so the storefront renders what it
 * is given rather than re-deriving the rules. Disabled ones stay in the admin
 * list — this endpoint is the published view.
 */
export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  const service = _req.scope.resolve(HOMEPAGE_MODULE) as {
    listHomepageSections(
      filters?: Record<string, unknown>,
      config?: Record<string, unknown>
    ): Promise<HomepageSectionRow[]>
  }

  const sections = await service.listHomepageSections(
    { enabled: true },
    { order: { rank: "ASC" } }
  )

  res.json({ sections })
}
