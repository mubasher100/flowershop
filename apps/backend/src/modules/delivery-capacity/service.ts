import { MedusaService } from "@medusajs/framework/utils"
import DeliveryDay from "./models/delivery-day"

/**
 * CRUD only. The rules about what "full" means live in the workflows and the
 * store endpoint, so there is one place to change them.
 */
class DeliveryCapacityModuleService extends MedusaService({
  DeliveryDay,
}) {}

export default DeliveryCapacityModuleService
