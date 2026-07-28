import { Metadata } from "next"

import NotFoundBody from "@modules/content/components/not-found-body"

export const metadata: Metadata = {
  title: "Page not found | Flowershop",
  description:
    "That page could not be found. Browse same-day flower delivery across Doha.",
}

export default function NotFound() {
  return <NotFoundBody />
}
