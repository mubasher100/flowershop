import { ModuleProvider, Modules } from "@medusajs/framework/utils"

import SkipCashProviderService from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [SkipCashProviderService],
})
