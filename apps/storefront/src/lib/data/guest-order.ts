"use server"

import {
  initiatePaymentSession,
  placeOrder,
  retrieveCart,
  setShippingMethod,
  updateCart,
} from "./cart"
import { listCartPaymentMethods } from "./payment"
import { listDeliveryAvailability } from "@lib/data/delivery-availability"
import {
  FIELD_LIMITS,
  isDeliveryArea,
  MIDNIGHT_WINDOW,
  midnightAvailability,
  qatarClock,
  windowsFor,
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
  const recipientPhone = get("recipient_phone", FIELD_LIMITS.phone)
  const email = get("email", FIELD_LIMITS.email).toLowerCase()
  const instructions = get("delivery_notes", FIELD_LIMITS.instructions)
  const giftNote = get("gift_note", FIELD_LIMITS.giftNote)

  // Only ever a DEMO- reference from the simulated gateway. Guarded so a
  // crafted request cannot stamp an order as paid through some other value.
  const rawReference = get("payment_reference")
  const paymentReference = /^DEMO-\d{8}$/.test(rawReference)
    ? rawReference
    : ""
  const deliveryDate = get("delivery_date")
  const rawWindow = get("delivery_window")
  const shippingOptionId = get("shipping_option_id")
  // Where to send them afterwards. Checked against the shape of a locale
  // segment so a crafted value cannot turn the redirect into an open one.
  const rawSegment = get("segment", 8)
  const segment = /^[a-z]{2}-[a-z]{2}$/.test(rawSegment) ? rawSegment : undefined

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
  // Optional, but if given it has to be usable — a typo means the
  // confirmation goes nowhere and the customer never learns it did not.
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { error: "That email address does not look right." }
  }
  if (!shippingOptionId) return { error: "Please choose a delivery speed." }
  // The driver's number. The form requires it, but a form post is just an
  // HTTP request, and an order that reaches the door with no way to call the
  // recipient is the most expensive kind of failed delivery.
  if (recipientPhone.replace(/\D/g, "").length < 8) {
    return {
      error:
        "Please add the recipient's phone number so our driver can reach them.",
    }
  }

  /**
   * Delivery date and window, checked against the clock rather than trusted.
   *
   * The form only offers what is deliverable, but the browser is not the
   * boundary: nothing stopped a crafted request booking a date in the past,
   * or a 10am window at 11pm, both of which the shop would then have to
   * apologise for.
   */
  const clock = qatarClock()
  const isMidnight = rawWindow === MIDNIGHT_WINDOW

  // Capacity, checked here as well as in the form. A closed day or a full
  // window must refuse the order rather than take it and leave the shop to
  // explain itself.
  const [day] = await listDeliveryAvailability([deliveryDate])
  if (day?.closed) {
    return {
      error: "We are not delivering on that date. Please choose another day.",
    }
  }
  if (day?.full) {
    return {
      error: "That day is fully booked. Please choose another date.",
    }
  }
  if (!isMidnight && day?.full_windows?.includes(rawWindow)) {
    return {
      error: "That delivery window is fully booked. Please choose another time.",
    }
  }
  if (!deliveryDate || deliveryDate < clock.date) {
    return { error: "Please choose a delivery date that has not passed." }
  }

  let deliveryWindow = rawWindow
  if (!isMidnight) {
    const available = windowsFor(deliveryDate, clock)
    if (!available.length) {
      return {
        error:
          "Today's deliveries have closed. Please choose tomorrow or a later date.",
      }
    }
    if (!available.includes(rawWindow)) {
      return {
        error:
          "That delivery time is no longer available. Please choose another window.",
      }
    }
    deliveryWindow = rawWindow
  }

  // 11:59 is pre-order only: tonight's run is made up in the afternoon, so
  // an order for tonight is taken only inside the window. The form says the
  // same thing, but the form is not the boundary.
  if (isMidnight) {
    const availability = midnightAvailability(deliveryDate, clock)
    if (availability === "closed") {
      return {
        error:
          "Tonight's 11:59 orders closed at 6pm. Please choose tomorrow night or later.",
      }
    }
    if (availability === "not-yet") {
      return {
        error:
          "Tonight's 11:59 orders open at 12pm. Please choose another night, or come back after 12.",
      }
    }
  }

  const cart = await retrieveCart()
  if (!cart) return { error: "Your bag is empty." }

  // The address belongs to whoever is receiving the flowers; the buyer's own
  // name and number stay on the order as the contact. Before this the label
  // and the confirmation both showed the sender as the recipient.
  const deliverTo = recipient || name
  const [firstName, ...restName] = deliverTo.split(" ")

  try {
    await updateCart({
      // A real address when one was given; otherwise the derived placeholder,
      // because Medusa requires an email on every order. The confirmation
      // subscriber skips the placeholders rather than mailing a dead domain.
      email: email || emailForPhone(phone),
      shipping_address: {
        first_name: firstName,
        last_name: restName.join(" ") || "-",
        phone: recipientPhone,
        address_1: address,
        city: area,
        country_code: "qa",
      },
      // The shopkeeper reads these straight off the order in the admin.
      metadata: {
        contact_name: name,
        contact_phone: phone,
        recipient_name: recipient || name,
        recipient_phone: recipientPhone,
        delivery_notes: instructions,
        delivery_area: area,
        delivery_date: deliveryDate,
        delivery_window: deliveryWindow,
        gift_note: giftNote,
        fulfilment_channel: "whatsapp",
        // Which language to write the confirmation email in.
        locale: segment?.startsWith("ar") ? "ar" : "en",
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
  await placeOrder(cart.id, segment)
  return {
    error: "We couldn't confirm that order. Please check your details.",
  }
}
