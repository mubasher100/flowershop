import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

/**
 * Where the storefront lives, for admin extensions that want to link to it.
 *
 * Served from the API rather than baked into the admin bundle so it uses the
 * STOREFRONT_URL already set on Railway — the same one the revalidation
 * subscriber reads. A VITE_ variable would have meant a second copy of the
 * same value, kept in step by hand, and a rebuild to change it.
 */
export async function GET(
  _req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  res.json({
    url: (process.env.STOREFRONT_URL ?? "").replace(/\/$/, "") || null,
  })
}
