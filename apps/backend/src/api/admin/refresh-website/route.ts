import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { requestWebsiteRefresh } from "../../../lib/website-refresh"

/**
 * The shop app calls this after every save.
 *
 * The event subscriber covers most changes, but not all of them: prices on a
 * price list have no catalogue event of their own. Asking outright means no
 * save the florist makes depends on which event Medusa happens to raise. It
 * changes no Medusa data, so there is no workflow behind it.
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  requestWebsiteRefresh(
    ["products", "collections", "categories", "homepage"],
    req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  )
  res.status(202).json({ requested: true })
}
