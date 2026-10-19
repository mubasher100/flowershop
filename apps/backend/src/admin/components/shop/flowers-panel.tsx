import { Eye, EyeSlash, PencilSquare, Plus, Trash } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Drawer,
  FocusModal,
  Heading,
  Input,
  Label,
  Prompt,
  Switch,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import { sdk } from "../../lib/sdk"
import CategoryPicker from "./category-picker"
import PhotoPicker from "./photo-picker"
import {
  applyPrice,
  fetchShopPrices,
  sellingOf,
  SHOP_PRICES_KEY,
  type ShopPrices,
} from "./prices"
import {
  CATEGORIES_KEY,
  money,
  priceOf,
  PRODUCTS_KEY,
  STOCK_FIELDS,
  stockOf,
  type ShopCategory,
  type ShopProduct,
} from "./shared"

const errorText = (e: unknown, fallback: string) =>
  e instanceof Error && e.message ? e.message : fallback

/* ------------------------------------------------------------------ Add */

type NewFlower = {
  title: string
  price: string
  was: string
  stock: string
  image: string | null
  description: string
  categoryIds: string[]
  publish: boolean
}

const blank: NewFlower = {
  title: "",
  price: "",
  was: "",
  stock: "10",
  image: null,
  description: "",
  categoryIds: [],
  publish: true,
}

