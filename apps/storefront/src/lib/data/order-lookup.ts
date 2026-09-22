"use server"

import { sdk } from "@lib/config"

/**
 * Looking up an order without an account.
 *
 * The shop is guest-only and sends no email, so once the confirmation tab is
 * closed a customer has no way back to their order. This is it: the order
 * number they were shown plus the phone number on the order.
 *
 * The backend decides what is safe to return and answers "no order matches
 * those details" for both a wrong number and a missing order, so this cannot
 * be used to discover which order numbers exist.
 */
export type TrackedOrder = {
  order_number: number
  placed_at: string
  /** "preparing" | "sent" | "cancelled" — the backend reduces Medusa's
      states to the one word a customer is actually asking about. */
  state: string
  currency_code: string
  total: number
  delivery_date: string | null
  delivery_window: string | null
  delivery_area: string | null
  recipient_name: string | null
  shipping_method: string | null
  items: { title: string; quantity: number }[]
}

export type TrackState = { order?: TrackedOrder; error?: string }

export async function trackOrder(
  _prev: TrackState,
  formData: FormData
): Promise<TrackState> {
  const order_number = String(formData.get("order_number") ?? "").trim().slice(0, 32)
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 32)

  if (!order_number) return { error: "Please enter your order number." }
  if (phone.replace(/\D/g, "").length < 6) {
    return { error: "Please enter the phone number on the order." }
  }

  try {
    const { order } = await sdk.client.fetch<{ order: TrackedOrder }>(
      "/store/order-lookup",
      { method: "POST", body: { order_number, phone }, cache: "no-store" }
    )
    return { order }
  } catch {
    return { error: "No order matches those details. Check both and try again." }
  }
}
