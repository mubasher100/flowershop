import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { DELIVERY_CAPACITY_MODULE } from "../../../modules/delivery-capacity"
import {
  DEFAULT_MAX_ORDERS_PER_DAY,
  DEFAULT_MAX_PER_WINDOW,
} from "../../../modules/delivery-capacity/constants"
import { setDeliveryDayRuleWorkflow } from "../../../workflows/manage-delivery-capacity"
import type { SetDeliveryDaySchema } from "./middlewares"

type DayRow = {
  id: string
  date: string
  closed: boolean
  max_orders: number | null
  max_per_window: number | null
  booked: number
  window_counts: Record<string, number> | null
  note: string | null
}

/** Every day the shop has booked or configured, soonest first. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const service = req.scope.resolve(DELIVERY_CAPACITY_MODULE) as unknown as {
    listDeliveryDays(
      filters?: Record<string, unknown>,
      config?: Record<string, unknown>
    ): Promise<DayRow[]>
  }

  const days = await service.listDeliveryDays(
    {},
    { order: { date: "ASC" }, take: 120 }
  )

  res.json({
    days,
    defaults: {
      max_orders: DEFAULT_MAX_ORDERS_PER_DAY,
      max_per_window: DEFAULT_MAX_PER_WINDOW,
    },
  })
}

/** Close a day, reopen it, or change its limits. */
export async function POST(
  req: AuthenticatedMedusaRequest<SetDeliveryDaySchema>,
  res: MedusaResponse
) {
  const { result } = await setDeliveryDayRuleWorkflow(req.scope).run({
    input: req.validatedBody,
  })

  res.json({ day: result })
}
