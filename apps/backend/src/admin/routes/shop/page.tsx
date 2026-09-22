import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CurrencyDollar, Plus, ShoppingBag, Trash } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  FocusModal,
  Heading,
  IconButton,
  Input,
  Label,
  Select,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import { printOrderDocument, SHOP_NAME } from "../../lib/print"
import { sdk } from "../../lib/sdk"

/**
 * The everyday screen.
 *
 * Medusa's admin is built for a warehouse team: a product form with variants,
 * option ladders, price lists and shipping profiles, and a fulfilment flow
 * with several steps. A florist running one shop needs three things — put an
 * item up, take one down, and mark an order as sent — and having to find them
 * among everything else is the problem this page solves.
 *
 * It does not replace the full admin, which is still there for anything
 * unusual. It just puts the daily work on one screen.
 */

type Money = { amount: number; currency_code: string }

type AdminProduct = {
  id: string
  title: string
  thumbnail: string | null
  status: string
  variants?: {
    id: string
    inventory_quantity?: number
    prices?: Money[]
    calculated_price?: { calculated_amount?: number }
  }[]
}

type AdminOrder = {
  id: string
  display_id: number
  created_at: string
  total: number
  currency_code: string
  fulfillment_status?: string
  email?: string
  subtotal?: number
  shipping_total?: number
  metadata?: Record<string, unknown> | null
  items?: {
    id: string
    title: string
    quantity: number
    unit_price?: number
    total?: number
    variant_title?: string | null
    metadata?: Record<string, unknown> | null
  }[]
  shipping_address?: {
    first_name?: string | null
    last_name?: string | null
    phone?: string | null
    address_1?: string | null
    city?: string | null
  } | null
  shipping_methods?: { name?: string; amount?: number }[]
}

const PRODUCTS_KEY = ["shop-products"]
const ORDERS_KEY = ["shop-orders"]

const money = (amount: number, currency = "QAR") =>
  `${currency.toUpperCase()} ${Number(amount ?? 0).toFixed(2)}`

/** Prices are stored as-is in Medusa — 260 is 260.00, never 26000. */
const priceOf = (p: AdminProduct) => {
  const v = p.variants?.[0]
  return v?.calculated_price?.calculated_amount ?? v?.prices?.[0]?.amount ?? 0
}

const stockOf = (p: AdminProduct) =>
  p.variants?.reduce((n, v) => n + (v.inventory_quantity ?? 0), 0) ?? 0

const emptyDraft = {
  title: "",
  price: "",
  stock: "10",
  image: "",
  description: "",
  categoryId: "",
}

type Draft = typeof emptyDraft

