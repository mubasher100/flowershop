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
} as const

export const isDeliveryArea = (value: string): boolean =>
  (DELIVERY_AREAS as readonly string[]).includes(value)

export const isDeliveryWindow = (value: string): boolean =>
  (DELIVERY_WINDOWS as readonly string[]).includes(value)
