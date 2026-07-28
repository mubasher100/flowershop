import { Module } from "@medusajs/framework/utils"
import HomepageModuleService from "./service"

/** camelCase — a dash here breaks container resolution at runtime. */
export const HOMEPAGE_MODULE = "homepage"

export default Module(HOMEPAGE_MODULE, {
  service: HomepageModuleService,
})
