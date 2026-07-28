"use client"

import { CART_COUNT_EVENT } from "@lib/util/cart-events"
import { usePathname } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

/**
 * The number on the bag badge.
 *
 * Refetches on navigation, and also listens for the cart event so a tap on
 * "Add to bag" moves the number straight away rather than after the Store API
 * has finished — which takes a couple of seconds.
 *
 * An optimistic bump is reconciled against the server shortly after, so a
 * failed add corrects itself instead of leaving a badge that overstates the
 * bag forever.
 */
export function useCartCount() {
  const [count, setCount] = useState<number | null>(null)
  const pathname = usePathname()

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch("/api/cart-count", { cache: "no-store" })
      const data = res.ok ? await res.json() : { count: 0 }
      setCount(data.count ?? 0)
    } catch {
      setCount((c) => c ?? 0)
    }
  }, [])

  useEffect(() => {
    fetchCount()
  }, [pathname, fetchCount])

  useEffect(() => {
    const onChange = (event: Event) => {
      const delta = (event as CustomEvent<{ delta?: number }>).detail?.delta

      if (typeof delta === "number") {
        setCount((c) => Math.max(0, (c ?? 0) + delta))
        // Reconcile once the add has had time to land. If it failed, or added
        // a different quantity than assumed, the badge corrects itself.
        window.setTimeout(fetchCount, 4000)
        return
      }

      fetchCount()
    }

    window.addEventListener(CART_COUNT_EVENT, onChange)
    return () => window.removeEventListener(CART_COUNT_EVENT, onChange)
  }, [fetchCount])

  return count
}
