import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { cancelOrderWorkflow } from "@medusajs/medusa/core-flows"

/**
 * Cancels orders placed while testing checkout.
 *
 * Guest checkout derives a placeholder email from the phone number, so test
 * orders are identifiable by the fake number used to place them. Matching on
 * that rather than on order ID means this stays safe to re-run and can never
 * touch a real customer's order.
 *
 * Run with:
 *   npx medusa exec ./src/scripts/cancel-test-orders.ts
 */
const TEST_PHONES = ["33123456"]

export default async function cancelTestOrders({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "email", "status"],
  })

  const testOrders = orders.filter((o) => {
    const local = (o.email ?? "").split("@")[0]
    return TEST_PHONES.includes(local) && o.status !== "canceled"
  })

  if (!testOrders.length) {
    logger.info("No open test orders found.")
    return
  }

  for (const order of testOrders) {
    try {
      await cancelOrderWorkflow(container).run({ input: { order_id: order.id } })
      logger.info(`Cancelled test order #${order.display_id} (${order.email}).`)
    } catch (e) {
      logger.info(
        `Could not cancel #${order.display_id}: ${
          e instanceof Error ? e.message : String(e)
        }`
      )
    }
  }
}
