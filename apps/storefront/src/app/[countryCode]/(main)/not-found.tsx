import { Metadata } from "next"

import NotFoundBody from "@modules/content/components/not-found-body"
import { BRAND_NAME } from "@modules/common/components/brand"

export const metadata: Metadata = {
  title: `Page not found | ${BRAND_NAME}`,
  description:
    "That page could not be found. Browse same-day flower delivery across Doha.",
}

export default function NotFound() {
  return <NotFoundBody />
}
