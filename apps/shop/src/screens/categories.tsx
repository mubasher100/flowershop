/**
 * Categories: add, rename (in English and Arabic), describe, hide, reorder
 * and delete — what the full admin's Categories page did, at phone size.
 *
 * What the website shows follows from here directly: since 13 Nov 2026 the
 * storefront lists every visible top-level category in the order set here
 * (metadata.position), with the Arabic typed here (metadata.name_ar). Before
 * that a new category existed only in Medusa and never reached the menu.
 */
import { useEffect, useMemo, useState, type FormEvent } from "react"

import { SubPage } from "../components/page"
import { PhotoField } from "../components/photo"
import { Button, Field, Sheet, Toggle, cx, inputClass, toast } from "../components/ui"
import { messageOf } from "../lib/bulk"
import { freeHandle, isProtected, kindOf, moved, websiteOrder, type Kind } from "../lib/categories"
import { useAfterSave, useCatalogue } from "../lib/data"
import { STOREFRONT, sdk } from "../lib/sdk"
import type { ShopCategory } from "../lib/shop"

const str = (v: unknown) => (typeof v === "string" ? v : "")

export default function Categories() {
  const { categories, products, isPending, error } = useCatalogue()
  const afterSave = useAfterSave()
  const [editing, setEditing] = useState<ShopCategory | null>(null)
  const [adding, setAdding] = useState<Kind | null>(null)
  const [moving, setMoving] = useState<string | null>(null)

  const counts = useMemo(() => {
    const n = new Map<string, number>()
    for (const p of products) for (const c of p.categories ?? []) n.set(c.id, (n.get(c.id) ?? 0) + 1)
    return n
  }, [products])

  async function move(list: ShopCategory[], index: number, by: -1 | 1) {
    const next = moved(list, index, by)
    if (next === list) return
    setMoving(list[index].id)
    try {
      // Every category in the group gets its place, so the order is complete
      // and the website never has to guess between old and new positions.
      for (const [i, c] of next.entries()) {
        if (c.metadata?.position === i) continue
        await sdk.admin.productCategory.update(c.id, { metadata: { ...(c.metadata ?? {}), position: i } })
      }
      await afterSave(`Moved ${list[index].name}`, `${list[index].name} moved.`)
    } catch (err) {
      toast(messageOf(err), "error")
    } finally {
      setMoving(null)
    }
  }

  const group = (kind: Kind, title: string, hint: string) => {
    const list = websiteOrder(categories, kind)
    return (
      <section className="flex flex-col gap-2" aria-labelledby={`cat-${kind}`}>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 id={`cat-${kind}`} className="font-semibold">{title}</h2>
            <p className="text-sm text-ink-600">{hint}</p>
          </div>
          <Button variant="secondary" className="flex-none" onClick={() => setAdding(kind)}>
            + Add
          </Button>
        </div>
        <ul className="flex flex-col divide-y divide-ink-100 rounded-2xl border border-ink-200 bg-white">
          {list.map((c, i) => (
            <li key={c.id} className="flex items-center gap-1 ps-3">
              <button type="button" onClick={() => setEditing(c)} className="flex min-h-[56px] min-w-0 flex-1 flex-col items-start justify-center text-start">
                <span className="w-full truncate font-medium">{c.name}</span>
                <span className="text-sm text-ink-600">
                  {counts.get(c.id) ?? 0} flowers
                  {c.is_active === false && <b className="ms-2 rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-700">Hidden</b>}
                </span>
              </button>
              <Button variant="ghost" className="px-3" aria-label={`Move ${c.name} up`} disabled={i === 0 || !!moving} busy={moving === c.id} onClick={() => move(list, i, -1)}>
                ↑
              </Button>
              <Button variant="ghost" className="px-3" aria-label={`Move ${c.name} down`} disabled={i === list.length - 1 || !!moving} onClick={() => move(list, i, 1)}>
                ↓
              </Button>
            </li>
          ))}
        </ul>
      </section>
    )
  }

  return (
    <SubPage title="Categories">
      {isPending ? (
        <p className="text-ink-600">Loading…</p>
      ) : error ? (
        <p role="alert" className="text-blush-700">{messageOf(error)}</p>
      ) : (
        <>
          <p className="text-[15px] text-ink-600">
            The order here is the order on the website's menu. Tap a category to rename or hide it.
          </p>
          {group("type", "Types of flower", "The menu across the top of the website.")}
          {group("occasion", "Occasions", "The round tiles on the homepage.")}
        </>
      )}
      <CategorySheet
        open={!!editing || !!adding}
        category={editing}
        kind={editing ? kindOf(editing) : adding ?? "type"}
        all={categories}
        flowers={editing ? counts.get(editing.id) ?? 0 : 0}
        onClose={() => {
          setEditing(null)
          setAdding(null)
        }}
      />
    </SubPage>
  )
}

