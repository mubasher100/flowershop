import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
import { ProductStatus } from "@medusajs/framework/utils"
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import {
  resolveStoreDefaultsStep,
  stockVariantsStep,
} from "./steps/simple-product"

export type SimpleProductInput = {
  title: string
  /** QAR, stored as-is: 260 means 260.00. */
  price: number
  stock: number
  image?: string | null
  description?: string | null
  categoryId?: string | null
  collectionId?: string | null
}

/** Turns a name into a URL handle: "50 Red Roses" -> "50-red-roses". */
const handleize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

/**
 * Creates a sellable product from the four things a florist actually knows:
 * what it is called, what it costs, how many there are, and a photograph.
 *
 * Everything else a product needs to be purchasable — a sales channel so the
 * storefront can see it, a shipping profile so it can be checked out, a
 * variant to carry the price, and an inventory level at the warehouse — is
 * filled in from the store's configuration. Those are the fields that make
 * Medusa's own product form long, and none of them vary here.
 *
 * A single "One size" variant, deliberately. The seeded catalogue has a
 * Petite/Classic/Grandeur ladder, but a size ladder is a decision worth making
 * in the full editor rather than something to impose on every new item.
 */
export const createSimpleProductWorkflow = createWorkflow(
  "create-simple-product",
  function (input: SimpleProductInput) {
    const defaults = resolveStoreDefaultsStep()

    const productsInput = transform({ input, defaults }, (data) => ({
      products: [
        {
          title: data.input.title,
          handle: handleize(data.input.title),
          description: data.input.description ?? undefined,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: data.defaults.shippingProfileId,
          sales_channels: [{ id: data.defaults.salesChannelId }],
          thumbnail: data.input.image ?? undefined,
          images: data.input.image ? [{ url: data.input.image }] : undefined,
          category_ids: data.input.categoryId ? [data.input.categoryId] : [],
          collection_id: data.input.collectionId ?? undefined,
          options: [{ title: "Size", values: ["One size"] }],
          variants: [
            {
              title: "One size",
              sku: handleize(data.input.title),
              manage_inventory: true,
              options: { Size: "One size" },
              // Prices are stored as-is. 260 is 260.00 QAR, never 26000.
              prices: [{ currency_code: "qar", amount: data.input.price }],
            },
          ],
        },
      ],
    }))

    const created = createProductsWorkflow.runAsStep({ input: productsInput })

    const stockInput = transform({ created, input, defaults }, (data) => ({
      productIds: data.created.map((p: { id: string }) => p.id),
      locationId: data.defaults.stockLocationId,
      quantity: data.input.stock,
    }))

    stockVariantsStep(stockInput)

    return new WorkflowResponse(created)
  }
)
