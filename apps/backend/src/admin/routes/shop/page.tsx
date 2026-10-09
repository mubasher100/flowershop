import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ShoppingBag } from "@medusajs/icons"

import LabelLogoSettings from "../../components/label-logo-settings"
import FlowersPanel from "../../components/shop/flowers-panel"
import OrdersPanel from "../../components/shop/orders-panel"

/**
 * The everyday screen.
 *
 * Medusa's admin is built for a warehouse team: a product form with variants,
 * option ladders, price lists and shipping profiles, and a fulfilment flow
 * with several steps. A florist running one shop needs a handful of things —
 * put a flower up, change its price, take it down, and move an order from
 * "new" to "sent", with a way out if it goes wrong — and having to find them
 * among everything else is the problem this page solves.
 *
 * It does not replace the full admin, which is still there for anything
 * unusual. Everything here goes through Medusa's own routes and workflows,
 * so an order cancelled here is cancelled exactly as it would be there.
 *
 * Rebuilt 9 Oct 2026 around a written guide for the florist: photo upload in
 * place of a typed link, hide/show in place of a delete that failed whenever
 * an order held the flower, prices editable in place, and a confirm → sent
 * order flow with cancel and refund.
 */
const ShopPage = () => (
  <div className="flex flex-col gap-4">
    {/* Orders first. Something waiting to go out is more urgent than the
        catalogue, and this is the screen that gets opened each morning. */}
    <OrdersPanel />
    <FlowersPanel />
    {/* Last: set once, then forgotten. */}
    <LabelLogoSettings />
  </div>
)

export const config = defineRouteConfig({
  label: "Shop",
  icon: ShoppingBag,
})

export default ShopPage
