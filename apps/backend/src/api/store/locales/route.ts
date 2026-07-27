import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * GET /store/locales
 *
 * The storefront's language switcher expects this endpoint, but the
 * translation module ships only the data model and service — no store route —
 * so it 404'd even after the module was registered.
 *
 * Read-only, so it queries directly rather than going through a workflow;
 * the workflow rule exists for mutations, which need validation and rollback.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: locales } = await query.graph({
    entity: "locale",
    fields: ["code", "name"],
  })

  res.json({ locales })
}