function AddProduct({
  onDone,
  categories,
}: {
  onDone: () => void
  categories: { id: string; name: string }[]
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft({ ...draft, [k]: v })

  const create = useMutation({
    mutationFn: () =>
      sdk.client.fetch("/admin/quick-products", {
        method: "POST",
        body: {
          title: draft.title.trim(),
          price: Number(draft.price),
          stock: Number(draft.stock),
          image: draft.image.trim() || null,
          description: draft.description.trim() || null,
          categoryId: draft.categoryId || null,
        },
      }),
    onSuccess: () => {
      toast.success(`"${draft.title.trim()}" is now on the shop.`)
      setDraft(emptyDraft)
      setOpen(false)
      onDone()
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not add that."),
  })

  const priceValid = Number(draft.price) > 0
  const ready = draft.title.trim().length > 1 && priceValid

  return (
    <>
      <Button size="small" onClick={() => setOpen(true)}>
        <Plus />
        Add a flower
      </Button>

      <FocusModal open={open} onOpenChange={setOpen}>
        <FocusModal.Content>
          <FocusModal.Header>
            <Button
              size="small"
              onClick={() => create.mutate()}
              disabled={!ready || create.isPending}
              isLoading={create.isPending}
            >
              Put it on the shop
            </Button>
          </FocusModal.Header>
          <FocusModal.Body className="flex flex-col items-center overflow-y-auto py-10">
            <div className="flex w-full max-w-lg flex-col gap-4">
              <div>
                <Heading level="h2">Add a flower</Heading>
                <Text size="small" className="text-ui-fg-subtle">
                  Four things and it is live. Everything else — sales channel,
                  shipping, stock location — is filled in for you.
                </Text>
              </div>

              <div className="flex flex-col gap-2">
                <Label size="small" weight="plus">
                  Name
                </Label>
                <Input
                  value={draft.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="50 Red Roses in a Vase"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label size="small" weight="plus">
                    Price (QAR)
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={draft.price}
                    onChange={(e) => set("price", e.target.value)}
                    placeholder="350"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label size="small" weight="plus">
                    How many in stock
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={draft.stock}
                    onChange={(e) => set("stock", e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label size="small" weight="plus">
                  Photo
                </Label>
                <Input
                  value={draft.image}
                  onChange={(e) => set("image", e.target.value)}
                  placeholder="/products/50-red-rose-vase.jpg"
                />
                <Text size="small" leading="compact" className="text-ui-fg-subtle">
                  A link to the picture. Leave blank and it shows without one.
                </Text>
              </div>

              {categories.length > 0 && (
                <div className="flex flex-col gap-2">
                  <Label size="small" weight="plus">
                    Category
                  </Label>
                  <Select
                    value={draft.categoryId}
                    onValueChange={(v) => set("categoryId", v)}
                  >
                    <Select.Trigger>
                      <Select.Value placeholder="Choose one" />
                    </Select.Trigger>
                    <Select.Content>
                      {categories.map((c) => (
                        <Select.Item key={c.id} value={c.id}>
                          {c.name}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label size="small" weight="plus">
                  Description
                </Label>
                <Textarea
                  rows={3}
                  value={draft.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="What is in it, and who it suits."
                />
              </div>
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </>
  )
}

/**
 * The "we've got your order" message, ready to send.
 *
 * The shop promises at checkout that it will confirm on WhatsApp, and there
 * is no notification provider to do it automatically — so this writes the
 * message and opens the chat. One tap instead of copying six fields out of
 * the order by hand, which is where mistakes were going to come from.
 */
function whatsappConfirmation(order: AdminOrder, shopName: string) {
  const meta = (order.metadata ?? {}) as Record<string, string>
  const to = (meta.contact_phone || order.shipping_address?.phone || "").replace(
    /\D/g,
    ""
  )
  const items = (order.items ?? [])
    .map((i) => `• ${i.quantity} × ${i.title}`)
    .join("\n")
  const when = [meta.delivery_date, meta.delivery_window]
    .filter(Boolean)
    .join(", ")

  const lines = [
    `Hello${meta.contact_name ? " " + meta.contact_name : ""}, this is ${shopName}.`,
    "",
    `Your order #${order.display_id} is confirmed:`,
    items,
    when ? `Delivery: ${when}` : "",
    meta.delivery_area ? `Area: ${meta.delivery_area}` : "",
    meta.recipient_name ? `For: ${meta.recipient_name}` : "",
    "",
    "We will message you again when it is on its way. Thank you!",
  ].filter((l) => l !== "")

  return to
    ? `https://wa.me/${to}?text=${encodeURIComponent(lines.join("\n"))}`
    : null
}

const ShopPage = () => {
  const queryClient = useQueryClient()

  const { data: productData, isLoading: loadingProducts } = useQuery({
    queryKey: PRODUCTS_KEY,
    queryFn: () =>
      sdk.client.fetch<{ products: AdminProduct[] }>(
        "/admin/products?limit=100&fields=id,title,thumbnail,status,*variants,*variants.prices"
      ),
  })

  const { data: orderData, isLoading: loadingOrders } = useQuery({
    queryKey: ORDERS_KEY,
    queryFn: () =>
      sdk.client.fetch<{ orders: AdminOrder[] }>(
        "/admin/orders?limit=25&order=-created_at&fields=id,display_id,created_at,total,subtotal,shipping_total,currency_code,fulfillment_status,email,metadata,*items,*shipping_address,*shipping_methods"
      ),
  })

  const { data: categoryData } = useQuery({
    queryKey: ["shop-categories"],
    queryFn: () =>
      sdk.client.fetch<{ product_categories: { id: string; name: string }[] }>(
        "/admin/product-categories?limit=50"
      ),
  })

  const products = productData?.products ?? []
  const orders = orderData?.orders ?? []
  const categories = categoryData?.product_categories ?? []

  const refreshProducts = () =>
    queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY })

  const removeProduct = useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch(`/admin/products/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Taken off the shop.")
      refreshProducts()
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not remove that."),
  })

  const fulfil = useMutation({
    mutationFn: (order: AdminOrder) =>
      sdk.client.fetch(`/admin/orders/${order.id}/fulfillments`, {
        method: "POST",
        body: {
          items: (order.items ?? []).map((i) => ({
            id: i.id,
            quantity: i.quantity,
          })),
        },
      }),
    onSuccess: () => {
      toast.success("Marked as sent.")
      queryClient.invalidateQueries({ queryKey: ORDERS_KEY })
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not update the order."),
  })

  const waiting = orders.filter((o) => o.fulfillment_status !== "fulfilled")

  return (
    <div className="flex flex-col gap-4">
      {/* Orders first. Something waiting to go out is more urgent than the
          catalogue, and this is the screen that gets opened each morning. */}
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading level="h2">Orders to send</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Confirm on WhatsApp, then mark it sent once the courier has it.
            </Text>
          </div>
          <Badge size="2xsmall">{waiting.length} waiting</Badge>
        </div>

        {loadingOrders ? (
          <div className="px-6 py-8">
            <Text size="small" className="text-ui-fg-subtle">
              Loading orders…
            </Text>
          </div>
        ) : waiting.length === 0 ? (
          <div className="px-6 py-8">
            <Text size="small" className="text-ui-fg-subtle">
              Nothing waiting. Everything has been sent.
            </Text>
          </div>
        ) : (
          <div className="flex flex-col divide-y">
            {waiting.map((order) => {
              const meta = (order.metadata ?? {}) as Record<string, string>
              return (
                <div
                  key={order.id}
                  className="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Text size="small" leading="compact" weight="plus">
                        #{order.display_id}
                      </Text>
                      <Text size="small" leading="compact">
                        {meta.contact_name || order.email || "Guest"}
                      </Text>
                      {meta.contact_phone && (
                        <Badge size="2xsmall">{meta.contact_phone}</Badge>
                      )}
                      {meta.payment_reference && (
                        <Badge size="2xsmall" color="orange">
                          demo payment
                        </Badge>
                      )}
                      {/* A midnight run is the one order that cannot slip to
                          the next van. Loud on purpose. */}
                      {meta.delivery_window === "11:59 PM" && (
                        <Badge size="2xsmall" color="purple">
                          11:59 midnight
                        </Badge>
                      )}
                    </div>

                    <Text
                      size="small"
                      leading="compact"
                      className="text-ui-fg-subtle"
                    >
                      {(order.items ?? [])
                        .map((i) => `${i.quantity}× ${i.title}`)
                        .join(", ") || "No items"}
                    </Text>

                    <Text
                      size="small"
                      leading="compact"
                      className="text-ui-fg-subtle"
                    >
                      {[
                        meta.delivery_area,
                        meta.delivery_date,
                        meta.delivery_window,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      {meta.recipient_phone
                        ? ` · calls ${meta.recipient_phone}`
                        : ""}
                      {meta.delivery_notes ? ` · ${meta.delivery_notes}` : ""}
                    </Text>

                    {meta.gift_note && (
                      <Text
                        size="small"
                        leading="compact"
                        className="text-ui-fg-subtle italic"
                      >
                        “{meta.gift_note}”
                      </Text>
                    )}
                  </div>

                  <div className="flex flex-none items-center gap-3">
                    <Text size="small" leading="compact" weight="plus">
                      {money(order.total, order.currency_code)}
                    </Text>
                    <Button
                      size="small"
                      variant="transparent"
                      onClick={() => printOrderDocument(order, "label")}
                    >
                      Label
                    </Button>
                    <Button
                      size="small"
                      variant="transparent"
                      onClick={() => printOrderDocument(order, "receipt")}
                    >
                      Receipt
                    </Button>
                    <Button
                      size="small"
                      variant="transparent"
                      onClick={() => {
                        const href = whatsappConfirmation(order, SHOP_NAME)
                        if (href) window.open(href, "_blank", "noopener")
                        else toast.error("No phone number on this order.")
                      }}
                    >
                      WhatsApp
                    </Button>
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={() => fulfil.mutate(order)}
                      disabled={fulfil.isPending}
                    >
                      Mark sent
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Container>

      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading level="h2">What is on the shop</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              {products.length} item{products.length === 1 ? "" : "s"} for sale.
            </Text>
          </div>
          <AddProduct onDone={refreshProducts} categories={categories} />
        </div>

        {loadingProducts ? (
          <div className="px-6 py-8">
            <Text size="small" className="text-ui-fg-subtle">
              Loading the shop…
            </Text>
          </div>
        ) : (
          <div className="flex flex-col divide-y">
            {products.map((p) => {
              const stock = stockOf(p)
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 px-6 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {p.thumbnail ? (
                      <img
                        src={p.thumbnail}
                        alt=""
                        className="size-10 flex-none rounded-md object-cover"
                      />
                    ) : (
                      <div className="bg-ui-bg-component size-10 flex-none rounded-md" />
                    )}
                    <div className="flex min-w-0 flex-col">
                      <Text size="small" leading="compact" weight="plus">
                        {p.title}
                      </Text>
                      <div className="flex items-center gap-2">
                        <Text
                          size="small"
                          leading="compact"
                          className="text-ui-fg-subtle"
                        >
                          {money(priceOf(p))}
                        </Text>
                        {/* Zero stock is the thing worth noticing at a glance:
                            it is still listed but cannot be bought. */}
                        <Badge
                          size="2xsmall"
                          color={stock > 0 ? "grey" : "orange"}
                        >
                          {stock > 0 ? `${stock} in stock` : "sold out"}
                        </Badge>
                        {p.status !== "published" && (
                          <Badge size="2xsmall" color="orange">
                            hidden
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <IconButton
                    size="small"
                    variant="transparent"
                    aria-label={`Remove ${p.title}`}
                    disabled={removeProduct.isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Take "${p.title}" off the shop? This cannot be undone.`
                        )
                      ) {
                        removeProduct.mutate(p.id)
                      }
                    }}
                  >
                    <Trash />
                  </IconButton>
                </div>
              )
            })}
          </div>
        )}
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Shop",
  icon: ShoppingBag,
})

export default ShopPage