function AddFlower({
  categories,
  salesOn,
}: {
  categories: ShopCategory[]
  /** Whether a sale list is active. Off, the Was box is not offered. */
  salesOn: boolean
}) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<NewFlower>(blank)
  const [uploading, setUploading] = useState(false)
  const set = <K extends keyof NewFlower>(k: K, v: NewFlower[K]) =>
    setDraft((d) => ({ ...d, [k]: v }))

  const create = useMutation({
    mutationFn: async () => {
      const res = await sdk.client.fetch<{ product: { id: string } }>(
        "/admin/quick-products",
        {
          method: "POST",
          body: {
            title: draft.title.trim(),
            price: Number(draft.price),
            stock: Number(draft.stock),
            image: draft.image,
            description: draft.description.trim() || null,
            categoryIds: draft.categoryIds,
            publish: draft.publish,
          },
        }
      )

      // A "was" price puts it on sale from the start: the flower is created at
      // its selling price, then applyPrice moves that into the sale list and
      // makes the was figure its own price.
      const was = Number(draft.was)
      if (draft.was.trim() && was > Number(draft.price)) {
        const [{ product }, shop] = await Promise.all([
          sdk.admin.product.retrieve(res.product.id, {
            fields: "variants.id,*variants.prices",
          }),
          fetchShopPrices(),
        ])
        for (const v of product.variants ?? []) {
          await applyPrice({
            productId: product.id,
            variantId: v.id,
            basePriceId: v.prices?.find((x) => x.currency_code === "qar")?.id,
            current: shop.prices[v.id],
            saleListId: shop.sale_price_list_id,
            now: Number(draft.price),
            was,
          })
        }
      }
    },
    onSuccess: () => {
      toast.success(
        draft.publish
          ? `"${draft.title.trim()}" is on the shop. It can take up to 30 minutes to appear on the website.`
          : `"${draft.title.trim()}" is saved, hidden. Show it when you are ready.`
      )
      setDraft(blank)
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY })
      queryClient.invalidateQueries({ queryKey: SHOP_PRICES_KEY })
    },
    onError: (e) => toast.error(errorText(e, "Could not add that flower.")),
  })

  // What is missing, in words — a disabled button with no reason is the
  // single most confusing thing on a form.
  const missing = [
    draft.title.trim().length < 2 && "a name",
    !(Number(draft.price) > 0) && "a price",
    draft.was.trim() !== "" &&
      !(Number(draft.was) > Number(draft.price)) &&
      "a was price higher than the price (or leave it blank)",
    !(Number.isInteger(Number(draft.stock)) && Number(draft.stock) >= 0) &&
      "how many are in stock",
    !draft.image && "a photo",
    !draft.categoryIds.length && "at least one category",
  ].filter(Boolean) as string[]

  return (
    <>
      <Button size="small" onClick={() => setOpen(true)}>
        <Plus />
        Add a flower
      </Button>

      <FocusModal open={open} onOpenChange={setOpen}>
        <FocusModal.Content>
          <FocusModal.Header>
            <div className="flex items-center justify-end gap-x-2">
              <FocusModal.Close asChild>
                <Button size="small" variant="secondary">
                  Cancel
                </Button>
              </FocusModal.Close>
              <Button
                size="small"
                onClick={() => create.mutate()}
                disabled={missing.length > 0 || uploading || create.isPending}
                isLoading={create.isPending}
              >
                {draft.publish ? "Put it on the shop" : "Save hidden"}
              </Button>
            </div>
          </FocusModal.Header>
          <FocusModal.Body className="flex flex-col items-center overflow-y-auto px-4 py-8">
            <div className="flex w-full max-w-lg flex-col gap-6">
              <div>
                <Heading level="h2">Add a flower</Heading>
                <Text size="small" className="text-ui-fg-subtle">
                  A photo, a name, a price, how many you have, and where it
                  belongs. Everything else is filled in for you.
                </Text>
              </div>

              <div className="flex flex-col gap-2">
                <Label size="small" weight="plus">
                  Photo
                </Label>
                <PhotoPicker
                  value={draft.image}
                  onChange={(url) => set("image", url)}
                  onBusyChange={setUploading}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label size="small" weight="plus" htmlFor="new-title">
                  Name
                </Label>
                <Input
                  id="new-title"
                  value={draft.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="Fifty Red Roses, Vased"
                />
              </div>

              <div className="flex flex-col gap-2">
                <div
                  className={`grid gap-3 ${salesOn ? "grid-cols-3" : "grid-cols-2"}`}
                >
                  <div className="flex flex-col gap-2">
                    <Label size="small" weight="plus" htmlFor="new-price">
                      Price (QAR)
                    </Label>
                    <Input
                      id="new-price"
                      type="number"
                      inputMode="decimal"
                      min={1}
                      value={draft.price}
                      onChange={(e) => set("price", e.target.value)}
                      placeholder="350"
                    />
                  </div>
                  {salesOn && (
                    <div className="flex flex-col gap-2">
                      <Label size="small" weight="plus" htmlFor="new-was">
                        Was{" "}
                        <span className="text-ui-fg-muted font-normal">
                          (optional)
                        </span>
                      </Label>
                      <Input
                        id="new-was"
                        type="number"
                        inputMode="decimal"
                        min={1}
                        value={draft.was}
                        onChange={(e) => set("was", e.target.value)}
                        placeholder="500"
                      />
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <Label size="small" weight="plus" htmlFor="new-stock">
                      In stock
                    </Label>
                    <Input
                      id="new-stock"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      value={draft.stock}
                      onChange={(e) => set("stock", e.target.value)}
                    />
                  </div>
                </div>
                <Text size="xsmall" className="text-ui-fg-muted">
                  Just numbers — 350 means QAR 350.
                  {salesOn &&
                    " Fill in Was and the price shows on sale, with the was price struck through."}{" "}
                  Each order takes one off the stock; at 0 the website shows it
                  as sold out.
                </Text>
              </div>

              <div className="flex flex-col gap-2">
                <Label size="small" weight="plus">
                  Where it shows
                </Label>
                <CategoryPicker
                  categories={categories}
                  value={draft.categoryIds}
                  onChange={(ids) => set("categoryIds", ids)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label size="small" weight="plus" htmlFor="new-desc">
                  Description{" "}
                  <span className="text-ui-fg-muted font-normal">
                    (optional)
                  </span>
                </Label>
                <Textarea
                  id="new-desc"
                  rows={3}
                  value={draft.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="What is in it, and who it suits."
                />
              </div>

              <div className="flex items-start justify-between gap-4 rounded-lg border border-ui-border-base p-4">
                <div>
                  <Text size="small" leading="compact" weight="plus">
                    Show on the shop straight away
                  </Text>
                  <Text size="xsmall" className="text-ui-fg-muted">
                    Turn off to save it hidden and check it first.
                  </Text>
                </div>
                <Switch
                  checked={draft.publish}
                  onCheckedChange={(v) => set("publish", v)}
                />
              </div>

              {missing.length > 0 && (
                <Text size="small" className="text-ui-fg-subtle">
                  Still needs {missing.join(", ")}.
                </Text>
              )}
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </>
  )
}

/* ----------------------------------------------------------------- Edit */

function EditFlower({
  product,
  categories,
  shopPrices,
  open,
  onOpenChange,
}: {
  product: ShopProduct
  categories: ShopCategory[]
  shopPrices?: ShopPrices
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const variants = product.variants ?? []
  // Discounts are off while no sale list is active; the Was column goes with them.
  const salesOn = !!shopPrices?.sale_price_list_id

  const [title, setTitle] = useState(product.title)
  const [description, setDescription] = useState(product.description ?? "")
  const [image, setImage] = useState<string | null>(product.thumbnail)
  const [categoryIds, setCategoryIds] = useState(
    (product.categories ?? []).map((c) => c.id)
  )
  const [visible, setVisible] = useState(product.status === "published")
  // What customers pay, and the struck-through figure — not the variant's own
  // price, which on a flower on sale *is* the struck-through figure.
  const [prices, setPrices] = useState<Record<string, string>>(
    Object.fromEntries(
      variants.map((v) => [
        v.id,
        String(sellingOf(shopPrices?.prices[v.id]).now || priceOf(v)),
      ])
    )
  )
  const [wasPrices, setWasPrices] = useState<Record<string, string>>(
    Object.fromEntries(
      variants.map((v) => [
        v.id,
        String(sellingOf(shopPrices?.prices[v.id]).was ?? ""),
      ])
    )
  )
  const [stocks, setStocks] = useState<Record<string, string>>(
    Object.fromEntries(variants.map((v) => [v.id, String(stockOf(v).stocked)]))
  )
  const [uploading, setUploading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY })

  const save = useMutation({
    mutationFn: async () => {
      await sdk.admin.product.update(product.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        status: visible ? "published" : "draft",
        categories: categoryIds.map((id) => ({ id })),
        ...(image !== product.thumbnail && image
          ? { thumbnail: image, images: [{ url: image }] }
          : {}),
      })

      // Only the sizes whose price or was price actually changed.
      for (const v of variants) {
        const now = Number(prices[v.id])
        const wasRaw = (wasPrices[v.id] ?? "").trim()
        const was = wasRaw ? Number(wasRaw) : null
        const current = shopPrices?.prices[v.id]
        const before = sellingOf(current)
        if (!(now > 0)) continue
        if (now === before.now && was === before.was) continue
        await applyPrice({
          productId: product.id,
          variantId: v.id,
          basePriceId: v.prices?.find((x) => x.currency_code === "qar")?.id,
          current,
          saleListId: shopPrices?.sale_price_list_id ?? null,
          now,
          was,
        })
      }

      // Stock is the shelf count at the shop's one warehouse. Orders not yet
      // sent are held against it separately, so this is never "available".
      for (const v of variants) {
        const s = stockOf(v)
        const next = Number(stocks[v.id])
        if (!s.tracked || !s.itemId || !s.locationId) continue
        if (!Number.isInteger(next) || next < 0 || next === s.stocked) continue
        await sdk.admin.inventoryItem.updateLevel(s.itemId, s.locationId, {
          stocked_quantity: next,
        })
      }
    },
    onSuccess: () => {
      toast.success(
        "Saved. Stock updates on the website straight away; other changes can take up to 30 minutes."
      )
      refresh()
      queryClient.invalidateQueries({ queryKey: SHOP_PRICES_KEY })
      onOpenChange(false)
    },
    onError: (e) => toast.error(errorText(e, "Could not save that.")),
  })

  const remove = useMutation({
    mutationFn: () => sdk.admin.product.delete(product.id),
    onSuccess: () => {
      toast.success(`"${product.title}" is deleted.`)
      refresh()
      onOpenChange(false)
    },
    onError: (e) => {
      const msg = errorText(e, "")
      // Medusa refuses while an unfinished order still holds one. Say what
      // to do instead rather than showing an inventory-item id.
      toast.error(
        /reservation/i.test(msg)
          ? "It is on an order that is not finished yet, so it cannot be deleted. Hide it instead — it disappears from the shop straight away."
          : msg || "Could not delete that."
      )
    },
  })

  const pricesValid = variants.every((v) => {
    const now = Number(prices[v.id])
    const wasRaw = (wasPrices[v.id] ?? "").trim()
    return now > 0 && (wasRaw === "" || Number(wasRaw) > now)
  })
  const stocksValid = variants.every((v) => {
    const n = Number(stocks[v.id])
    return !stockOf(v).tracked || (Number.isInteger(n) && n >= 0)
  })
  const ready =
    title.trim().length > 1 && pricesValid && stocksValid && !uploading

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>Edit {product.title}</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-6 overflow-y-auto p-4">
          <div className="flex items-start justify-between gap-4 rounded-lg border border-ui-border-base p-4">
            <div>
              <Text size="small" leading="compact" weight="plus">
                Show on the shop
              </Text>
              <Text size="xsmall" className="text-ui-fg-muted">
                Off hides it from customers. Nothing is lost.
              </Text>
            </div>
            <Switch checked={visible} onCheckedChange={setVisible} />
          </div>

          <div className="flex flex-col gap-2">
            <Label size="small" weight="plus">
              Photo
            </Label>
            <PhotoPicker
              value={image}
              onChange={setImage}
              onBusyChange={setUploading}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label size="small" weight="plus" htmlFor="edit-title">
              Name
            </Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            {/* One row per size: what customers pay, the optional struck-through
                "was" price (only while a sale list is active), and how many are
                in stock. */}
            <div className="flex items-center gap-3">
              {variants.length > 1 && <span className="w-24 flex-none" />}
              <Label size="small" weight="plus" className="flex-1">
                Price (QAR)
              </Label>
              {salesOn && (
                <Label size="small" weight="plus" className="flex-1">
                  Was
                </Label>
              )}
              <Label size="small" weight="plus" className="flex-1">
                In stock
              </Label>
            </div>
            {variants.map((v) => {
              const s = stockOf(v)
              return (
                <div key={v.id} className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    {variants.length > 1 && (
                      <Text
                        size="small"
                        className="w-24 flex-none text-ui-fg-subtle"
                      >
                        {v.title}
                      </Text>
                    )}
                    {/* Wrapped, because Input puts className on the inner <input>,
                        not its wrapper: flex-1 there never stretched the box, so
                        the boxes and their column labels did not line up. */}
                    <div className="min-w-0 flex-1">
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={1}
                        value={prices[v.id] ?? ""}
                        onChange={(e) =>
                          setPrices((p) => ({ ...p, [v.id]: e.target.value }))
                        }
                        aria-label={
                          variants.length > 1 ? `Price for ${v.title}` : "Price"
                        }
                      />
                    </div>
                    {salesOn && (
                      <div className="min-w-0 flex-1">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={1}
                          placeholder="—"
                          value={wasPrices[v.id] ?? ""}
                          onChange={(e) =>
                            setWasPrices((p) => ({
                              ...p,
                              [v.id]: e.target.value,
                            }))
                          }
                          aria-label={
                            variants.length > 1
                              ? `Was price for ${v.title}`
                              : "Was price"
                          }
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={1}
                        disabled={!s.tracked}
                        value={s.tracked ? (stocks[v.id] ?? "") : ""}
                        placeholder={s.tracked ? "" : "not counted"}
                        onChange={(e) =>
                          setStocks((p) => ({ ...p, [v.id]: e.target.value }))
                        }
                        aria-label={
                          variants.length > 1 ? `Stock for ${v.title}` : "Stock"
                        }
                      />
                    </div>
                  </div>
                  {/* Without this, a florist who counts 10 on the shelf and sees
                      "8 left" in the list would assume two went missing. */}
                  {s.held > 0 && (
                    <Text size="xsmall" className="text-ui-fg-muted">
                      {s.held} held by orders not sent yet, so customers can buy{" "}
                      {Math.max(0, Number(stocks[v.id]) - s.held)}.
                    </Text>
                  )}
                </div>
              )
            })}
            {salesOn && (
              <Text size="xsmall" className="text-ui-fg-muted">
                Was is optional. Fill it in and the website shows the price on
                sale, with the was price struck through; clear it to end the
                sale. It must be higher than the price.
              </Text>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label size="small" weight="plus">
              Where it shows
            </Label>
            <CategoryPicker
              categories={categories}
              value={categoryIds}
              onChange={setCategoryIds}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label size="small" weight="plus" htmlFor="edit-desc">
              Description
            </Label>
            <Textarea
              id="edit-desc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Deliberately quiet and at the bottom. Hiding is almost always
              what is wanted; deleting is for a mistake. */}
          <div className="flex flex-col gap-2 border-t border-ui-border-base pt-4">
            <Text size="xsmall" className="text-ui-fg-muted">
              Not selling it any more? Turn off “Show on the shop” above instead
              — you can bring it back any time. Delete is permanent.
            </Text>
            <div>
              <Button
                size="small"
                variant="transparent"
                className="text-ui-fg-error"
                onClick={() => setConfirmDelete(true)}
                disabled={remove.isPending}
              >
                <Trash />
                Delete permanently
              </Button>
            </div>
          </div>
        </Drawer.Body>
        <Drawer.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <Drawer.Close asChild>
              <Button size="small" variant="secondary">
                Cancel
              </Button>
            </Drawer.Close>
            <Button
              size="small"
              onClick={() => save.mutate()}
              disabled={!ready || save.isPending}
              isLoading={save.isPending}
            >
              Save
            </Button>
          </div>
        </Drawer.Footer>
      </Drawer.Content>

      <Prompt open={confirmDelete} onOpenChange={setConfirmDelete}>
        <Prompt.Content>
          <Prompt.Header>
            <Prompt.Title>Delete “{product.title}”?</Prompt.Title>
            <Prompt.Description>
              This cannot be undone. To stop selling it for now, hide it
              instead.
            </Prompt.Description>
          </Prompt.Header>
          <Prompt.Footer>
            <Prompt.Cancel>Keep it</Prompt.Cancel>
            <Prompt.Action onClick={() => remove.mutate()}>
              Delete
            </Prompt.Action>
          </Prompt.Footer>
        </Prompt.Content>
      </Prompt>
    </Drawer>
  )
}

/* ---------------------------------------------------------------- Panel */

/**
 * A product photo that degrades to a plain tile.
 *
 * A photo can go missing from under a product — the four placeholders left
 * after the 9 Oct import still point at the bucket in the Cloudflare account
 * the shop moved away from — and the browser's broken-image icon in a list
 * the florist reads every day looks like the screen itself is broken.
 */
function Thumb({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false)
  return src && !failed ? (
    <img
      src={src}
      alt=""
      onError={() => setFailed(true)}
      className="size-12 flex-none rounded-md object-cover"
    />
  ) : (
    <div className="bg-ui-bg-component size-12 flex-none rounded-md" />
  )
}

export default function FlowersPanel() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<ShopProduct | null>(null)

  const { data: productData, isLoading } = useQuery({
    queryKey: PRODUCTS_KEY,
    queryFn: () =>
      sdk.client.fetch<{ products: ShopProduct[] }>(
        `/admin/products?limit=200&order=title&fields=id,title,handle,description,thumbnail,status,categories.id,variants.id,variants.title,*variants.prices,${STOCK_FIELDS}`
      ),
  })

  // Selling and was prices. The product list above only carries each size's
  // own price, which for a flower on sale is the struck-through figure.
  const { data: shopPrices } = useQuery({
    queryKey: SHOP_PRICES_KEY,
    queryFn: fetchShopPrices,
  })

  const { data: categoryData } = useQuery({
    queryKey: CATEGORIES_KEY,
    queryFn: () =>
      sdk.client.fetch<{ product_categories: ShopCategory[] }>(
        "/admin/product-categories?limit=100&fields=id,name,handle"
      ),
  })

  // What is on sale first, alphabetically; hidden flowers after. Sorted by
  // title alone, the hidden leftovers led the list above everything for sale.
  const products = [...(productData?.products ?? [])].sort(
    (a, b) =>
      Number(a.status !== "published") - Number(b.status !== "published") ||
      a.title.localeCompare(b.title)
  )
  const categories = categoryData?.product_categories ?? []
  const shown = products.filter((p) => p.status === "published").length

  const toggle = useMutation({
    mutationFn: (p: ShopProduct) =>
      sdk.admin.product.update(p.id, {
        status: p.status === "published" ? "draft" : "published",
      }),
    onSuccess: (_d, p) => {
      toast.success(
        p.status === "published"
          ? `"${p.title}" is hidden. It can take up to 30 minutes to leave the website.`
          : `"${p.title}" is back on the shop. It can take up to 30 minutes to reappear.`
      )
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY })
    },
    onError: (e) => toast.error(errorText(e, "Could not change that.")),
  })

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div>
          <Heading level="h2">Your flowers</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {shown} on the shop
            {products.length > shown
              ? ` · ${products.length - shown} hidden`
              : ""}
          </Text>
        </div>
        <AddFlower
          categories={categories}
          salesOn={!!shopPrices?.sale_price_list_id}
        />
      </div>

      {isLoading ? (
        <div className="px-6 py-8">
          <Text size="small" className="text-ui-fg-subtle">
            Loading your flowers…
          </Text>
        </div>
      ) : products.length === 0 ? (
        <div className="px-6 py-8">
          <Text size="small" className="text-ui-fg-subtle">
            Nothing on the shop yet. Add your first flower.
          </Text>
        </div>
      ) : (
        <div className="flex flex-col divide-y">
          {products.map((p) => {
            const hidden = p.status !== "published"
            const variants = p.variants ?? []
            // The cheapest size, as a customer sees it: its selling price and,
            // when it is on sale, the struck-through was price.
            const selling = variants
              .map((v) => {
                const sp = sellingOf(shopPrices?.prices[v.id])
                return { now: sp.now || priceOf(v), was: sp.was }
              })
              .filter((x) => x.now > 0)
              .sort((a, b) => a.now - b.now)
            const lowest = selling[0]?.now ?? Infinity
            const lowestWas = selling[0]?.was ?? null
            const tracked = variants.filter((v) => stockOf(v).tracked)
            const left = tracked.reduce((n, v) => n + stockOf(v).available, 0)
            return (
              <div
                key={p.id}
                className={
                  "flex flex-wrap items-center justify-between gap-3 px-6 py-3" +
                  (hidden ? " opacity-60" : "")
                }
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Thumb src={p.thumbnail} />
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <Text
                      size="small"
                      leading="compact"
                      weight="plus"
                      className="truncate"
                    >
                      {p.title}
                    </Text>
                    <div className="flex items-center gap-2">
                      <Text
                        size="small"
                        leading="compact"
                        className="text-ui-fg-subtle"
                      >
                        {Number.isFinite(lowest)
                          ? `${variants.length > 1 ? "from " : ""}${money(lowest)}`
                          : "no price"}
                      </Text>
                      {lowestWas != null && (
                        <Text
                          size="small"
                          leading="compact"
                          className="text-ui-fg-muted line-through"
                        >
                          {money(lowestWas)}
                        </Text>
                      )}
                      {/* What a customer can still buy — the storefront's number. */}
                      {tracked.length > 0 && (
                        <Badge size="2xsmall" color={left > 0 ? "grey" : "red"}>
                          {left > 0 ? `${left} left` : "sold out"}
                        </Badge>
                      )}
                      {hidden && (
                        <Badge size="2xsmall" color="orange">
                          hidden
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-none items-center gap-2">
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => toggle.mutate(p)}
                    disabled={toggle.isPending}
                  >
                    {hidden ? <Eye /> : <EyeSlash />}
                    {hidden ? "Show" : "Hide"}
                  </Button>
                  {/* Waits for the prices: Edit opens with them filled in, and
                      opening it first would start the form from nothing. */}
                  <Button
                    size="small"
                    variant="secondary"
                    disabled={!shopPrices}
                    onClick={() => setEditing(p)}
                  >
                    <PencilSquare />
                    Edit
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Keyed by product so the form starts from that product's values
          every time, not from whatever was last edited. */}
      {editing && (
        <EditFlower
          key={editing.id}
          product={editing}
          categories={categories}
          shopPrices={shopPrices}
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
    </Container>
  )
}
