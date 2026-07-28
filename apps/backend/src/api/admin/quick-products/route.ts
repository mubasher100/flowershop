import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { createSimpleProductWorkflow } from "../../../workflows/create-simple-product"
import type { CreateQuickProductSchema } from "./middlewares"

/**
 * One-form product creation, for the simplified Shop screen.
 *
 * Medusa's own product endpoint is the right tool for the full catalogue —
 * variants, price lists, option ladders. This one exists so adding a bouquet
 * is four fields rather than five screens.
 */
export async function POST(
  req: AuthenticatedMedusaRequest<CreateQuickProductSchema>,
  res: MedusaResponse
) {
  const { result } = await createSimpleProductWorkflow(req.scope).run({
    input: req.validatedBody,
  })

  res.status(201).json({ product: Array.isArray(result) ? result[0] : result })
}
