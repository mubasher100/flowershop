import {
  MiddlewareRoute,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"

export const OrderLookupSchema = z.object({
  order_number: z.string().min(1, "Enter your order number.").max(32),
  phone: z.string().min(6, "Enter the phone number on the order.").max(32),
})
export type OrderLookupSchema = z.infer<typeof OrderLookupSchema>

export const orderLookupMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/store/order-lookup",
    method: "POST",
    middlewares: [validateAndTransformBody(OrderLookupSchema)],
  },
]
