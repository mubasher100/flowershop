import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

/**
 * The pieces a product needs before it can actually be sold.
 *
 * A product created without a sales channel is invisible to the storefront,
 * and one without a shipping profile cannot be checked out. The full admin
 * asks for both; the shopkeeper should not have to know they exist.
 */
export const resolveStoreDefaultsStep = createStep(
  "resolve-store-defaults",
  async (_: unknown, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const [channels, profiles, locations] = await Promise.all([
      query.graph({ entity: "sales_channel", fields: ["id"] }),
      query.graph({ entity: "shipping_profile", fields: ["id"] }),
      query.graph({ entity: "stock_location", fields: ["id"] }),
    ])

    const salesChannelId = channels.data[0]?.id
    const shippingProfileId = profiles.data[0]?.id
    const stockLocationId = locations.data[0]?.id

    if (!salesChannelId || !shippingProfileId || !stockLocationId) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "The store is not fully configured — run seed-qatar.ts first."
      )
    }

    return new StepResponse({ salesChannelId, shippingProfileId, stockLocationId })
  }
)
