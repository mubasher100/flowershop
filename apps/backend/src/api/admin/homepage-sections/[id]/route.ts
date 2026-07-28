import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import {
  deleteHomepageSectionWorkflow,
  updateHomepageSectionWorkflow,
} from "../../../../workflows/manage-homepage-sections"
import type { UpdateHomepageSectionSchema } from "../middlewares"

/** POST, not PATCH — Medusa exposes GET, POST and DELETE only. */
export async function POST(
  req: AuthenticatedMedusaRequest<UpdateHomepageSectionSchema>,
  res: MedusaResponse
) {
  const { result } = await updateHomepageSectionWorkflow(req.scope).run({
    input: { id: req.params.id, ...req.validatedBody },
  })

  res.json({ section: result })
}

export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  await deleteHomepageSectionWorkflow(req.scope).run({
    input: { id: req.params.id },
  })

  res.json({ id: req.params.id, object: "homepage_section", deleted: true })
}
