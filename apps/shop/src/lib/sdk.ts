import Medusa from "@medusajs/js-sdk"

/**
 * The admin API client.
 *
 * JWT, not a session cookie: this app lives on its own domain, and a cookie
 * set by the backend's domain is a third-party cookie that Safari and every
 * iPhone browser refuse. The token is kept in localStorage so the florist
 * stays signed in between opens of the app.
 */
export const BACKEND = (import.meta.env.VITE_MEDUSA_BACKEND_URL || "http://localhost:9000").replace(/\/$/, "")
export const STOREFRONT = (import.meta.env.VITE_STOREFRONT_URL || "https://tulipsandtruffle.com").replace(/\/$/, "")
export const IS_STAGING = import.meta.env.VITE_TARGET === "staging"

export const sdk = new Medusa({
  baseUrl: BACKEND,
  debug: false,
  auth: {
    type: "jwt",
    jwtTokenStorageMethod: "local",
    jwtTokenStorageKey: "tt_shop_token",
  },
})
