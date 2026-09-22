import { defineMiddlewares } from "@medusajs/framework/http"

import { homepageSectionMiddlewares } from "./admin/homepage-sections/middlewares"
import { quickProductMiddlewares } from "./admin/quick-products/middlewares"
import { orderLookupMiddlewares } from "./store/order-lookup/middlewares"

export default defineMiddlewares({
  routes: [
    ...homepageSectionMiddlewares,
    ...quickProductMiddlewares,
    ...orderLookupMiddlewares,
  ],
})
