import type { DayAvailability } from "@lib/data/delivery-availability"

/**
 * Black Friday flowers are delivered Thursday to Sunday only (the shop's
 * request, 25 Nov 2026). A bag with any reduced flower in it can choose only
 * these days; a bag without one chooses as usual. The rule ends by itself:
 * once none of the days can be chosen, every day is offered again, so a
 * customer is never left with nothing to pick.
 */
export const BLACK_FRIDAY_DAYS: readonly string[] = [
  "2026-11-26",
  "2026-11-27",
  "2026-11-28",
  "2026-11-29",
]

/** 8pm on the Sunday: the last moment a Black Friday delivery can be booked. */
const BLACK_FRIDAY_ENDS = Date.parse("2026-11-29T20:00:00+03:00")

export const blackFridayOn = (now = Date.now()) => now < BLACK_FRIDAY_ENDS

/** A flower at a reduced price, in the catalogue. */
export const isSaleVariant = (
  variant?: {
    calculated_price?: {
      calculated_amount?: number | null
      original_amount?: number | null
    } | null
  } | null
): boolean => {
  const p = variant?.calculated_price
  return !!p && (p.original_amount ?? 0) > (p.calculated_amount ?? 0)
}

/** The same, for the bag: Medusa keeps a reduced line's was price beside it. */
export const bagHasSale = (
  items?:
    | { unit_price?: number; compare_at_unit_price?: number | null }[]
    | null
): boolean =>
  (items ?? []).some(
    (i) => (i.compare_at_unit_price ?? 0) > (i.unit_price ?? 0)
  )

/**
 * The Black Friday days that can still be booked from `floor` on. Empty means
 * no restriction. A day nothing is known about counts as open: the capacity
 * service being down must not stop the shop selling.
 */
export const openBlackFridayDays = (
  floor: string,
  availability: DayAvailability[]
): string[] => {
  const known = new Map(availability.map((d) => [d.date, d]))
  return BLACK_FRIDAY_DAYS.filter((date) => {
    const day = known.get(date)
    return date >= floor && !(day && (day.closed || day.full))
  })
}
