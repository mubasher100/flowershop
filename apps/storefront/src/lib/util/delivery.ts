/**
 * Delivery areas and time windows.
 *
 * One source, because these are offered by the checkout form, listed on the
 * delivery page, and — importantly — validated on the server. Three copies of
 * the list meant the server had nothing authoritative to check a submitted
 * value against.
 *
 * Deliberately English in both locales: the shopkeeper reads the area off the
 * order, and a translated address is one they have to translate back.
 */

export const DELIVERY_AREAS = [
  "Al Dafna",
  "West Bay",
  "The Pearl",
  "Lusail",
  "Msheireb",
  "Al Sadd",
  "Bin Mahmoud",
  "Al Waab",
  "Aziziya",
  "Al Rayyan",
  "Umm Salal",
  "Al Wakrah",
  "Al Khor",
  "Education City",
  "Old Airport",
  "Muaither",
] as const

export const DELIVERY_WINDOWS = [
  "10am – 12pm",
  "12pm – 2pm",
  "2pm – 4pm",
  "4pm – 6pm",
  "6pm – 8pm",
  "8pm – 9pm",
] as const

/**
 * Longest value accepted for each free-text field on an order.
 *
 * The form caps these in the browser, but a form post is just an HTTP request
 * — nothing stopped a crafted one writing a megabyte of text into an order's
 * metadata. Generous enough that no real address or message is truncated.
 */
export const FIELD_LIMITS = {
  name: 120,
  phone: 32,
  recipient: 120,
  address: 500,
  giftNote: 300,
  instructions: 200,
  email: 254,
} as const

export const isDeliveryArea = (value: string): boolean =>
  (DELIVERY_AREAS as readonly string[]).includes(value)

export const isDeliveryWindow = (value: string): boolean =>
  (DELIVERY_WINDOWS as readonly string[]).includes(value)

/**
 * The 11:59 midnight surprise.
 *
 * Identified by the shipping option's type code, which is stable, with the
 * name as a fallback for a response that did not include the type. It is a
 * delivery *option* rather than a product — any bouquet, at one specific
 * minute — so checkout treats it as a shipping choice with two differences:
 * the time is fixed, and the date means "the night before".
 */
export const MIDNIGHT_CODE = "midnight"
export const MIDNIGHT_WINDOW = "11:59 PM"

export const isMidnightOption = (option?: {
  name?: string | null
  type?: { code?: string | null } | null
}): boolean =>
  option?.type?.code === MIDNIGHT_CODE ||
  /11[:.]59/.test(option?.name ?? "")

/**
 * 11:59 is pre-order only.
 *
 * The florist goes home at 8pm, so tonight's midnight run has to be made up
 * during the afternoon: orders for a given night are taken between these two
 * hours (Qatar time) on that day. Earlier and the shop has not opened the
 * day's midnight list; later and the bouquet cannot be made in time. Future
 * nights can be booked at any hour. Both bounds are shown at checkout and
 * enforced when the order is placed.
 */
export const MIDNIGHT_ORDER_OPENS_HOUR = 12
export const MIDNIGHT_ORDER_CLOSES_HOUR = 18

/** The date (yyyy-mm-dd) and hour in Qatar right now. */
export const qatarClock = (now = new Date()) => {
  const date = now.toLocaleDateString("en-CA", { timeZone: "Asia/Qatar" })
  const hour = Number(
    now.toLocaleString("en-US", {
      timeZone: "Asia/Qatar",
      hour: "numeric",
      hour12: false,
    })
  )
  const next = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const tomorrow = next.toLocaleDateString("en-CA", { timeZone: "Asia/Qatar" })
  // "24" is how some engines spell midnight in hour12: false.
  return { date, hour: hour % 24, tomorrow }
}

export type MidnightAvailability = "open" | "not-yet" | "closed"

/**
 * Whether an 11:59 order for the given night can be taken right now.
 * Only tonight is gated; any later night is always open.
 */
export const midnightAvailability = (
  night: string,
  clock = qatarClock()
): MidnightAvailability => {
  if (night !== clock.date) return "open"
  if (clock.hour < MIDNIGHT_ORDER_OPENS_HOUR) return "not-yet"
  if (clock.hour >= MIDNIGHT_ORDER_CLOSES_HOUR) return "closed"
  return "open"
}

/**
 * Same-day delivery, and when it stops.
 *
 * The site promises "order before 6pm and it arrives today", so 6pm is the
 * hour after which today is no longer offered at all. Before then, a window
 * still has to be far enough ahead to cut, arrange and drive the order:
 * LEAD_HOURS is that gap, so at 1pm the 2pm-4pm slot is already gone.
 *
 * Both numbers live here because the checkout, the delivery page and the
 * server-side validation all have to agree about them.
 */
export const SAME_DAY_CUTOFF_HOUR = 18
export const SAME_DAY_LEAD_HOURS = 2

/** The hour a window opens: "2pm - 4pm" is 14. */
export const windowStartHour = (value: string): number => {
  const m = value.match(/^(\d{1,2})\s*(am|pm)/i)
  if (!m) return 0
  const h = Number(m[1]) % 12
  return /pm/i.test(m[2]) ? h + 12 : h
}

/**
 * The windows that can still be promised for a given date.
 * A future date gets all of them; today gets whatever is far enough ahead,
 * and nothing at all once the cut-off has passed; a past date gets none.
 */
export const windowsFor = (
  date: string,
  clock = qatarClock()
): readonly string[] => {
  if (date > clock.date) return DELIVERY_WINDOWS
  if (date < clock.date) return []
  if (clock.hour >= SAME_DAY_CUTOFF_HOUR) return []
  return DELIVERY_WINDOWS.filter(
    (w) => windowStartHour(w) >= clock.hour + SAME_DAY_LEAD_HOURS
  )
}

/** The earliest date standard delivery can still be promised. */
export const earliestStandardDate = (clock = qatarClock()): string =>
  windowsFor(clock.date, clock).length ? clock.date : clock.tomorrow

