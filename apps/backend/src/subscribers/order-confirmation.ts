import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { orderEmail } from "../lib/order-email"

const SHOP_NAME = "Tulips and Truffles"

/**
 * Emails the customer their order, when there is an address to send it to.
 *
 * Guest checkout asks for an email but does not require it — the shop runs on
 * WhatsApp and a required address would cost orders. When none is given,
 * Medusa still needs one, so the checkout derives a placeholder from the
 * phone number; those are skipped here rather than bounced off a domain that
 * does not accept mail.
 *
 * Failures are logged and swallowed. An order that exists without a
 * confirmation email is recoverable; an order that failed to place because an
 * email provider was down is not.
 */
export default async function orderConfirmationHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  try {
    const notification = container.resolve(Modules.NOTIFICATION)

    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "*",
        "items.*",
        "shipping_methods.*",
        "shipping_address.*",
      ],
      filters: { id: event.data.id },
    })

    const order = orders?.[0] as unknown as
      | {
          display_id: number
          email?: string | null
          currency_code: string
          metadata?: Record<string, unknown> | null
          items?: { title: string; quantity: number; total?: number; unit_price?: number }[]
          shipping_methods?: { amount?: number }[]
        }
      | undefined

    const email = order?.email ?? ""
    if (!order || !email || email.endsWith("@guest.flowershop.qa")) {
      return
    }

    const meta = (order.metadata ?? {}) as Record<string, string>
    const goods = (order.items ?? []).reduce(
      (sum, i) => sum + Number(i.total ?? (i.unit_price ?? 0) * (i.quantity ?? 0)),
      0
    )
    const delivery = (order.shipping_methods ?? []).reduce(
      (sum, m) => sum + Number(m.amount ?? 0),
      0
    )

    const storefront = (process.env.STOREFRONT_URL ?? "").replace(/\/$/, "")
    const locale = meta.locale === "ar" ? "ar" : "en"

    const { subject, html } = orderEmail({
      shopName: SHOP_NAME,
      orderNumber: order.display_id,
      currencyCode: order.currency_code,
      total: goods + delivery,
      items: (order.items ?? []).map((i) => ({
        title: i.title,
        quantity: i.quantity,
        total: Number(i.total ?? (i.unit_price ?? 0) * (i.quantity ?? 0)),
      })),
      recipientName: meta.recipient_name,
      deliveryArea: meta.delivery_area,
      deliveryDate: meta.delivery_date,
      deliveryWindow: meta.delivery_window,
      giftNote: meta.gift_note,
      trackUrl: storefront ? `${storefront}/${locale}-qa/track` : null,
      whatsapp: (process.env.SHOP_WHATSAPP ?? "").replace(/\D/g, "") || null,
      locale,
    })

    await notification.createNotifications({
      to: email,
      channel: "email",
      template: "order-confirmation",
      content: { subject, html },
    })

    logger.info(`Order #${order.display_id}: confirmation emailed to ${email}.`)
  } catch (error) {
    logger.error(
      `Order confirmation email failed for ${event.data.id}: ${
        (error as Error).message
      }`
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
