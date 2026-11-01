import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { ChevronDownMini } from "@medusajs/icons"
import { Button, DropdownMenu } from "@medusajs/ui"
import { useNavigate } from "react-router-dom"

/**
 * Every admin page except Shop, behind one button in the top bar.
 *
 * The florist runs the shop from Admin → Shop, and the sidebar's eight other
 * entries were noise around it (the shop's request, 1 Nov 2026). The sidebar
 * now shows Shop alone — a store-wide default set through Medusa's own layout
 * customiser, so it can be undone there — and everything else lives here,
 * one tap away on every page.
 *
 * Settings stays where Medusa puts it, at the foot of the sidebar.
 */
const PAGES = [
  { label: "Orders", to: "/orders" },
  { label: "Products", to: "/products" },
  { label: "Categories", to: "/categories" },
  { label: "Collections", to: "/collections" },
  { label: "Inventory", to: "/inventory" },
  { label: "Customers", to: "/customers" },
  { label: "Promotions", to: "/promotions" },
  { label: "Price lists", to: "/price-lists" },
  { label: "Homepage", to: "/homepage-sections" },
  { label: "Delivery days", to: "/delivery-days" },
  { label: "Settings", to: "/settings" },
]

const MorePagesMenu = () => {
  const navigate = useNavigate()

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <Button size="small" variant="secondary">
          More pages
          <ChevronDownMini />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end">
        {PAGES.map((page) => (
          <DropdownMenu.Item key={page.to} onClick={() => navigate(page.to)}>
            {page.label}
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu>
  )
}

export const config = defineWidgetConfig({
  zone: "topbar",
})

export default MorePagesMenu
