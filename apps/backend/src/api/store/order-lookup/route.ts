import { Modules } from "@medusajs/framework/utils"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import type { OrderLookupSchema } from "./middlewares"

/**
 * "Where is my order?"
 *
 * The shop takes orders without accounts, so a customer has no login to come
 * back through and — since nothing is emailed — no link either once the
 * confirmation tab is closed. This is the way back in: the order number they
 * were shown, plus the phone number on the order.
 *
 * Deliberately narrow. It returns what a customer needs to recognise their
 * own order and nothing that would make the endpoint worth harvesting: no
 * address, no gift message, no email, no order id. Someone who already knows
 * both the order number and the phone number learns the delivery date, the
 * status and what was bought.
 *
 * The phone is matched on its last six digits so a number saved as 55512345,
 * +974 5551 2345 or 97455512345 all work, without letting a two-digit guess
 * through.
 */
const digits = (value: string) => value.replace(/\D/g, "")

export async function POST(
  req: MedusaRequest<OrderLookupSchema>,
  res: MedusaResponse
) {
  /**
   * Read through the order module rather than query.graph.
   *
   * query.graph does not compute an order's totals — it returned a total of
   * zero however the fields were spelled — because the totals are worked out
   * by the order module itself, which is what the admin route goes through.
   */
  const orderService = req.scope.resolve(Modules.ORDER)
  const { order_number, phone } = req.validatedBody

  const display_id = Number(String(order_number).replace(/[^\d]/g, ""))
  if (!display_id) {
    res.status(404).json({ message: "No order matches those details." })
    return
  }

  // Read broadly, return narrowly: the response below is hand-built, so
  // nothing beyond what a customer needs about their own order goes out.
  const orders = await orderService.listOrders(
    { display_id } as unknown as Record<string, unknown>,
    { relations: ["items", "shipping_methods", "shipping_address"], take: 1 }
  )

  const order = orders?.[0] as unknown as
    | {
        display_id: number
        created_at: string
        status: string
        fulfillment_status: string
        currency_code: string
        total: number
        metadata?: Record<string, unknown> | null
        items?: { title: string; quantity: number }[]
        shipping_address?: { phone?: string | null } | null
        shipping_methods?: { name?: string | null }[]
      }
    | undefined

  const given = digits(phone)
  const candidates = [
    order?.shipping_address?.phone,
    order?.metadata?.contact_phone,
    order?.metadata?.recipient_phone,
  ]
    .filter((v): v is string => typeof v === "string" && !!v)
    .map(digits)

  const matches =
    given.length >= 6 &&
    candidates.some((c) => c.length >= 6 && c.slice(-6) === given.slice(-6))

  // One message for "no such order" and "wrong number", so the endpoint
  // cannot be used to work out which order numbers exist.
  if (!order || !matches) {
    res.status(404).json({ message: "No order matches those details." })
    return
  }

  res.json({
    order: {
      order_number: order.display_id,
      placed_at: order.created_at,
      status: order.status,
      fulfillment_status: order.fulfillment_status,
      currency_code: order.currency_code,
      total: order.total,
      delivery_date: (order.metadata?.delivery_date as string) ?? null,
      delivery_window: (order.metadata?.delivery_window as string) ?? null,
      delivery_area: (order.metadata?.delivery_area as string) ?? null,
      recipient_name: (order.metadata?.recipient_name as string) ?? null,
      shipping_method: order.shipping_methods?.[0]?.name ?? null,
      items: (order.items ?? []).map((i) => ({
        title: i.title,
        quantity: i.quantity,
      })),
    },
  })
}
