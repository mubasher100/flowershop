/**
 * Cart badge coordination.
 *
 * The badge in the header and the one in the mobile bottom bar both refetched
 * /api/cart-count when the pathname changed. Adding to the bag does not change
 * the pathname, so after three taps the header still read "Bag (0)" — the one
 * piece of feedback that says the tap worked.
 *
 * An event rather than a context: the two badges and the buy button sit in
 * different parts of the tree, there is exactly one number to pass between
 * them, and a provider around the whole app would be a lot of machinery for it.
 */

export const CART_COUNT_EVENT = "flowershop:cart-count"

/**
 * Nudge the badges by `delta` immediately, before the server has confirmed.
 * Adding an item takes a couple of seconds against the Store API; waiting for
 * that to move the number makes a working button feel broken.
 */
export function bumpCartCount(delta: number) {
  if (typeof window === "undefined") return
  window.dispatchEvent(
    new CustomEvent(CART_COUNT_EVENT, { detail: { delta } })
  )
}

/** Ask the badges to reconcile with the server. */
export function refreshCartCount() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(CART_COUNT_EVENT, { detail: {} }))
}
