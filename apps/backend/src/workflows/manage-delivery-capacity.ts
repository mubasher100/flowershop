import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import {
  DELIVERY_CAPACITY_MODULE,
} from "../modules/delivery-capacity"

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

type CapacityService = {
  listDeliveryDays(
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ): Promise<DayRow[]>
  createDeliveryDays(data: Record<string, unknown>): Promise<DayRow | DayRow[]>
  updateDeliveryDays(data: Record<string, unknown>): Promise<DayRow | DayRow[]>
}

const one = (result: DayRow | DayRow[]) =>
  Array.isArray(result) ? result[0] : result

/**
 * Booking and releasing a delivery slot.
 *
 * Counts are kept on the day row rather than derived from orders, because the
 * delivery date and window live in order metadata, which the Admin API cannot
 * filter or group by — deriving them would mean reading every order on every
 * checkout page load.
 */
const adjustBookingStep = createStep(
  "adjust-delivery-booking",
  async (
    input: { date: string; window: string; delta: number },
    { container }
  ) => {
    if (!input.date) return new StepResponse(null, null)

    const service = container.resolve(
      DELIVERY_CAPACITY_MODULE
    ) as unknown as CapacityService

    const [existing] = await service.listDeliveryDays({ date: input.date })

    const counts: Record<string, number> = {
      ...((existing?.window_counts as Record<string, number>) ?? {}),
    }
    if (input.window) {
      counts[input.window] = Math.max(
        0,
        (counts[input.window] ?? 0) + input.delta
      )
    }
    const booked = Math.max(0, (existing?.booked ?? 0) + input.delta)

    if (existing) {
      await service.updateDeliveryDays({
        id: existing.id,
        booked,
        window_counts: counts,
      })
    } else {
      // The day has never been booked or configured, so the row is created on
      // first use and stays absent for every quiet date.
      await service.createDeliveryDays({
        date: input.date,
        booked,
        window_counts: counts,
      })
    }

    return new StepResponse(null, input)
  },
  // Undo puts the count back, so a failed order does not consume a slot.
  async (input, { container }) => {
    if (!input) return
    const service = container.resolve(
      DELIVERY_CAPACITY_MODULE
    ) as unknown as CapacityService
    const [existing] = await service.listDeliveryDays({ date: input.date })
    if (!existing) return

    const counts: Record<string, number> = {
      ...((existing.window_counts as Record<string, number>) ?? {}),
    }
    if (input.window) {
      counts[input.window] = Math.max(
        0,
        (counts[input.window] ?? 0) - input.delta
      )
    }
    await service.updateDeliveryDays({
      id: existing.id,
      booked: Math.max(0, existing.booked - input.delta),
      window_counts: counts,
    })
  }
)

export const bookDeliverySlotWorkflow = createWorkflow(
  "book-delivery-slot",
  function (input: { date: string; window: string }) {
    adjustBookingStep({ date: input.date, window: input.window, delta: 1 })
    return new WorkflowResponse(void 0)
  }
)

export const releaseDeliverySlotWorkflow = createWorkflow(
  "release-delivery-slot",
  function (input: { date: string; window: string }) {
    adjustBookingStep({ date: input.date, window: input.window, delta: -1 })
    return new WorkflowResponse(void 0)
  }
)

/** Admin: close a day, or set its limits. */
const setDayRuleStep = createStep(
  "set-delivery-day-rule",
  async (
    input: {
      date: string
      closed?: boolean
      max_orders?: number | null
      max_per_window?: number | null
      note?: string | null
    },
    { container }
  ) => {
    const service = container.resolve(
      DELIVERY_CAPACITY_MODULE
    ) as unknown as CapacityService
    const [existing] = await service.listDeliveryDays({ date: input.date })

    const before = existing ? { ...existing } : null
    const patch = {
      ...(input.closed !== undefined ? { closed: input.closed } : {}),
      ...(input.max_orders !== undefined ? { max_orders: input.max_orders } : {}),
      ...(input.max_per_window !== undefined
        ? { max_per_window: input.max_per_window }
        : {}),
      ...(input.note !== undefined ? { note: input.note } : {}),
    }

    const row = existing
      ? one(await service.updateDeliveryDays({ id: existing.id, ...patch }))
      : one(await service.createDeliveryDays({ date: input.date, ...patch }))

    return new StepResponse(row, before)
  },
  async (before, { container }) => {
    if (!before) return
    const service = container.resolve(
      DELIVERY_CAPACITY_MODULE
    ) as unknown as CapacityService
    await service.updateDeliveryDays({
      id: before.id,
      closed: before.closed,
      max_orders: before.max_orders,
      max_per_window: before.max_per_window,
      note: before.note,
    })
  }
)

export const setDeliveryDayRuleWorkflow = createWorkflow(
  "set-delivery-day-rule",
  function (input: {
    date: string
    closed?: boolean
    max_orders?: number | null
    max_per_window?: number | null
    note?: string | null
  }) {
    const day = setDayRuleStep(input)
    return new WorkflowResponse(day)
  }
)
