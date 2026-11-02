import { convertToLocale } from "./money"

/**
 * An order as the WhatsApp message the shop receives.
 *
 * Shared by checkout, which opens WhatsApp inside the "Place order" tap, and
 * the confirmation page's resend button. It has to be the tap: a phone only
 * hands a link to the WhatsApp app on a user gesture, and by the time the
 * order is saved and the confirmation page has loaded the gesture is gone —
 * a redirect from there left customers on WhatsApp's web page instead.
 *
 * In English whatever the page language, like the delivery area and window:
 * the shopkeeper reads it. Not a "use server" module — it is a plain helper.
 */
export type WhatsappOrder = {
  /** Unknown at checkout: the order does not exist until the tap has passed. */
  orderNumber?: string | number | null
  currencyCode: string
  items: {
    quantity: number
    title: string
    size?: string | null
    total?: number | null
    /** The card message written on the product page for this bouquet. */
    note?: string | null
  }[]
  deliveryName?: string | null
  deliveryAmount?: number | null
  total?: number | null
  date?: string
  window?: string
  area?: string
  address?: string
  /** A Google Maps link from "Use my current location", when given. */
  locationUrl?: string | null
  instructions?: string
  recipientName?: string
  recipientPhone?: string
  giftNote?: string
  anonymous?: boolean
  contactName?: string
  contactPhone?: string
  locationOnWhatsapp?: boolean
}

export const whatsappOrderMessage = (o: WhatsappOrder) => {
  const money = (amount: number | null | undefined) =>
    convertToLocale({ amount: amount ?? 0, currency_code: o.currencyCode })

  const items = o.items.flatMap((item) => {
    const size =
      item.size && !/^(one size|default)/i.test(item.size) ? ` (${item.size})` : ""
    const line = `• ${item.quantity} × ${item.title}${size} — ${money(item.total)}`
    const note = item.note?.trim()
    return note ? [line, `   Card: "${note}"`] : [line]
  })

  return [
    o.orderNumber ? `New order #${o.orderNumber}` : "New order",
    "",
    ...items,
    `Delivery: ${o.deliveryName ?? "—"}${o.deliveryAmount ? ` (${money(o.deliveryAmount)})` : " (free)"}`,
    `Total: ${money(o.total)}`,
    "",
    `Date: ${[o.date, o.window].filter(Boolean).join(", ")}`,
    `Area: ${o.area ?? ""}`,
    `Address: ${o.address ?? ""}`,
    o.locationUrl ? `Location: ${o.locationUrl}` : null,
    o.instructions ? `Instructions: ${o.instructions}` : null,
    `Recipient: ${[o.recipientName, o.recipientPhone].filter(Boolean).join(", ")}`,
    o.giftNote ? `Card message: ${o.giftNote}` : null,
    o.anonymous ? "Send without my name." : null,
    "",
    `From: ${[o.contactName, o.contactPhone].filter(Boolean).join(", ")}`,
    o.locationOnWhatsapp ? "I'll send the location in this chat." : null,
  ]
    // null is a line that does not apply; "" is a deliberate blank line.
    .filter((line) => line !== null)
    .join("\n")
}

export const whatsappLink = (number: string, text: string) =>
  `https://wa.me/${number}?text=${encodeURIComponent(text)}`

/**
 * The address as the order records it. Checkout's server action and the
 * message built in the browser both use this, so the chat and the order
 * never disagree about where it is going.
 */
export const deliveryAddressFor = (address: string, locationOnWhatsapp: boolean) =>
  locationOnWhatsapp
    ? address
      ? `${address} (exact location to follow on WhatsApp)`
      : "Location to be sent on WhatsApp"
    : address
