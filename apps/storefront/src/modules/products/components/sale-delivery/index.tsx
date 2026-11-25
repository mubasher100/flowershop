"use client"

import { ReactNode, useEffect, useState } from "react"

import { blackFridayOn } from "@lib/util/black-friday"

/**
 * Shows `children` while Black Friday delivery lasts, then `after`.
 *
 * The page is ready-made, so it cannot know the time itself: it is built with
 * the Black Friday line and the browser drops it once the weekend is over.
 */
export default function SaleDelivery({
  sale,
  children,
  after = null,
}: {
  sale: boolean
  children: ReactNode
  after?: ReactNode
}) {
  const [on, setOn] = useState(true)
  useEffect(() => setOn(blackFridayOn()), [])

  return <>{sale && on ? children : after}</>
}
