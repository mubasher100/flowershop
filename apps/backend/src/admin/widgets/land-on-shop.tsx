import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"

/**
 * Opening the admin lands on Shop, not Orders.
 *
 * Medusa sends both the admin's front door (/app) and a fresh sign-in to
 * /orders, and has no setting to change that. This sits on the Orders list
 * and moves that arrival on to Shop — the florist's everyday screen.
 *
 * Only that arrival. The test is the address the browser first loaded: if
 * it was /app or the sign-in page, Orders was Medusa's choice, not the
 * person's. A bookmark to /app/orders, a refresh there, or picking Orders
 * from "More pages" all stay put — and it fires at most once per page load,
 * so there is no way for it to loop.
 */
let redirected = false

const openedAtFrontDoor = () => {
  const entry = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined
  const path = new URL(entry?.name ?? window.location.href).pathname.replace(/\/+$/, "")
  return /\/app(\/login)?$/.test(path)
}

const LandOnShop = () => {
  const navigate = useNavigate()

  useEffect(() => {
    if (redirected || !openedAtFrontDoor()) return
    redirected = true
    navigate("/shop", { replace: true })
  }, [navigate])

  return null
}

export const config = defineWidgetConfig({
  zone: "order.list.before",
})

export default LandOnShop
