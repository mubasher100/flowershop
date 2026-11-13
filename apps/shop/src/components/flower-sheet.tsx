/**
 * Add a flower, or change one: photo, name, price and offer, how many can be
 * sold, categories, and whether it shows on the website. One screen instead
 * of the full admin's six.
 */
import { useEffect, useState, type FormEvent } from "react"

import { messageOf } from "../lib/bulk"
import { useAfterSave } from "../lib/data"
import { STOREFRONT, sdk } from "../lib/sdk"
import {
  applyPrice,
  pickableCategories,
  sellingOf,
  setStock,
  stockOf,
  withOfferCategory,
  type ShopCategory,
  type ShopPrices,
  type ShopProduct,
} from "../lib/shop"
import { PhotoField } from "./photo"
import { Button, Field, Sheet, Toggle, cx, inputClass } from "./ui"

type SizeDraft = {
  id: string | null
  title: string
  price: string
  onOffer: boolean
  offer: string
  canSell: string
  held: number
}

const num = (s: string) => (s.trim() === "" ? NaN : Number(s))

/** Soft rule from the shop (2 Nov 2026): prices end in 9. */
export const priceHint = (s: string) => {
  const n = num(s)
  return Number.isFinite(n) && n > 0 && Math.round(n) % 10 !== 9
    ? `Shop prices end in 9, like ${Math.max(9, Math.floor(n / 10) * 10 - 1)}.`
    : null
}

export function sizeProblem(s: SizeDraft): string | null {
  const price = num(s.price)
  if (!Number.isFinite(price) || price <= 0) return `Set a price${s.title === "One size" ? "" : ` for ${s.title}`}.`
  if (s.onOffer) {
    const offer = num(s.offer)
    if (!Number.isFinite(offer) || offer <= 0) return "Set the offer price."
    if (offer >= price) return "The offer price must be below the normal price."
  }
  const can = num(s.canSell)
  if (!Number.isFinite(can) || can < 0) return "Set how many can be sold (0 or more)."
  return null
}

