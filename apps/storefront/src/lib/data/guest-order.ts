"use server"

import {
  initiatePaymentSession,
  placeOrder,
  retrieveCart,
  setShippingMethod,
  updateCart,
} from "./cart"
import { listCartPaymentMethods } from "./payment"
import {
  DELIVERY_WINDOWS,
  FIELD_LIMITS,
  isDeliveryArea,
  isDeliveryWindow,
  MIDNIGHT_WINDOW,
} from "@lib/util/delivery"

/**
 * Guest ordering.
 *
 * The shop takes orders without accounts: a customer gives a name, a phone
 * number and where to deliver, and the shopkeeper checks stock and confirms
 * on WhatsApp. Nothing is paid online, so the starter's
 * email → address → shipping → payment → review flow collapses into a single
 * submit.
 *
 * Built on the existing cart actions rather than raw SDK calls so it inherits
 * their cache invalidation and error handling.
 */

export type GuestOrderState = { error?: string }

/**
 * Medusa requires an email on every cart, but this shop reaches people by
 * phone. Deriving a stable placeholder keeps the order valid without asking
 * for an address the customer will never read.
 */
const emailForPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, "")
  return `${digits || "guest"}@guest.flowershop.qa`
}

export async function placeGuestOrder(
  _prev: GuestOrderState,
  formData: FormData
): Promise<GuestOrderState> {
  /**
   * Every field is capped on the way in. The form limits these in the
   * browser, but a form post is just an HTTP request — nothing stopped a
   * crafted one writing a megabyte of text into an order's metadata.
   */
  const get = (k: string, max = 200) =>
    String(formData.get(k) ?? "")
      .trim()
      .slice(0, max)

  const name = get("name", FIELD_LIMITS.name)
  const phone = get("phone", FIELD_LIMITS.phone)
  const area = get("area")
  const address = get("address", FIELD_LIMITS.address)
  const recipient = get("recipient", FIELD_LIMITS.recipient)
  const giftNote = get("gift_note", FIELD_LIMITS.giftNote)

  // Only ever a DEMO- reference from the simulated gateway. Guarded so a
  // crafted request cannot stamp an order as paid through some other value.
  const rawReference = get("payment_reference")
  const paymentReference = /^DEMO-\d{8}$/.test(rawReference)
    ? rawReference
    : ""
  const deliveryDate = get("delivery_date")
  // Falls back to the first window rather than rejecting: an unrecognised
  // value is not worth blocking an order over, but it must not reach the
  // shopkeeper as arbitrary text either.
  const rawWindow = get("delivery_window")
  const deliveryWindow =
    isDeliveryWindow(rawWindow) || rawWindow === MIDNIGHT_WINDOW
      ? rawWindow
      : DELIVERY_WINDOWS[0]
  const shippingOptionId = get("shipping_option_id")

  if (!name) return { error: "Please tell us your name." }
  // Qatar mobile numbers are 8 digits; allow a country code and any spacing.
  if (phone.replace(/\D/g, "").length < 8) {
    return {
      error: "Please enter a valid phone number so we can confirm your order.",
    }
  }
  // Checked against the list the form offers, rather than accepted as free
  // text — the select is a convenience, not a constraint.
  if (!isDeliveryArea(area)) {
    return { error: "Please choose a delivery area from the list." }
  }
  if (!address) return { error: "Please add the delivery address." }
  if (!shippingOptionId) return { error: "Please choose a delivery speed." }

  const cart = await retrieveCart()
  if (!cart) return { error: "Your bag is empty." }

  const [firstName, ...restName] = name.split(" ")

  try {
    await updateCart({
      email: emailForPhone(phone),
      shipping_address: {
        first_name: firstName,
        last_name: restName.join(" ") || "-",
        phone,
        address_1: address,
        city: area,
        country_code: "qa",
      },
      // The shopkeeper reads these straight off the order in the admin.
      metadata: {
        contact_name: name,
        contact_phone: phone,
        recipient_name: recipient || name,
        delivery_area: area,
        delivery_date: deliveryDate,
        delivery_window: deliveryWindow,
        gift_note: giftNote,
        fulfilment_channel: "whatsapp",
        /**
         * Present only when the demo card gateway was used, and prefixed
         * DEMO- by the component that issues it. No money moved; this exists
         * so a simulated order is never mistaken for a paid one in the admin.
         */
        ...(paymentReference
          ? {
              payment_reference: paymentReference,
              payment_status: "simulated_demo_no_funds_taken",
            }
          : {}),
      },
    })

    await setShippingMethod({
      cartId: cart.id,
      shippingMethodId: shippingOptionId,
    })

    // Nothing is charged online. The system provider is a no-op that lets the
    // cart complete; SkipCash replaces it in roadmap phase 8.
    const providers = await listCartPaymentMethods(cart.region?.id ?? "")
    const providerId = providers?.[0]?.id ?? "pp_system_default"

    const refreshed = await retrieveCart()
    if (!refreshed) return { error: "Your bag is empty." }

    await initiatePaymentSession(refreshed, { provider_id: providerId })
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? e.message
          : "We couldn't confirm that order. Please try again.",
    }
  }

  // placeOrder redirects to the confirmation page on success, so anything
  // returning here means the cart could not be completed.
  await placeOrder(cart.id)
  return {
    error: "We couldn't confirm that order. Please check your details.",
  }
}
