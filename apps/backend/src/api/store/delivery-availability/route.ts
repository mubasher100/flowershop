import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { DELIVERY_CAPACITY_MODULE } from "../../../modules/delivery-capacity"
import {
  DEFAULT_MAX_ORDERS_PER_DAY,
  DEFAULT_MAX_PER_WINDOW,
} from "../../../modules/delivery-capacity/constants"

type DayRow = {
  date: string
  closed: boolean
  max_orders: number | null
  max_per_window: number | null
  booked: number
  window_counts: Record<string, number> | null
}

/**
 * What the shop can still deliver on a given date.
 *
 * The checkout asks before it offers a date, so a day the shop has closed or
 * already filled is never presented as available. Returns nothing about other
 * customers' orders — only whether this date, and each window, can still take
 * one more.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const dates = String(req.query.dates ?? req.query.date ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .slice(0, 31)

  if (!dates.length) {
    res.status(400).json({ message: "Pass one or more dates as yyyy-mm-dd." })
    return
  }

  const service = req.scope.resolve(DELIVERY_CAPACITY_MODULE) as unknown as {
    listDeliveryDays(filters?: Record<string, unknown>): Promise<DayRow[]>
  }

  const rows = await service.listDeliveryDays({ date: dates })
  const byDate = new Map(rows.map((r) => [r.date, r]))

  res.json({
    days: dates.map((date) => {
      const row = byDate.get(date)
      const maxOrders = row?.max_orders ?? DEFAULT_MAX_ORDERS_PER_DAY
      const maxWindow = row?.max_per_window ?? DEFAULT_MAX_PER_WINDOW
      const counts = (row?.window_counts ?? {}) as Record<string, number>

      return {
        date,
        closed: !!row?.closed,
        full: (row?.booked ?? 0) >= maxOrders,
        // Windows with no room left. The storefront removes these from the
        // picker rather than letting someone choose one and be refused.
        full_windows: Object.entries(counts)
          .filter(([, n]) => n >= maxWindow)
          .map(([w]) => w),
      }
    }),
  })
}
