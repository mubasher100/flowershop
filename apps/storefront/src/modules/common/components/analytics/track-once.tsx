"use client"

import { useEffect } from "react"

import { analyticsEnabled, track } from "@lib/util/analytics"

/**
 * Sends one event when the page opens, once per `id` on this phone: a
 * confirmation page that is reloaded, or opened again from a message a week
 * later, is still one order.
 */
export default function TrackOnce({
  id,
  event,
  params,
  until,
}: {
  id: string
  event: string
  params: Record<string, unknown>
  /** Too late to count after this time (ISO). */
  until?: string
}) {
  useEffect(() => {
    if (!analyticsEnabled) return
    if (until && Date.now() > Date.parse(until)) return
    const key = `tt_tracked_${event}_${id}`
    try {
      if (localStorage.getItem(key)) return
      localStorage.setItem(key, "1")
    } catch {
      /* private window: counted each time it is opened */
    }
    track(event, params)
    // Once per id: params are rebuilt on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, event])

  return null
}
