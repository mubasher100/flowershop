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
  CATEGORIES_KEY,
  money,
  priceOf,
  PRODUCTS_KEY,
  type ShopCategory,
  type ShopProduct,
} from "./shared"

const errorText = (e: unknown, fallback: string) =>
  e instanceof Error && e.message ? e.message : fallback

/* ------------------------------------------------------------------ Add */

type NewFlower = {
  title: string
  price: string
  image: string | null
  description: string
  categoryIds: string[]
  publish: boolean
}

const blank: NewFlower = {
  title: "",
  price: "",
  image: null,
  description: "",
  categoryIds: [],
  publish: true,
}

function AddFlower({ categories }: { categories: ShopCategory[] }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<NewFlower>(blank)
  const [uploading, setUploading] = useState(false)
  const set = <K extends keyof NewFlower>(k: K, v: NewFlower[K]) =>
    setDraft((d) => ({ ...d, [k]: v }))

  const create = useMutation({
    mutationFn: () =>
      sdk.client.fetch("/admin/quick-products", {
        method: "POST",
        body: {
          title: draft.title.trim(),
          price: Number(draft.price),
          image: draft.image,
          description: draft.description.trim() || null,
          categoryIds: draft.categoryIds,
          publish: draft.publish,
        },
      }),
    onSuccess: () => {
      toast.success(
        draft.publish
          ? `"${draft.title.trim()}" is on the shop. Customers see it within a minute.`
          : `"${draft.title.trim()}" is saved, hidden. Show it when you are ready.`
      )
      setDraft(blank)
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY })
    },
    onError: (e) => toast.error(errorText(e, "Could not add that flower.")),
  })

  // What is missing, in words — a disabled button with no reason is the
  // single most confusing thing on a form.
  const missing = [
    draft.title.trim().length < 2 && "a name",
    !(Number(draft.price) > 0) && "a price",
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
                  A photo, a name, a price and where it belongs. Everything
                  else is filled in for you.
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
                <Text size="xsmall" className="text-ui-fg-muted">
                  Just the number — 350 means QAR 350.
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
                  <span className="text-ui-fg-muted font-normal">(optional)</span>
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
  open,
  onOpenChange,
}: {
  product: ShopProduct
  categories: ShopCategory[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const variants = product.variants ?? []

  const [title, setTitle] = useState(product.title)
  const [description, setDescription] = useState(product.description ?? "")
  const [image, setImage] = useState<string | null>(product.thumbnail)
  const [categoryIds, setCategoryIds] = useState(
    (product.categories ?? []).map((c) => c.id)
  )
  const [visible, setVisible] = useState(product.status === "published")
  const [prices, setPrices] = useState<Record<string, string>>(
    Object.fromEntries(variants.map((v) => [v.id, String(priceOf(v))]))
  )
  const [uploading, setUploading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const refresh = () => queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY })

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

      // Only the sizes whose price actually changed. The existing price's id
      // is passed so it is updated in place — without it Medusa treats the
      // list as a replacement set.
      for (const v of variants) {
        const next = Number(prices[v.id])
        if (!(next > 0) || next === priceOf(v)) continue
        const current = v.prices?.find((p) => p.currency_code === "qar")
        await sdk.admin.product.updateVariant(product.id, v.id, {
          prices: [
            { ...(current?.id ? { id: current.id } : {}), amount: next, currency_code: "qar" },
          ],
        })
      }
    },
    onSuccess: () => {
      toast.success("Saved. Customers see the change within a minute.")
      refresh()
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

  const pricesValid = variants.every((v) => Number(prices[v.id]) > 0)
  const ready = title.trim().length > 1 && pricesValid && !uploading

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
            <PhotoPicker value={image} onChange={setImage} onBusyChange={setUploading} />
          </div>

          <div className="flex flex-col gap-2">
            <Label size="small" weight="plus" htmlFor="edit-title">
              Name
            </Label>
            <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="flex flex-col gap-2">
            <Label size="small" weight="plus">
              {variants.length > 1 ? "Prices (QAR)" : "Price (QAR)"}
            </Label>
            {variants.map((v) => (
              <div key={v.id} className="flex items-center gap-3">
                {variants.length > 1 && (
                  <Text size="small" className="w-28 flex-none text-ui-fg-subtle">
                    {v.title}
                  </Text>
                )}
                <Input
                  type="number"
                  inputMode="decimal"
                  min={1}
                  value={prices[v.id] ?? ""}
                  onChange={(e) => setPrices((p) => ({ ...p, [v.id]: e.target.value }))}
                  aria-label={variants.length > 1 ? `Price for ${v.title}` : "Price"}
                />
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <Label size="small" weight="plus">
              Where it shows
            </Label>
            <CategoryPicker categories={categories} value={categoryIds} onChange={setCategoryIds} />
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
              Not selling it any more? Turn off “Show on the shop” above
              instead — you can bring it back any time. Delete is permanent.
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
            <Prompt.Action onClick={() => remove.mutate()}>Delete</Prompt.Action>
          </Prompt.Footer>
        </Prompt.Content>
      </Prompt>
    </Drawer>
  )
}

/* ---------------------------------------------------------------- Panel */

export default function FlowersPanel() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<ShopProduct | null>(null)

  const { data: productData, isLoading } = useQuery({
    queryKey: PRODUCTS_KEY,
    queryFn: () =>
      sdk.client.fetch<{ products: ShopProduct[] }>(
        "/admin/products?limit=200&order=title&fields=id,title,handle,description,thumbnail,status,categories.id,variants.id,variants.title,*variants.prices"
      ),
  })

  const { data: categoryData } = useQuery({
    queryKey: CATEGORIES_KEY,
    queryFn: () =>
      sdk.client.fetch<{ product_categories: ShopCategory[] }>(
        "/admin/product-categories?limit=100&fields=id,name,handle"
      ),
  })

  const products = productData?.products ?? []
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
          ? `"${p.title}" is hidden from customers.`
          : `"${p.title}" is back on the shop.`
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
            {products.length > shown ? ` · ${products.length - shown} hidden` : ""}
          </Text>
        </div>
        <AddFlower categories={categories} />
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
            const lowest = Math.min(...variants.map(priceOf).filter((n) => n > 0))
            return (
              <div
                key={p.id}
                className={
                  "flex flex-wrap items-center justify-between gap-3 px-6 py-3" +
                  (hidden ? " opacity-60" : "")
                }
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {p.thumbnail ? (
                    <img src={p.thumbnail} alt="" className="size-12 flex-none rounded-md object-cover" />
                  ) : (
                    <div className="bg-ui-bg-component size-12 flex-none rounded-md" />
                  )}
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <Text size="small" leading="compact" weight="plus" className="truncate">
                      {p.title}
                    </Text>
                    <div className="flex items-center gap-2">
                      <Text size="small" leading="compact" className="text-ui-fg-subtle">
                        {Number.isFinite(lowest)
                          ? `${variants.length > 1 ? "from " : ""}${money(lowest)}`
                          : "no price"}
                      </Text>
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
                  <Button size="small" variant="secondary" onClick={() => setEditing(p)}>
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
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
    </Container>
  )
}
