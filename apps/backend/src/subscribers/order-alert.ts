import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { orderAlertEmail } from "../lib/order-alert-email"

const SHOP_NAME = "Tulips and Truffles"

/**
 * Emails the shop when an order comes in.
 *
 * Without it the only way to learn about an order was to have the admin open,
 * and an order for a same-day slot can be missed that way. The recipients are
 * SHOP_ORDER_ALERT_EMAILS on Railway — comma-separated, so another person can
 * be added without a deploy. Unset, nothing is sent.
 *
 * Its own subscriber rather than a second send inside order-confirmation.ts,
 * so a failure in one email can never cost the other. Failures are logged and
 * swallowed: an order must never fail to place because an email did not go.
 */
export default async function orderAlertHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  const recipients = (process.env.SHOP_ORDER_ALERT_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  if (!recipients.length) return

  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const notification = container.resolve(Modules.NOTIFICATION)

    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "email",
        "currency_code",
        "metadata",
        "items.*",
        "shipping_methods.*",
        "shipping_address.*",
      ],
      filters: { id: event.data.id },
    })

    const order = orders?.[0] as unknown as
      | {
          id: string
          display_id: number
          email?: string | null
          currency_code: string
          metadata?: Record<string, unknown> | null
          items?: {
            title: string
            variant_title?: string | null
            quantity: number
            total?: number
            unit_price?: number
            metadata?: Record<string, unknown> | null
          }[]
          shipping_methods?: { name?: string; amount?: number }[]
          shipping_address?: {
            address_1?: string | null
            city?: string | null
            phone?: string | null
          } | null
        }
      | undefined
    if (!order) return

    const meta = (order.metadata ?? {}) as Record<string, string>
    const lineTotal = (i: { total?: number; unit_price?: number; quantity: number }) =>
      Number(i.total ?? (i.unit_price ?? 0) * (i.quantity ?? 0))
    const goods = (order.items ?? []).reduce((sum, i) => sum + lineTotal(i), 0)
    const delivery = (order.shipping_methods ?? []).reduce(
      (sum, m) => sum + Number(m.amount ?? 0),
      0
    )

    const backend = (process.env.MEDUSA_BACKEND_URL ?? "").replace(/\/$/, "")
    // The placeholder address checkout makes when the customer gave none is
    // not an address anyone can write to, so it is left off.
    const email =
      order.email && !order.email.endsWith("@guest.flowershop.qa")
        ? order.email
        : null

    const { subject, html } = orderAlertEmail({
      shopName: SHOP_NAME,
      orderNumber: order.display_id,
      currencyCode: order.currency_code,
      total: goods + delivery,
      delivery,
      customerName: meta.contact_name,
      customerPhone: meta.contact_phone,
      customerEmail: email,
      items: (order.items ?? []).map((i) => ({
        title: i.title,
        size: i.variant_title,
        quantity: i.quantity,
        total: lineTotal(i),
        giftNote:
          typeof i.metadata?.gift_note === "string" ? i.metadata.gift_note : null,
      })),
      recipientName: meta.recipient_name,
      recipientPhone: meta.recipient_phone || order.shipping_address?.phone,
      address: order.shipping_address?.address_1,
      area: order.shipping_address?.city || meta.delivery_area,
      deliveryDate: meta.delivery_date,
      deliveryWindow: meta.delivery_window,
      deliveryMethod: order.shipping_methods?.[0]?.name,
      notes: meta.delivery_notes,
      orderGiftNote: meta.gift_note,
      anonymous: meta.anonymous_gift === "true",
      demoPayment: !!meta.payment_reference,
      adminUrl: backend ? `${backend}/app/orders/${order.id}` : null,
    })

    await notification.createNotifications(
      recipients.map((to) => ({
        to,
        channel: "email",
        template: "order-alert",
        content: { subject, html },
      }))
    )

    logger.info(
      `Order #${order.display_id}: shop alerted (${recipients.length} recipient${
        recipients.length === 1 ? "" : "s"
      }).`
    )
  } catch (error) {
    logger.error(
      `Shop order alert failed for ${event.data.id}: ${(error as Error).message}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
