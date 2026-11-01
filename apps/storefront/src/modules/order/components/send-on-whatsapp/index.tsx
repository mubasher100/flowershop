import { HttpTypes } from "@medusajs/types"

import { getTranslations } from "@lib/i18n/dictionary"
import { convertToLocale } from "@lib/util/money"

import AutoOpenWhatsapp from "./auto-open"

const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP?.replace(/\D/g, "") || null

const meta = (order: HttpTypes.StoreOrder, key: string) => {
  const value = (order.metadata as Record<string, unknown> | null)?.[key]
  return typeof value === "string" ? value.trim() : ""
}

/**
 * The order, as a WhatsApp message to the shop.
 *
 * Every order here is confirmed on WhatsApp, so the confirmation page's real
 * job is to start that chat. Built on the server from the placed order rather
 * than from the form, so what the shop receives is what Medusa recorded — and
 * it opens the thread the florist confirms in and the customer drops a
 * location pin into.
 *
 * In English whatever the page language, like the delivery area and window:
 * the shopkeeper reads it.
 */
export const orderMessage = (order: HttpTypes.StoreOrder) => {
  const money = (amount: number | null | undefined) =>
    convertToLocale({ amount: amount ?? 0, currency_code: order.currency_code })

  const items = (order.items ?? []).map((item) => {
    const size =
      item.variant_title && !/^(one size|default)/i.test(item.variant_title)
        ? ` (${item.variant_title})`
        : ""
    return `• ${item.quantity} × ${item.product_title ?? item.title}${size} — ${money(item.total)}`
  })

  const delivery = order.shipping_methods?.[0]
  const recipientName = meta(order, "recipient_name")
  const recipientPhone = meta(order, "recipient_phone")
  const giftNote = meta(order, "gift_note")
  const notes = meta(order, "delivery_notes")

  return [
    `New order #${order.display_id}`,
    "",
    ...items,
    `Delivery: ${delivery?.name ?? "—"}${delivery?.amount ? ` (${money(delivery.amount)})` : " (free)"}`,
    `Total: ${money(order.total)}`,
    "",
    `Date: ${meta(order, "delivery_date")}, ${meta(order, "delivery_window")}`,
    `Area: ${meta(order, "delivery_area")}`,
    `Address: ${order.shipping_address?.address_1 ?? ""}`,
    notes ? `Instructions: ${notes}` : null,
    `Recipient: ${[recipientName, recipientPhone].filter(Boolean).join(", ")}`,
    giftNote ? `Card message: ${giftNote}` : null,
    meta(order, "anonymous_gift") === "true" ? "Send without my name." : null,
    "",
    `From: ${[meta(order, "contact_name"), meta(order, "contact_phone")].filter(Boolean).join(", ")}`,
    meta(order, "location_on_whatsapp") === "true"
      ? "I'll send the location in this chat."
      : null,
  ]
    // null is a line that does not apply; "" is a deliberate blank line.
    .filter((line) => line !== null)
    .join("\n")
}

export default function SendOnWhatsapp({
  order,
  segment,
}: {
  order: HttpTypes.StoreOrder
  segment?: string
}) {
  if (!WHATSAPP) return null
  const { t } = getTranslations(segment)
  const href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(orderMessage(order))}`

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-blush-200 bg-blush-50 p-5">
      <AutoOpenWhatsapp href={href} orderId={order.id} />
      <h2 className="font-display text-2xl text-ink-900">
        {t("order.whatsappHeading")}
      </h2>
      <p className="text-sm text-ink-700">{t("order.whatsappBody")}</p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-[3.25rem] items-center justify-center rounded-full bg-[#128c7e] px-8 text-base font-semibold text-white transition-colors hover:bg-[#0f7a6e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blush-700"
        data-testid="send-order-whatsapp"
      >
        {t("order.whatsappCta")}
      </a>
    </section>
  )
}
