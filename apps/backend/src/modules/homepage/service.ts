import { MedusaService } from "@medusajs/framework/utils"
import HomepageSection from "./models/homepage-section"

/**
 * CRUD only, by design. Ordering rules, validation and anything that touches
 * more than one row belong in workflows.
 */
class HomepageModuleService extends MedusaService({
  HomepageSection,
}) {}

export default HomepageModuleService