export default function FlowerSheet({
  open,
  onClose,
  product,
  categories,
  prices,
}: {
  open: boolean
  onClose: () => void
  /** Absent: adding a new flower. */
  product?: ShopProduct
  categories: ShopCategory[]
  prices: ShopPrices
}) {
  const afterSave = useAfterSave()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [photo, setPhoto] = useState<string | null>(null)
  const [cats, setCats] = useState<Set<string>>(new Set())
  const [visible, setVisible] = useState(true)
  const [sizes, setSizes] = useState<SizeDraft[]>([])
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) return
    setError("")
    setConfirmDelete(false)
    setTitle(product?.title ?? "")
    setDescription(product?.description ?? "")
    setPhoto(product?.thumbnail ?? null)
    setCats(new Set(product?.categories?.map((c) => c.id) ?? []))
    setVisible(product ? product.status === "published" : true)
    setSizes(
      product?.variants?.length
        ? product.variants.map((v) => {
            const { now, was } = sellingOf(prices.prices[v.id])
            const s = stockOf(v)
            return {
              id: v.id,
              title: v.title,
              price: String(was ?? now ?? ""),
              onOffer: was != null,
              offer: was != null ? String(now) : "",
              canSell: String(s.available),
              held: s.held,
            }
          })
        : [{ id: null, title: "One size", price: "", onOffer: false, offer: "", canSell: "10", held: 0 }]
    )
    // Filled once per opening, keyed on which flower — not on the product or
    // price objects themselves. Those are refetched in the background (after
    // any save, on refocus), and each refetch is a new object, which reset
    // the form under the florist's fingers and wiped what they had typed.
    // Found on staging, where the refetch lands while the sheet is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id])

  const patchSize = (i: number, patch: Partial<SizeDraft>) =>
    setSizes((all) => all.map((s, j) => (j === i ? { ...s, ...patch } : s)))

  async function save(e: FormEvent) {
    e.preventDefault()
    const problem = title.trim().length < 2 ? "Give the flower a name." : sizes.map(sizeProblem).find(Boolean)
    if (problem) {
      setError(problem)
      return
    }
    if (sizes.some((s) => s.onOffer) && !prices.sale_price_list_id) {
      setError("Offers are switched off in the shop right now, so this can't go on offer.")
      return
    }
    setBusy(true)
    setError("")
    // On offer is the one switch: it also puts the flower in (or takes it
    // out of) the offers category, so nobody has to remember to tick it.
    const categoryIds = withOfferCategory(cats, categories, sizes.some((s) => s.onOffer))
    try {
      if (product) {
        await sdk.admin.product.update(product.id, {
          title: title.trim(),
          description: description.trim(),
          status: visible ? "published" : "draft",
          categories: categoryIds.map((id) => ({ id })),
          ...(photo !== product.thumbnail ? { thumbnail: photo, images: photo ? [{ url: photo }] : [] } : {}),
        })
        for (const s of sizes) {
          const variant = product.variants?.find((v) => v.id === s.id)
          if (!variant) continue
          await applyPrice({
            productId: product.id,
            variant,
            current: prices.prices[variant.id],
            saleListId: prices.sale_price_list_id,
            now: s.onOffer ? num(s.offer) : num(s.price),
            was: s.onOffer ? num(s.price) : null,
          })
          const stock = stockOf(variant)
          const target = num(s.canSell) + stock.held
          if (stock.tracked && target !== stock.stocked) await setStock(variant, target)
        }
        await afterSave(`Changed ${title.trim()}`)
      } else {
        const s = sizes[0]
        const { product: created } = await sdk.client.fetch<{ product: { id: string } }>("/admin/quick-products", {
          method: "POST",
          body: {
            title: title.trim(),
            price: num(s.price),
            stock: num(s.canSell),
            image: photo,
            description: description.trim() || null,
            categoryIds,
            publish: visible,
          },
        })
        if (s.onOffer && prices.sale_price_list_id) {
          const { product: full } = await sdk.admin.product.retrieve(created.id, { fields: "variants.id" })
          const variantId = full.variants?.[0]?.id
          if (variantId) {
            await sdk.admin.priceList.batchPrices(prices.sale_price_list_id, {
              create: [{ variant_id: variantId, amount: num(s.offer), currency_code: "qar" }],
            })
          }
        }
        await afterSave(`Added ${title.trim()}`, `${title.trim()} added.`)
      }
      onClose()
    } catch (err) {
      setError(messageOf(err))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!product) return
    setBusy(true)
    try {
      await sdk.admin.product.delete(product.id)
      await afterSave(`Deleted ${product.title}`, `${product.title} deleted.`)
      onClose()
    } catch (err) {
      const m = messageOf(err)
      setError(/reserv/i.test(m) ? "An order not yet sent is holding this flower, so it can't be deleted. Hide it instead." : m)
      setConfirmDelete(false)
    } finally {
      setBusy(false)
    }
  }

  const formId = "flower-form"

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={product ? "Edit flower" : "Add a flower"}
      footer={
        <div className="flex flex-col gap-2">
          {error && (
            <p role="alert" className="rounded-xl bg-blush-100 px-3 py-2 text-[15px] text-blush-700">
              {error}
            </p>
          )}
          <Button type="submit" form={formId} busy={busy} disabled={uploading} className="w-full">
            {product ? "Save" : visible ? "Save and put on sale" : "Save as hidden"}
          </Button>
        </div>
      }
    >
      <form id={formId} onSubmit={save} noValidate className="flex flex-col gap-5">
        <PhotoField value={photo} onChange={setPhoto} onBusy={setUploading} />

        <Field label="Name">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="Fifty Shimmer Roses" required />
        </Field>

        {sizes.map((s, i) => (
          <fieldset key={s.id ?? i} className="flex flex-col gap-3 rounded-2xl border border-ink-200 p-3">
            {sizes.length > 1 && <legend className="px-1 font-medium">{s.title}</legend>}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price (QAR)" hint={priceHint(s.price)}>
                <input inputMode="decimal" value={s.price} onChange={(e) => patchSize(i, { price: e.target.value })} className={inputClass} placeholder="279" />
              </Field>
              <Field label="Can sell" hint={s.held ? `${s.held} more held for orders not yet sent` : undefined}>
                <input inputMode="numeric" value={s.canSell} onChange={(e) => patchSize(i, { canSell: e.target.value })} className={inputClass} />
              </Field>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">On offer</span>
              <Toggle checked={s.onOffer} onChange={(v) => patchSize(i, { onOffer: v })} label={`On offer${sizes.length > 1 ? `, ${s.title}` : ""}`} />
            </div>
            {s.onOffer && (
              <Field label="Offer price (QAR)" hint={priceHint(s.offer) ?? "Shown with the normal price struck through."}>
                <input inputMode="decimal" value={s.offer} onChange={(e) => patchSize(i, { offer: e.target.value })} className={inputClass} placeholder="249" />
              </Field>
            )}
          </fieldset>
        ))}

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-ink-700">Categories · tap all that fit</span>
          <div className="flex flex-wrap gap-2">
            {pickableCategories(categories).map((c) => {
              const on = cats.has(c.id)
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setCats((all) => {
                      const next = new Set(all)
                      on ? next.delete(c.id) : next.add(c.id)
                      return next
                    })
                  }
                  className={cx(
                    "min-h-[44px] rounded-full border px-4 text-[15px]",
                    on ? "border-blush-600 bg-blush-100 font-medium text-blush-700" : "border-ink-200 bg-white text-ink-700"
                  )}
                >
                  {on ? "✓ " : ""}
                  {c.name}
                </button>
              )
            })}
          </div>
        </div>

        <Field label="Description">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={cx(inputClass, "py-2")} placeholder="What is in it, and who it suits." />
        </Field>

        <div className="flex items-center justify-between gap-3 rounded-2xl bg-ink-50 px-3 py-1">
          <span>
            <span className="font-medium">Show on the website</span>
            <span className="block text-sm text-ink-600">{visible ? "Customers can buy it." : "Hidden from customers."}</span>
          </span>
          <Toggle checked={visible} onChange={setVisible} label="Show on the website" />
        </div>

        {product && (
          <div className="flex flex-col gap-3 border-t border-ink-100 pt-4">
            <a href={`${STOREFRONT}/en-qa/products/${product.handle}`} target="_blank" rel="noreferrer" className="flex min-h-[44px] items-center text-blush-700 underline">
              See it on the website
            </a>
            {confirmDelete ? (
              <div className="flex flex-col gap-2 rounded-2xl border border-blush-600 p-3">
                <p>Delete {product.title} for good? Hiding it keeps it for later.</p>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => setConfirmDelete(false)}>
                    Keep it
                  </Button>
                  <Button type="button" variant="danger" className="flex-1" busy={busy} onClick={remove}>
                    Delete
                  </Button>
                </div>
              </div>
            ) : (
              <Button type="button" variant="ghost" className="self-start text-blush-700" onClick={() => setConfirmDelete(true)}>
                Delete this flower
              </Button>
            )}
          </div>
        )}
      </form>
    </Sheet>
  )
}
