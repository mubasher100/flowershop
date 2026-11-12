import { useMemo, useState } from "react"

import BulkSheet, { type BulkAction } from "../components/bulk-sheet"
import FlowerSheet from "../components/flower-sheet"
import { Button, Toggle, cx, inputClass, toast } from "../components/ui"
import { bulkVisibility } from "../lib/bulk"
import { useAfterSave, useCatalogue } from "../lib/data"
import { availableOf, money, sellingOf, stockOf, type ShopProduct } from "../lib/shop"

type Filter = "all" | "on-sale" | "hidden" | "offers" | "low" | "sold-out"

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "on-sale", label: "On sale" },
  { id: "offers", label: "Offers" },
  { id: "low", label: "Low stock" },
  { id: "sold-out", label: "Sold out" },
  { id: "hidden", label: "Hidden" },
]

/** At or under this many left, a flower shows under Low stock. */
export const LOW_STOCK = 3

export default function Flowers() {
  const { products, categories, prices, isPending, error, refetch } = useCatalogue()
  const afterSave = useAfterSave()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<ShopProduct | null>(null)
  const [adding, setAdding] = useState(false)
  const [bulk, setBulk] = useState<BulkAction | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const onOffer = (p: ShopProduct) => (p.variants ?? []).some((v) => sellingOf(prices.prices[v.id]).was != null)
  const tracked = (p: ShopProduct) => (p.variants ?? []).some((v) => stockOf(v).tracked)

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      if (q && !p.title.toLowerCase().includes(q)) return false
      const avail = availableOf(p)
      switch (filter) {
        case "on-sale":
          return p.status === "published"
        case "hidden":
          return p.status !== "published"
        case "offers":
          return onOffer(p)
        case "low":
          return tracked(p) && avail > 0 && avail <= LOW_STOCK
        case "sold-out":
          return tracked(p) && avail === 0
        default:
          return true
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, prices, query, filter])

  const onSaleCount = products.filter((p) => p.status === "published").length
  const selectedProducts = products.filter((p) => selected.has(p.id))
  const allShownSelected = shown.length > 0 && shown.every((p) => selected.has(p.id))

  const toggleOne = (id: string) =>
    setSelected((s) => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const stopSelecting = () => {
    setSelecting(false)
    setSelected(new Set())
  }

  async function setVisible(p: ShopProduct, show: boolean) {
    setToggling(p.id)
    const [r] = await bulkVisibility([p], show)
    setToggling(null)
    if (r.ok) await afterSave(`${show ? "Showed" : "Hid"} ${p.title}`, `${p.title} ${show ? "is on sale" : "is hidden"}.`)
    else toast(r.error ?? "That didn't save.", "error")
  }

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-20 flex flex-col gap-3 bg-blush-50/95 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <h1 className="font-display text-3xl font-semibold">Flowers</h1>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-sage-100 px-3 py-1 text-sm font-medium text-sage-700">{onSaleCount} on sale</span>
            <Button variant="secondary" onClick={() => (selecting ? stopSelecting() : setSelecting(true))} aria-pressed={selecting}>
              {selecting ? "Done" : "Select"}
            </Button>
          </div>
        </div>
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search flowers" aria-label="Search flowers" className={inputClass} />
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Show">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cx(
                "min-h-[40px] flex-none rounded-full border px-4 text-[15px]",
                filter === f.id ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 bg-white text-ink-700"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        {selecting && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-[15px] font-medium" aria-live="polite">
              {selected.size} selected
            </span>
            <Button
              variant="ghost"
              onClick={() =>
                setSelected((s) => {
                  const next = new Set(s)
                  shown.forEach((p) => (allShownSelected ? next.delete(p.id) : next.add(p.id)))
                  return next
                })
              }
            >
              {allShownSelected ? "Unselect these" : `Select all ${shown.length}`}
            </Button>
          </div>
        )}
      </header>

      {error ? (
        <div className="m-4 flex flex-col gap-3 rounded-2xl bg-blush-100 p-4 text-blush-700">
          <p>The flowers didn't load. Check the connection and try again.</p>
          <Button variant="secondary" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : isPending ? (
        <p className="p-6 text-center text-ink-600">Loading flowers…</p>
      ) : shown.length === 0 ? (
        <p className="p-6 text-center text-ink-600">{query ? `No flowers match "${query}".` : "Nothing here."}</p>
      ) : (
        <ul className="flex flex-col gap-2 px-3" aria-label="Flowers">
          {shown.map((p) => {
            const v = p.variants?.[0]
            const { now, was } = sellingOf(v ? prices.prices[v.id] : undefined)
            const avail = availableOf(p)
            const isTracked = tracked(p)
            const hidden = p.status !== "published"
            const isSelected = selected.has(p.id)
            const stockText = !isTracked ? "Always available" : avail === 0 ? "Sold out" : `${avail} left`
            return (
              <li key={p.id}>
                <div
                  className={cx(
                    "flex items-center gap-3 rounded-2xl border bg-white p-2 pe-1",
                    isSelected ? "border-blush-600 ring-2 ring-blush-200" : "border-ink-200"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => (selecting ? toggleOne(p.id) : setEditing(p))}
                    aria-pressed={selecting ? isSelected : undefined}
                    className="flex min-h-[60px] min-w-0 flex-1 items-center gap-3 text-start"
                  >
                    {selecting && (
                      <span
                        aria-hidden
                        className={cx(
                          "flex h-6 w-6 flex-none items-center justify-center rounded-md border-2",
                          isSelected ? "border-blush-600 bg-blush-600 text-white" : "border-ink-300"
                        )}
                      >
                        {isSelected ? "✓" : ""}
                      </span>
                    )}
                    {p.thumbnail ? (
                      <img src={p.thumbnail} alt="" loading="lazy" className={cx("h-14 w-14 flex-none rounded-xl object-cover", hidden && "opacity-50")} />
                    ) : (
                      <span className="h-14 w-14 flex-none rounded-xl bg-blush-100" />
                    )}
                    <span className="flex min-w-0 flex-col">
                      <span className={cx("truncate font-medium", hidden && "text-ink-600")}>{p.title}</span>
                      <span className="text-sm text-ink-600">
                        {was != null && <s className="me-1 text-ink-500">{money(was)}</s>}
                        <span className={was != null ? "font-medium text-blush-700" : ""}>{money(now)}</span>
                        {" · "}
                        <span className={cx(isTracked && avail === 0 && "font-medium text-blush-700", isTracked && avail > 0 && avail <= LOW_STOCK && "font-medium text-champagne-700")}>
                          {hidden ? "Hidden" : stockText}
                        </span>
                      </span>
                    </span>
                  </button>
                  {!selecting && (
                    <Toggle checked={!hidden} disabled={toggling === p.id} onChange={(show) => setVisible(p, show)} label={`Show ${p.title} on the website`} />
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Bottom bar: the selection's actions, or Add a flower. Both sit above the tab bar. */}
      <div className="fixed inset-x-0 bottom-[calc(57px+env(safe-area-inset-bottom))] z-20 mx-auto max-w-2xl px-3 pb-2">
        {selecting ? (
          selected.size > 0 && (
            <div className="grid grid-cols-5 gap-1 rounded-2xl bg-ink-900 p-1.5 text-white shadow-xl" role="toolbar" aria-label={`Change ${selected.size} selected`}>
              {(
                [
                  ["stock", "Stock"],
                  ["offer", "Offer"],
                  ["category", "Category"],
                  ["visibility", "Hide/Show"],
                  ["delete", "Delete"],
                ] as const
              ).map(([id, label]) => (
                <button key={id} type="button" onClick={() => setBulk(id)} className={cx("min-h-[48px] rounded-xl px-1 text-[13px] font-medium active:bg-white/15", id === "delete" && "text-blush-200")}>
                  {label}
                </button>
              ))}
            </div>
          )
        ) : (
          <div className="flex justify-end">
            <Button onClick={() => setAdding(true)} className="rounded-full px-6 shadow-lg">
              + Add flower
            </Button>
          </div>
        )}
      </div>
      <div aria-hidden className="h-20" />

      <FlowerSheet open={adding || !!editing} onClose={() => { setAdding(false); setEditing(null) }} product={editing ?? undefined} categories={categories} prices={prices} />
      <BulkSheet action={bulk} onClose={() => setBulk(null)} onDone={stopSelecting} selected={selectedProducts} categories={categories} prices={prices} />
    </div>
  )
}
