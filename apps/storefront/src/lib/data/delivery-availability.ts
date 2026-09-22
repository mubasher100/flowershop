import { sdk } from "@lib/config"

/**
 * Which of the coming days the shop can still deliver on.
 *
 * Asked for once when the checkout opens, for the next few weeks at a time,
 * rather than per keystroke: the answer changes slowly and a round trip on
 * every date change would make the picker feel broken.
 */
export type DayAvailability = {
  date: string
  closed: boolean
  full: boolean
  full_windows: string[]
}

export async function listDeliveryAvailability(
  dates: string[]
): Promise<DayAvailability[]> {
  if (!dates.length) return []

  try {
    const { days } = await sdk.client.fetch<{ days: DayAvailability[] }>(
      "/store/delivery-availability",
      { query: { dates: dates.join(",") }, cache: "no-store" }
    )
    return days ?? []
  } catch (error) {
    // A capacity service that is down must not stop the shop selling; the
    // server re-checks before the order is placed either way.
    console.error("Could not load delivery availability", error)
    return []
  }
}
