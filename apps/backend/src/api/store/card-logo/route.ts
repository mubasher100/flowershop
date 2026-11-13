import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * The logo printed on the gift card, for the storefront's "Show a sample
 * card" preview, so the preview shows what the printer will.
 *
 * The shop uploads it in the shop app (More → Printing) or Admin → Shop, and
 * it is kept in the store's metadata under this key — which the Store API
 * does not otherwise expose. Null means none was uploaded and the card prints
 * the Tulips and Truffles mark (apps/backend/src/admin/lib/brand-mark.ts).
 * Read-only; a public image URL, nothing private.
 */
const LOGO_METADATA_KEY = "delivery_label_logo_url"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "store", fields: ["metadata"] })
  const url = (data?.[0]?.metadata as Record<string, unknown> | null)?.[LOGO_METADATA_KEY]
  res.setHeader("Cache-Control", "public, max-age=300")
  res.json({ logo_url: typeof url === "string" && /^https:\/\//.test(url) ? url : null })
}
