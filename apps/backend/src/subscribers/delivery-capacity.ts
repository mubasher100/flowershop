import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import {
  bookDeliverySlotWorkflow,
  releaseDeliverySlotWorkflow,
} from "../workflows/manage-delivery-capacity"

/**
 * Keeps the day's booking count in step with the orders.
 *
 * A placed order takes a slot; a cancelled one gives it back. Without the
 * release half, a day would silently fill up with orders that no longer
 * exist and the shop would stop being able to sell a date it could deliver.
 */
const adjust = async (
  { event, container }: SubscriberArgs<{ id: string }>,
  direction: "book" | "release"
) => {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "metadata"],
    filters: { id: event.data.id },
  })

  const metadata = (orders?.[0]?.metadata ?? {}) as Record<string, string>
  const date = metadata.delivery_date
  const window = metadata.delivery_window

  // Orders placed before delivery dates were captured have nothing to count.
  if (!date) return

  const workflow =
    direction === "book" ? bookDeliverySlotWorkflow : releaseDeliverySlotWorkflow

  try {
    await workflow(container).run({ input: { date, window: window ?? "" } })
  } catch (error) {
    // Never fail the order over a counter: an order that exists and is not
    // counted is recoverable, an order that failed to place is not.
    logger.error(
      `Delivery capacity: could not ${direction} ${date} ${window ?? ""} — ${
        (error as Error).message
      }`
    )
  }
}

export default async function deliveryCapacityHandler(
  args: SubscriberArgs<{ id: string }>
) {
  await adjust(args, args.event.name === "order.canceled" ? "release" : "book")
}

export const config: SubscriberConfig = {
  event: ["order.placed", "order.canceled"],
}