function CategorySheet({
  open,
  category,
  kind: startKind,
  all,
  flowers,
  onClose,
}: {
  open: boolean
  category: ShopCategory | null
  kind: Kind
  all: ShopCategory[]
  flowers: number
  onClose: () => void
}) {
  const afterSave = useAfterSave()
  const [name, setName] = useState("")
  const [nameAr, setNameAr] = useState("")
  const [description, setDescription] = useState("")
  const [descriptionAr, setDescriptionAr] = useState("")
  const [kind, setKind] = useState<Kind>("type")
  const [visible, setVisible] = useState(true)
  const [photo, setPhoto] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) return
    setName(category?.name ?? "")
    setNameAr(str(category?.metadata?.name_ar))
    setDescription(category?.description ?? "")
    setDescriptionAr(str(category?.metadata?.description_ar))
    setKind(startKind)
    setVisible(category ? category.is_active !== false : true)
    setPhoto(str(category?.metadata?.image_url) || null)
    setConfirmDelete(false)
    setError("")
    // Filled once per opening (see flower-sheet.tsx for why not on the object).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category?.id])

  async function save(e: FormEvent) {
    e.preventDefault()
    if (name.trim().length < 2) return setError("Give the category a name.")
    setBusy(true)
    setError("")
    const metadata: Record<string, unknown> = {
      ...(category?.metadata ?? {}),
      name_ar: nameAr.trim() || null,
      description_ar: descriptionAr.trim() || null,
      kind,
      image_url: kind === "occasion" ? photo : null,
    }
    try {
      if (category) {
        await sdk.admin.productCategory.update(category.id, {
          name: name.trim(),
          description: description.trim(),
          is_active: visible,
          metadata,
        })
        await afterSave(`Changed category ${name.trim()}`)
      } else {
        await sdk.admin.productCategory.create({
          name: name.trim(),
          handle: freeHandle(name, all.map((c) => c.handle)),
          description: description.trim(),
          is_active: visible,
          is_internal: false,
          metadata,
        })
        await afterSave(`Added category ${name.trim()}`, `${name.trim()} added. Tick it on a flower to fill it.`)
      }
      onClose()
    } catch (err) {
      setError(messageOf(err))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!category) return
    setBusy(true)
    try {
      await sdk.admin.productCategory.delete(category.id)
      await afterSave(`Deleted category ${category.name}`, `${category.name} deleted. Its flowers are still on sale.`)
      onClose()
    } catch (err) {
      setError(messageOf(err))
      setConfirmDelete(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={category ? "Edit category" : "Add a category"}
      footer={
        <div className="flex flex-col gap-2">
          {error && <p role="alert" className="rounded-xl bg-blush-100 px-3 py-2 text-[15px] text-blush-700">{error}</p>}
          <Button type="submit" form="category-form" busy={busy} disabled={uploading} className="w-full">
            Save
          </Button>
        </div>
      }
    >
      <form id="category-form" onSubmit={save} noValidate className="flex flex-col gap-5">
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Eid Flowers" />
        </Field>
        <Field label="Name in Arabic" hint="Shown on the Arabic website. Leave empty to show the English.">
          <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} dir="rtl" lang="ar" className={inputClass} placeholder="ورود العيد" />
        </Field>
        <Field label="One-line description" hint="Under the heading on the category's page.">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={cx(inputClass, "py-2")} />
        </Field>
        <Field label="Description in Arabic">
          <textarea value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} rows={2} dir="rtl" lang="ar" className={cx(inputClass, "py-2")} />
        </Field>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-medium text-ink-700">Where it shows</legend>
          {(
            [
              ["type", "Type of flower", "In the menu and the catalogue filter."],
              ["occasion", "Occasion", "A round tile under Shop by occasion."],
            ] as const
          ).map(([value, label, hint]) => (
            <label key={value} className={cx("flex min-h-[52px] items-center gap-3 rounded-xl border px-3", kind === value ? "border-blush-600 bg-blush-50" : "border-ink-200")}>
              <input type="radio" name="kind" value={value} checked={kind === value} onChange={() => setKind(value)} className="h-5 w-5 accent-blush-600" />
              <span>
                <span className="font-medium">{label}</span>
                <span className="block text-sm text-ink-600">{hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {kind === "occasion" && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-700">Tile photo</span>
            <PhotoField value={photo} onChange={setPhoto} onBusy={setUploading} />
          </div>
        )}

        <div className="flex items-center justify-between gap-3 rounded-2xl bg-ink-50 px-3 py-1">
          <span>
            <span className="font-medium">Show on the website</span>
            <span className="block text-sm text-ink-600">{visible ? "In the menu." : "Hidden from customers."}</span>
          </span>
          <Toggle checked={visible} onChange={setVisible} label="Show on the website" />
        </div>

        {category && (
          <div className="flex flex-col gap-3 border-t border-ink-100 pt-4">
            <a href={`${STOREFRONT}/en-qa/categories/${category.handle}`} target="_blank" rel="noreferrer" className="flex min-h-[44px] items-center text-blush-700 underline">
              See it on the website
            </a>
            {isProtected(category) ? (
              <p className="text-sm text-ink-600">This is the offers category. Flowers join it when they go on offer, so it can't be deleted.</p>
            ) : confirmDelete ? (
              <div className="flex flex-col gap-2 rounded-2xl border border-blush-600 p-3">
                <p>
                  Delete {category.name}? {flowers ? `Its ${flowers} flowers stay on sale, just not in this category.` : ""} Hiding it keeps it for later.
                </p>
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
                Delete this category
              </Button>
            )}
          </div>
        )}
      </form>
    </Sheet>
  )
}
