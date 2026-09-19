import { Metadata } from "next"

import NotFoundBody from "@modules/content/components/not-found-body"
import { BRAND_NAME } from "@modules/common/components/brand"

/**
 * Root 404 — reached before a locale segment is known, so the body falls back
 * to English. It renders outside the (main) layout and therefore without the
 * nav, which is exactly why it has to offer its own way back into the shop.
 */
export const metadata: Metadata = {
  title: `Page not found | ${BRAND_NAME}`,
  description:
    "That page could not be found. Browse same-day flower delivery across Doha.",
}

export default function NotFound() {
  return <NotFoundBody />
}
