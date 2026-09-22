import { Module } from "@medusajs/framework/utils"
import DeliveryCapacityModuleService from "./service"

/** camelCase — a dash here breaks container resolution at runtime. */
export const DELIVERY_CAPACITY_MODULE = "deliveryCapacity"

export default Module(DELIVERY_CAPACITY_MODULE, {
  service: DeliveryCapacityModuleService,
})
