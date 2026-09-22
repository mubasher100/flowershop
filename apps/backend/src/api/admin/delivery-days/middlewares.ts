import {
  MiddlewareRoute,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"

export const SetDeliveryDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a yyyy-mm-dd date."),
  closed: z.boolean().optional(),
  // Null clears the limit and falls back to the shop default.
  max_orders: z.number().int().min(0).max(1000).nullish(),
  max_per_window: z.number().int().min(0).max(1000).nullish(),
  note: z.string().max(200).nullish(),
})
export type SetDeliveryDaySchema = z.infer<typeof SetDeliveryDaySchema>

export const deliveryDayMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/delivery-days",
    method: "POST",
    middlewares: [validateAndTransformBody(SetDeliveryDaySchema)],
  },
]
