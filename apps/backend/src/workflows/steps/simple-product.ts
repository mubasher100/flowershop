import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

/**
 * The pieces a product needs before it can actually be sold.
 *
 * A product created without a sales channel is invisible to the storefront,
 * one without a shipping profile cannot be checked out, and one without an
 * inventory level at a stock location reads as out of stock. The full admin
 * asks for all three; the shopkeeper should not have to know they exist.
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

/**
 * Puts stock against the new product's variant at the warehouse.
 *
 * createProductsWorkflow makes the inventory *item* but not the *level*, and
 * a variant with no level anywhere is unsellable — it shows as out of stock
 * with no indication why.
 */
export const stockVariantsStep = createStep(
  "stock-variants",
  async (
    input: { productIds: string[]; locationId: string; quantity: number },
    { container }
  ) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: ["id", "inventory_items.inventory_item_id"],
      filters: { product_id: input.productIds },
    })

    const inventoryItemIds = (
      variants as { inventory_items?: { inventory_item_id: string }[] }[]
    ).flatMap((v) => v.inventory_items?.map((i) => i.inventory_item_id) ?? [])

    if (!inventoryItemIds.length) {
      // Same compensation shape as the success path — returning a bare
      // response here made the step infer two incompatible signatures.
      return new StepResponse({ levelled: 0 }, [] as string[])
    }

    const inventory = container.resolve(Modules.INVENTORY) as {
      createInventoryLevels(
        data: {
          inventory_item_id: string
          location_id: string
          stocked_quantity: number
        }[]
      ): Promise<{ id: string }[]>
      deleteInventoryLevels(ids: string[]): Promise<void>
    }

    const created = await inventory.createInventoryLevels(
      inventoryItemIds.map((id) => ({
        inventory_item_id: id,
        location_id: input.locationId,
        stocked_quantity: input.quantity,
      }))
    )

    return new StepResponse(
      { levelled: created.length },
      created.map((l) => l.id)
    )
  },
  async (levelIds, { container }) => {
    if (!levelIds?.length) return
    const inventory = container.resolve(Modules.INVENTORY) as {
      deleteInventoryLevels(ids: string[]): Promise<void>
    }
    await inventory.deleteInventoryLevels(levelIds)
  }
)
