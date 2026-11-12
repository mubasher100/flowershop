/**
 * Orders as the florist works them: New → Confirmed (on WhatsApp) → Sent.
 * Carried over from the admin's orders panel; the actions are Medusa's own.
 */
import { SHOP_NAME } from "@admin-lib/print"

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

export const meta = (order: ShopOrder, key: string) => {
  const value = (order.metadata ?? {})[key]
  return typeof value === "string" ? value : ""
}

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

export const paidOf = (o: ShopOrder) => o.summary?.paid_total ?? 0
export const refundedOf = (o: ShopOrder) => o.summary?.refunded_total ?? 0
export const isPaid = (o: ShopOrder) =>
  ["captured", "partially_refunded", "refunded", "partially_captured"].includes(o.payment_status)

export const livePayment = (o: ShopOrder) =>
  o.payment_collections?.flatMap((c) => c.payments ?? []).find((p) => !p.canceled_at)

export const customerName = (o: ShopOrder) =>
  meta(o, "contact_name") ||
  [o.shipping_address?.first_name, o.shipping_address?.last_name].filter(Boolean).join(" ") ||
  "Guest"

export const customerPhone = (o: ShopOrder) => meta(o, "contact_phone") || o.shipping_address?.phone || ""

/** Sorts two-hour windows by when they start; 11:59 goes last. */
export function windowRank(window: string): number {
  if (!window) return 99
  if (/11[:.]59/.test(window)) return 98
  const m = window.match(/^(\d{1,2})\s*(am|pm)/i)
  if (!m) return 97
  const h = Number(m[1]) % 12
  return /pm/i.test(m[2]) ? h + 12 : h
}

export const todayInQatar = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Qatar" })

/** "Today · Thu 13 Nov", "Tomorrow · …", "Overdue · …". */
export function dayHeading(date: string, today = todayInQatar()): string {
  if (date === "unscheduled") return "No delivery date"
  const d = new Date(`${date}T12:00:00Z`)
  const t = new Date(`${today}T12:00:00Z`)
  const days = Math.round((d.getTime() - t.getTime()) / 86400000)
  const pretty = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
  if (days === 0) return `Today · ${pretty}`
  if (days === 1) return `Tomorrow · ${pretty}`
  if (days < 0) return `Overdue · ${pretty}`
  return pretty
}

/** To-do orders grouped by delivery day, each day in window order. */
export function groupByDay(orders: ShopOrder[]): [string, ShopOrder[]][] {
  const byDay = new Map<string, ShopOrder[]>()
  for (const o of orders) {
    const key = meta(o, "delivery_date") || "unscheduled"
    byDay.set(key, [...(byDay.get(key) ?? []), o])
  }
  const groups = [...byDay.entries()].sort(([a], [b]) =>
    a === "unscheduled" ? 1 : b === "unscheduled" ? -1 : a.localeCompare(b)
  )
  for (const [, g] of groups) {
    g.sort((x, y) => windowRank(meta(x, "delivery_window")) - windowRank(meta(y, "delivery_window")))
  }
  return groups
}

/** Search by order number, name or phone, the way the florist remembers an order. */
export function matchesOrder(o: ShopOrder, query: string): boolean {
  const q = query.trim().toLowerCase().replace(/^#/, "")
  if (!q) return true
  const digits = q.replace(/\D/g, "")
  return (
    String(o.display_id) === q ||
    customerName(o).toLowerCase().includes(q) ||
    meta(o, "recipient_name").toLowerCase().includes(q) ||
    (digits.length >= 3 &&
      [customerPhone(o), meta(o, "recipient_phone")].some((p) => p.replace(/\D/g, "").includes(digits)))
  )
}

/** Every card message on the order, one per item that has one. */
export function giftNotes(o: ShopOrder): string[] {
  const fromItems = (o.items ?? [])
    .map((i) => (typeof i.metadata?.gift_note === "string" ? i.metadata.gift_note.trim() : ""))
    .filter(Boolean)
  const notes = fromItems.length ? fromItems : [meta(o, "gift_note").trim()].filter(Boolean)
  return [...new Set(notes)]
}

/** The "we've got your order" WhatsApp message, ready to send. */
export function whatsappLink(o: ShopOrder): string | null {
  const to = customerPhone(o).replace(/\D/g, "")
  if (!to) return null
  const items = (o.items ?? []).map((i) => `• ${i.quantity} × ${i.title}`).join("\n")
  const when = [meta(o, "delivery_date"), meta(o, "delivery_window")].filter(Boolean).join(", ")
  const name = meta(o, "contact_name")
  const lines = [
    `Hello${name ? " " + name : ""}, this is ${SHOP_NAME}.`,
    "",
    `Your order #${o.display_id} is confirmed:`,
    items,
    when ? `Delivery: ${when}` : "",
    meta(o, "delivery_area") ? `Area: ${meta(o, "delivery_area")}` : "",
    meta(o, "recipient_name") ? `For: ${meta(o, "recipient_name")}` : "",
    "",
    "We will message you again when it is on its way. Thank you!",
  ].filter((l) => l !== "")
  return `https://wa.me/${to}?text=${encodeURIComponent(lines.join("\n"))}`
}
