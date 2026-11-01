"use client"

import { useEffect } from "react"

/**
 * Opens WhatsApp as soon as the order is placed, on the shop's instruction:
 * "Place order" should end in the chat, not on a page asking for one more
 * tap. A top-level navigation, not a popup, so no blocker stops it; on a
 * phone it hands over to the WhatsApp app.
 *
 * Once per order. Coming back to this page (the back button, a refresh)
 * leaves the customer here, where the button is still the way to resend.
 * Storage that throws (private mode) just means it opens again — harmless.
 */
export default function AutoOpenWhatsapp({
  href,
  orderId,
}: {
  href: string
  orderId: string
}) {
  useEffect(() => {
    const key = `wa-sent-${orderId}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, "1")
    } catch {}
    window.location.assign(href)
  }, [href, orderId])

  return null
}
