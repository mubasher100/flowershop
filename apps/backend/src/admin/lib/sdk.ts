import Medusa from "@medusajs/js-sdk"

/**
 * Admin API client.
 *
 * Every request from a dashboard extension has to go through this rather than
 * a bare fetch — the SDK attaches the session auth the admin routes require,
 * and a plain fetch just gets a 401.
 */
export const sdk = new Medusa({
  baseUrl: import.meta.env.VITE_BACKEND_URL || "/",
  debug: import.meta.env.DEV,
  auth: {
    type: "session",
  },
})
