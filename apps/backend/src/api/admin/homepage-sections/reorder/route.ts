import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { reorderHomepageSectionsWorkflow } from "../../../../workflows/manage-homepage-sections"
import type { ReorderHomepageSectionsSchema } from "../middlewares"

/**
 * Reordering is one call carrying the whole list, not a move-up/move-down per
 * section. Dragging three rows into place should be one thing to undo, and one
 * request means the ranks can never end up half-applied.
 */
export async function POST(
  req: AuthenticatedMedusaRequest<ReorderHomepageSectionsSchema>,
  res: MedusaResponse
) {
  const { result } = await reorderHomepageSectionsWorkflow(req.scope).run({
    input: req.validatedBody,
  })

  res.json(result)
}
