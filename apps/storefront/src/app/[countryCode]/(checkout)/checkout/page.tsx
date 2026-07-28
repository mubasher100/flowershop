import { retrieveCart } from "@lib/data/cart"
import { listCartShippingMethods } from "@lib/data/fulfillment"
import CheckoutSummary from "@modules/checkout/templates/checkout-summary"
import GuestCheckout from "@modules/checkout/templates/guest-checkout"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Checkout | Flowershop",
  description: "Confirm your delivery details and place your order.",
  // Deliberately not indexed, which is also why it carries no canonical or
  // hreflang: a checkout is a step in one person's session, not a page anyone
  // should reach from a search result.
  robots: { index: false, follow: false },
}

/**
 * Checkout is guest-only.
 *
 * The starter's multi-step email → address → shipping → payment → review flow
 * is gone: nothing is paid online, and an account would be a barrier with
 * nothing behind it. One form collects a name, a WhatsApp number and where
 * it's going; the shopkeeper confirms stock and payment afterwards.
 */
export default async function Checkout() {
  const cart = await retrieveCart()

  if (!cart) {
    return notFound()
  }

  const shippingOptions = (await listCartShippingMethods(cart.id)) ?? []

  return (
    <div className="content-container grid grid-cols-1 gap-10 py-8 small:grid-cols-[1fr_24rem] small:gap-16 small:py-12">
      <GuestCheckout cart={cart} shippingOptions={shippingOptions} />
      {/* Summary sits under the form on mobile — the details are what the
          page is for, and the totals are already visible in the bag. */}
      <div className="order-first small:order-none">
        <CheckoutSummary cart={cart} />
      </div>
    </div>
  )
}
