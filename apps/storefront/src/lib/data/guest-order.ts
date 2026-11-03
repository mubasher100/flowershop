"use server"

import {
  initiatePaymentSession,
  placeOrder,
  retrieveCart,
  setShippingMethod,
  updateCart,
} from "./cart"
import { listDeliveryAvailability } from "@lib/data/delivery-availability"
import { getTranslations } from "@lib/i18n/dictionary"
import {
  FIELD_LIMITS,
  isDeliveryArea,
  MIDNIGHT_WINDOW,
  midnightAvailability,
  qatarClock,
  windowsFor,
} from "@lib/util/delivery"
import { unstable_rethrow } from "next/navigation"

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

/**
 * `payUrl` when the order is to be paid by card first: the browser goes
 * there, and the order is placed when SkipCash sends the customer back.
 */
export type GuestOrderState = { error?: string; payUrl?: string }

/**
 * Card payment before an order exists (SkipCash), switched on by the build
 * variable. Off, checkout places the order straight away as it always has.
 */
const ONLINE_PAYMENT = process.env.NEXT_PUBLIC_ONLINE_PAYMENT === "skipcash"
const SKIPCASH = "pp_skipcash_skipcash"

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
  // The recipient's name and phone only exist when "This is a gift for
  // someone else" is ticked (2 Nov 2026). Unticked — or from a page loaded
  // before that change, which never sends the box — a missing recipient
  // phone means the customer is receiving it, so the driver calls them.
  const forSomeoneElse =
    String(formData.get("for_someone_else") ?? "") === "true"
  const recipient = forSomeoneElse || formData.has("recipient")
    ? get("recipient", FIELD_LIMITS.recipient)
    : ""
  const recipientPhone =
    get("recipient_phone", FIELD_LIMITS.phone) || (forSomeoneElse ? "" : phone)
  // A Google Maps pin from "Use my current location". Only that exact shape
  // is kept, so a crafted value cannot put any other link on the order.
  const rawLocation = get("location_url", 120)
  const locationUrl = /^https:\/\/www\.google\.com\/maps\?q=-?\d{1,3}\.\d{1,8},-?\d{1,3}\.\d{1,8}$/.test(rawLocation)
    ? rawLocation
    : ""
  const email = get("email", FIELD_LIMITS.email).toLowerCase()
  const instructions = get("delivery_notes", FIELD_LIMITS.instructions)
  const anonymous = String(formData.get("anonymous") ?? "") === "true"
  const locationOnWhatsapp =
    String(formData.get("location_on_whatsapp") ?? "") === "true"
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
  // Every refusal is shown to the customer, in the language they ordered in.
  const { t } = getTranslations(segment)

  if (!name) return { error: t("err.name") }
  // Qatar mobile numbers are 8 digits; allow a country code and any spacing.
  if (phone.replace(/\D/g, "").length < 8) {
    return {
      error: t("err.phone"),
    }
  }
  // Checked against the list the form offers, rather than accepted as free
  // text — the select is a convenience, not a constraint.
  if (!isDeliveryArea(area)) {
    return { error: t("err.area") }
  }
  if (!address && !locationOnWhatsapp) {
    return { error: t("err.address") }
  }
  // Written into the address itself, in English for the shopkeeper like the
  // area, so the label, the admin and the shop's alert email all carry it
  // without each having to learn a new metadata key.
  const deliveryAddress = locationOnWhatsapp
    ? address
      ? `${address} (exact location to follow on WhatsApp)`
      : "Location to be sent on WhatsApp"
    : address
  // Optional, but if given it has to be usable — a typo means the
  // confirmation goes nowhere and the customer never learns it did not.
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { error: t("err.email") }
  }
  if (!shippingOptionId) return { error: t("err.delivery") }
  // The driver's number. The form requires it, but a form post is just an
  // HTTP request, and an order that reaches the door with no way to call the
  // recipient is the most expensive kind of failed delivery.
  if (recipientPhone.replace(/\D/g, "").length < 8) {
    return {
      error:
        t("err.recipientPhone"),
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
      error: t("err.dayClosed"),
    }
  }
  if (day?.full) {
    return {
      error: t("err.dayFull"),
    }
  }
  if (!isMidnight && day?.full_windows?.includes(rawWindow)) {
    return {
      error: t("err.windowFull"),
    }
  }
  if (!deliveryDate || deliveryDate < clock.date) {
    return { error: t("err.datePassed") }
  }

  let deliveryWindow = rawWindow
  if (!isMidnight) {
    const available = windowsFor(deliveryDate, clock)
    if (!available.length) {
      return {
        error:
          t("err.todayClosed"),
      }
    }
    if (!available.includes(rawWindow)) {
      return {
        error:
          t("err.windowGone"),
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
          t("err.midnightClosed"),
      }
    }
    if (availability === "not-yet") {
      return {
        error:
          t("err.midnightNotYet"),
      }
    }
  }

  const cart = await retrieveCart()
  if (!cart) return { error: t("err.emptyBag") }

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
        address_1: deliveryAddress,
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
        // Keeps the buyer's name off the card and the delivery label. The
        // order still records who placed it — the shop has to be able to
        // reach them.
        anonymous_gift: anonymous ? "true" : "",
        location_on_whatsapp: locationOnWhatsapp ? "true" : "",
        location_url: locationUrl,
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

    const refreshed = await retrieveCart()
    if (!refreshed) return { error: t("err.emptyBag") }

    if (ONLINE_PAYMENT) {
      // Pay first. The order is placed by /api/checkout/return once SkipCash
      // sends the customer back — and only if SkipCash says it is paid.
      // Cart and locale ride in the path, not the query: SkipCash appends its
      // own parameters to the return URL.
      const base = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/+$/, "")
      const [payerFirst, ...payerRest] = name.split(" ")
      const resp = await initiatePaymentSession(refreshed, {
        provider_id: SKIPCASH,
        data: {
          first_name: payerFirst,
          last_name: payerRest.join(" "),
          phone,
          email,
          return_url: `${base}/api/checkout/return/${segment ?? "en-qa"}/${cart.id}`,
        },
      })
      const session = resp?.payment_collection?.payment_sessions?.find(
        (s) => s.provider_id === SKIPCASH
      )
      const payUrl = (session?.data as { payUrl?: string } | undefined)?.payUrl
      if (!payUrl) {
        return { error: t("err.payPage") }
      }
      return { payUrl }
    }

    // No card payment: the system provider is a no-op that lets the cart
    // complete. Named explicitly — once SkipCash is enabled on the region the
    // first provider in the list could be SkipCash, and an order would then
    // wait on a payment nobody was asked to make.
    await initiatePaymentSession(refreshed, { provider_id: "pp_system_default" })
  } catch (e) {
    // Medusa's and SkipCash's own wording ("SkipCash refused the payment
    // (403)…", ids and all) used to go straight to the customer, in English
    // on both sites. They get a sentence; the detail goes to the Worker log.
    const message = e instanceof Error ? e.message : String(e)
    console.error("Checkout failed before payment:", message)
    return {
      error: /not enough stock|insufficient inventory|does not have the required inventory/i.test(message)
        ? t("err.soldOutInBag")
        : t("err.orderFailed"),
    }
  }

  // placeOrder redirects to the confirmation page on success, so anything
  // returning here means the cart could not be completed.
  try {
    await placeOrder(cart.id, segment)
  } catch (e) {
    // The success path *is* a throw: redirect() works by throwing, and
    // swallowing it here would strand a placed order on the checkout page.
    unstable_rethrow(e)

    /*
     * Stock is counted, and a product page can be up to half an hour behind
     * it, so a flower can sell out between "add to bag" and "place order".
     * Medusa refuses the order with "Not enough stock available for item
     * iitem_… at location sloc_…" — which, uncaught, reached the customer as
     * an error page full of internal ids.
     */
    const message = e instanceof Error ? e.message : ""
    if (/not enough stock|insufficient inventory|does not have the required inventory/i.test(message)) {
      return {
        error:
          t("err.soldOutInBag"),
      }
    }
    return { error: t("err.orderFailed") }
  }
  return {
    error: t("err.checkDetails"),
  }
}
