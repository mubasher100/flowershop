import {
  MiddlewareRoute,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"

export const CreateQuickProductSchema = z.object({
  title: z.string().min(2, "Give the product a name."),
  // Prices are stored as-is in Medusa: 260 means 260.00 QAR. Capped at a
  // value no bouquet reaches, so a stray keystroke cannot list something at
  // six figures.
  price: z.number().positive("Set a price.").max(100000),
  image: z.string().url("The photo did not upload properly.").nullish(),
  description: z.string().max(2000).nullish(),
  categoryIds: z.array(z.string()).max(20).optional(),
  collectionId: z.string().nullish(),
  publish: z.boolean().optional(),
})
export type CreateQuickProductSchema = z.infer<typeof CreateQuickProductSchema>

export const quickProductMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/quick-products",
    method: "POST",
    middlewares: [validateAndTransformBody(CreateQuickProductSchema)],
  },
]
