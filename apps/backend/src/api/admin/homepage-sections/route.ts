import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { HOMEPAGE_MODULE } from "../../../modules/homepage"
import { createHomepageSectionWorkflow } from "../../../workflows/manage-homepage-sections"
import type { CreateHomepageSectionSchema } from "./middlewares"

/**
 * Homepage layout management.
 *
 * Medusa uses GET, POST and DELETE only — there is no PUT or PATCH — so an
 * update is a POST to /admin/homepage-sections/:id.
 */

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const service = req.scope.resolve(HOMEPAGE_MODULE) as {
    listHomepageSections(
      filters?: Record<string, unknown>,
      config?: Record<string, unknown>
    ): Promise<unknown[]>
  }

  // Disabled sections are included: the dashboard has to show them to let
  // anyone switch them back on.
  const sections = await service.listHomepageSections(
    {},
    { order: { rank: "ASC" } }
  )

  res.json({ sections })
}

export async function POST(
  req: AuthenticatedMedusaRequest<CreateHomepageSectionSchema>,
  res: MedusaResponse
) {
  const { result } = await createHomepageSectionWorkflow(req.scope).run({
    input: req.validatedBody,
  })

  res.status(201).json({ section: result })
}
