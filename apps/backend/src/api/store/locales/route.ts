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
/**
 * The locales this shop actually serves, in switcher order.
 *
 * The translation module seeds its full BCP-47 default list — around sixty
 * entries — and the `locales` option in medusa-config adds to that rather
 * than replacing it. Returning all of them would put a sixty-item language
 * menu in the header.
 *
 * `ar-SA` is used for Arabic because that is what the module seeds; there is
 * no ar-QA in its defaults, and Gulf Arabic copy reads the same either way.
 */
const SUPPORTED = [
  { code: "en-US", name: "English" },
  { code: "ar-SA", name: "العربية" },
]

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: locales } = await query.graph({
    entity: "locale",
    fields: ["code", "name"],
  })

  const available = new Set(locales.map((l) => String(l.code)))

  // Fixed order, and only what the storefront can actually render.
  res.json({
    locales: SUPPORTED.filter((l) => available.has(l.code)),
  })
}
