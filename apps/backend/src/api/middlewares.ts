import { defineMiddlewares } from "@medusajs/framework/http"

import { homepageSectionMiddlewares } from "./admin/homepage-sections/middlewares"
import { quickProductMiddlewares } from "./admin/quick-products/middlewares"
import { deliveryDayMiddlewares } from "./admin/delivery-days/middlewares"
import { orderLookupMiddlewares } from "./store/order-lookup/middlewares"

export default defineMiddlewares({
  routes: [
    ...homepageSectionMiddlewares,
    ...quickProductMiddlewares,
    ...deliveryDayMiddlewares,
    ...orderLookupMiddlewares,
  ],
})
