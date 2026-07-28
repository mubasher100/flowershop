import { defineMiddlewares } from "@medusajs/framework/http"

import { homepageSectionMiddlewares } from "./admin/homepage-sections/middlewares"

export default defineMiddlewares({
  routes: [...homepageSectionMiddlewares],
})
