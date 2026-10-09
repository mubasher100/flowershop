/**
 * Types and helpers shared by the Shop screen's panels.
 *
 * The screen talks to Medusa's own admin routes for nearly everything —
 * orders, payments, product edits — and only to /admin/quick-products to
 * create one. Those routes run Medusa's own workflows, so cancelling here does
 * exactly what cancelling in the full admin does.
 */

export type Money = { id?: string; amount: number; currency_code: string }

export type ShopVariant = {
  id: string
  title: string
  manage_inventory?: boolean
  prices?: Money[]
  inventory_items?: {
    inventory_item_id: string
    inventory?: {
      stocked_quantity?: number
      reserved_quantity?: number
      location_levels?: { location_id: string; stocked_quantity: number }[]
    }
  }[]
}

export type ShopProduct = {
  id: string
  title: string
  handle: string
  description: string | null
  thumbnail: string | null
  status: "published" | "draft" | "proposed" | "rejected"
  categories?: { id: string }[]
  variants?: ShopVariant[]
}

export type ShopCategory = { id: string; name: string; handle: string }

export type ShopOrder = {
  id: string
  display_id: number
  created_at: string
  status: string
  payment_status: string
  fulfillment_status: string
  total: number
  subtotal?: number
  shipping_total?: number
  currency_code: string
  email?: string
  summary?: { paid_total?: number; refunded_total?: number }
  metadata?: Record<string, unknown> | null
  items?: {
    id: string
    title: string
    quantity: number
    variant_title?: string | null
    metadata?: Record<string, unknown> | null
  }[]
  shipping_address?: {
    first_name?: string | null
    last_name?: string | null
    phone?: string | null
    address_1?: string | null
    city?: string | null
  } | null
  shipping_methods?: { name?: string; amount?: number }[]
  payment_collections?: {
    payments?: { id: string; captured_at?: string | null; canceled_at?: string | null }[]
  }[]
}

/** Prices are stored as-is in Medusa — 260 is 260.00, never 26000. */
export const money = (amount: number | undefined, currency = "qar") =>
  `${currency.toUpperCase()} ${Number(amount ?? 0).toFixed(2)}`

export const priceOf = (variant?: ShopVariant) =>
  variant?.prices?.find((p) => p.currency_code === "qar")?.amount ??
  variant?.prices?.[0]?.amount ??
  0

/**
 * One size's stock, as the florist thinks of it.
 *
 * `stocked` is what is on the shelf; `held` is what orders not yet sent have
 * claimed (Medusa reserves on purchase and only takes it off the shelf when the
 * order is marked sent); `available` is what a customer can still buy, and is
 * the number the storefront shows. The shop has one warehouse, so the first
 * location level is the one to edit.
 */
export const stockOf = (variant?: ShopVariant) => {
  const link = variant?.inventory_items?.[0]
  const inv = link?.inventory
  const stocked = inv?.stocked_quantity ?? 0
  const held = inv?.reserved_quantity ?? 0
  return {
    tracked: !!variant?.manage_inventory && !!link,
    stocked,
    held,
    available: Math.max(0, stocked - held),
    itemId: link?.inventory_item_id,
    locationId: inv?.location_levels?.[0]?.location_id,
  }
}

/** Fields that bring each size's stock back with a product. */
export const STOCK_FIELDS = [
  "variants.manage_inventory",
  "variants.inventory_items.inventory_item_id",
  "variants.inventory_items.inventory.stocked_quantity",
  "variants.inventory_items.inventory.reserved_quantity",
  "variants.inventory_items.inventory.location_levels.location_id",
  "variants.inventory_items.inventory.location_levels.stocked_quantity",
].join(",")

export const meta = (order: ShopOrder, key: string) => {
  const value = (order.metadata ?? {})[key]
  return typeof value === "string" ? value : ""
}

/**
 * Where an order is in the florist's day.
 *
 * Medusa tracks payment and fulfilment separately and has no notion of the
 * shop having *accepted* an order — which is the step this shop actually
 * works by, since every order is confirmed with the customer on WhatsApp
 * before anything is made. That acceptance is kept in the order's metadata.
 */
export type Stage = "new" | "confirmed" | "sent" | "cancelled"

const SENT = new Set([
  "fulfilled",
  "partially_fulfilled",
  "shipped",
  "partially_shipped",
  "delivered",
  "partially_delivered",
])

export const stageOf = (order: ShopOrder): Stage => {
  if (order.status === "canceled") return "cancelled"
  if (SENT.has(order.fulfillment_status)) return "sent"
  if (meta(order, "shop_confirmed_at")) return "confirmed"
  return "new"
}

/** Money actually received, as Medusa records it. */
export const paidOf = (order: ShopOrder) => order.summary?.paid_total ?? 0
export const refundedOf = (order: ShopOrder) => order.summary?.refunded_total ?? 0
export const isPaid = (order: ShopOrder) =>
  ["captured", "partially_refunded", "refunded", "partially_captured"].includes(
    order.payment_status
  )

/** The one payment on this order that can still be acted on. */
export const livePayment = (order: ShopOrder) =>
  order.payment_collections
    ?.flatMap((c) => c.payments ?? [])
    .find((p) => !p.canceled_at)

export const ORDER_FIELDS = [
  "id",
  "display_id",
  "created_at",
  "status",
  "payment_status",
  "fulfillment_status",
  "total",
  "subtotal",
  "shipping_total",
  "currency_code",
  "email",
  "metadata",
  "summary.paid_total",
  "summary.refunded_total",
  "*items",
  "*shipping_address",
  "*shipping_methods",
  "payment_collections.payments.id",
  "payment_collections.payments.captured_at",
  "payment_collections.payments.canceled_at",
].join(",")

export const PRODUCTS_KEY = ["shop-products"]
export const ORDERS_KEY = ["shop-orders"]
export const CATEGORIES_KEY = ["shop-categories"]
