"use client"

import { usePathname } from "next/navigation"
import Script from "next/script"
import { useEffect, useRef } from "react"

import {
  GA_IDS,
  analyticsEnabled,
  maskOrder,
  startAnalytics,
} from "@lib/util/analytics"

/** Loads Google's script, when the shop has switched measuring on. */
export default function Analytics() {
  const pathname = usePathname()
  const masked = useRef(false)

  useEffect(() => {
    if (!analyticsEnabled) return
    startAnalytics()
    // An order's address is hidden while its page is open, and the real one
    // is put back on the next page.
    const { href } = window.location
    const hide = maskOrder(href) !== href
    if (hide || masked.current) {
      window.gtag?.("set", { page_location: maskOrder(href) })
    }
    masked.current = hide
  }, [pathname])

  if (!analyticsEnabled) return null

  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${GA_IDS[0]}`}
      strategy="afterInteractive"
    />
  )
}
