"use client"

import { useSyncExternalStore } from "react"

/**
 * The delivery option the customer has selected, shared between the checkout
 * form and the order summary beside it.
 *
 * The summary is rendered from the cart, and the cart has no shipping method
 * on it until the order is placed — so before this existed the summary showed
 * "Shipping QAR 0.00" and a total that left the delivery fee out, whatever
 * the customer had chosen. Quoting a price lower than the one charged is the
 * kind of bug that ends in a refund argument.
 *
 * A module-level store rather than context: the form and the summary are
 * siblings rendered by a server component, so there is no shared parent to
 * hang a provider on without making the whole page client-rendered.
 */
type Selection = { amount: number; name: string } | null

let selection: Selection = null
const listeners = new Set<() => void>()

export const setSelectedDelivery = (next: Selection) => {
  if (selection?.amount === next?.amount && selection?.name === next?.name) return
  selection = next
  listeners.forEach((l) => l())
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useSelectedDelivery(): Selection {
  return useSyncExternalStore(
    subscribe,
    () => selection,
    // The server renders the summary before any choice exists.
    () => null
  )
}
