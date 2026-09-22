import { model } from "@medusajs/framework/utils"

/**
 * How much the shop can actually deliver on one day.
 *
 * The site used to accept unlimited orders into every two-hour window and had
 * no way to close a day at all — so it would happily sell forty bouquets into
 * one 2pm-4pm slot on Valentine's Day, and there was nothing to stop it
 * taking orders for Eid when the shop was shut.
 *
 * A row exists for a date only once someone has booked it or the shop has set
 * a rule for it. No row means an ordinary open day with the default limits,
 * which keeps the table small and means the shop never has to "open" a date
 * before it can be used.
 */
const DeliveryDay = model.define("delivery_day", {
  id: model.id().primaryKey(),

  /** yyyy-mm-dd in Qatar time, which is how the storefront reasons about dates. */
  date: model.text().unique(),

  /** Shut for deliveries — a holiday, or the shop is simply full. */
  closed: model.boolean().default(false),

  /**
   * Most orders the shop will take for this day, across every window.
   * Null means the default applies.
   */
  max_orders: model.number().nullable(),

  /**
   * Most orders per two-hour window. Null means the default applies.
   * A day can be open and still have its afternoon full.
   */
  max_per_window: model.number().nullable(),

  /** Orders already booked for this date. Maintained by the order subscriber. */
  booked: model.number().default(0),

  /**
   * Orders already booked per window, as { "2pm - 4pm": 3 }.
   *
   * Counted here rather than by querying orders: the delivery window lives in
   * order metadata, which the Admin API cannot filter or group by, so the
   * alternative is reading every order on every checkout page load.
   */
  window_counts: model.json().nullable(),

  /** Shown to the shop in the admin, never to a customer. */
  note: model.text().nullable(),
})

export default DeliveryDay
