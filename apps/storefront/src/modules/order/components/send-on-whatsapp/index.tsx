import { HttpTypes } from "@medusajs/types"

import { getTranslations } from "@lib/i18n/dictionary"
import { whatsappLink, whatsappOrderMessage } from "@lib/util/whatsapp-order"

const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP?.replace(/\D/g, "") || null
// With card payment first, nothing opened WhatsApp at checkout: this button is
// the first time the order is sent, not a resend.
const ONLINE_PAYMENT = process.env.NEXT_PUBLIC_ONLINE_PAYMENT === "skipcash"

const meta = (record: { metadata?: unknown } | null | undefined, key: string) => {
  const value = (record?.metadata as Record<string, unknown> | null)?.[key]
  return typeof value === "string" ? value.trim() : ""
}

/**
 * The order as recorded, for the confirmation page's button.
 *
 * Checkout already opened WhatsApp inside the "Place order" tap, before the
 * order had a number. This is the way back to it — a customer who closed
 * WhatsApp, or whose phone did not switch — and it carries the order number,
 * which the first message could not.
 */
export const orderMessage = (order: HttpTypes.StoreOrder) =>
  whatsappOrderMessage({
    orderNumber: order.display_id,
    currencyCode: order.currency_code,
    items: (order.items ?? []).map((item) => ({
      quantity: item.quantity,
      title: item.product_title ?? item.title,
      size: item.variant_title,
      total: item.total,
      note: meta(item, "gift_note"),
    })),
    deliveryName: order.shipping_methods?.[0]?.name,
    deliveryAmount: order.shipping_methods?.[0]?.amount,
    total: order.total,
    date: meta(order, "delivery_date"),
    window: meta(order, "delivery_window"),
    area: meta(order, "delivery_area"),
    address: order.shipping_address?.address_1 ?? "",
    locationUrl: meta(order, "location_url") || null,
    instructions: meta(order, "delivery_notes"),
    recipientName: meta(order, "recipient_name"),
    recipientPhone: meta(order, "recipient_phone"),
    giftNote: meta(order, "gift_note"),
    anonymous: meta(order, "anonymous_gift") === "true",
    contactName: meta(order, "contact_name"),
    contactPhone: meta(order, "contact_phone"),
    locationOnWhatsapp: meta(order, "location_on_whatsapp") === "true",
  })

export default function SendOnWhatsapp({
  order,
  segment,
}: {
  order: HttpTypes.StoreOrder
  segment?: string
}) {
  if (!WHATSAPP) return null
  const { t } = getTranslations(segment)

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-blush-200 bg-blush-50 p-5">
      <h2 className="font-display text-2xl text-ink-900">
        {t(ONLINE_PAYMENT ? "order.whatsappHeadingPaid" : "order.whatsappHeading")}
      </h2>
      <p className="text-sm text-ink-700">
        {t(ONLINE_PAYMENT ? "order.whatsappBodyPaid" : "order.whatsappBody")}
      </p>
      <a
        href={whatsappLink(WHATSAPP, orderMessage(order))}
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
