/**
 * What the customer typed at checkout, kept for the trip to SkipCash and back.
 *
 * Checkout is served no-store, so most browsers reload it rather than restore
 * it when the customer presses Back on the payment page — and a declined card
 * returns to /checkout?payment=failed, which is a fresh load too. Either way
 * the form came back empty and everything had to be typed again.
 *
 * sessionStorage, so it lives only as long as the tab, and keyed to the cart:
 * once the order is placed the visitor gets a new cart, and the draft no
 * longer matches anything.
 */
const KEY = "tt-checkout-draft"

export type CheckoutDraft = {
  cartId: string
  /** Plain form fields, by input name. */
  fields: Record<string, string>
  forSomeoneElse: boolean
  pin: string | null
  shippingId: string
  deliveryDate: string
  deliveryWindow: string
}

export function saveCheckoutDraft(draft: CheckoutDraft) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(draft))
  } catch {
    // Private mode or storage switched off: the form just starts empty.
  }
}

export function readCheckoutDraft(cartId: string): CheckoutDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const draft = JSON.parse(raw) as CheckoutDraft
    return draft?.cartId === cartId ? draft : null
  } catch {
    return null
  }
}
