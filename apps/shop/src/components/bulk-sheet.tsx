/**
 * The sheets behind the selection bar: one action, applied to every selected
 * flower, with a plain report of any that did not change and why.
 */
import { useEffect, useState } from "react"

import {
  bulkCategory,
  bulkDelete,
  bulkOffer,
  bulkStock,
  bulkVisibility,
  messageOf,
  offerPrice,
  type Outcome,
  type StockMode,
} from "../lib/bulk"
import { useAfterSave } from "../lib/data"
import { money, sellingOf, type ShopCategory, type ShopPrices, type ShopProduct } from "../lib/shop"
import { Button, Field, Sheet, cx, inputClass } from "./ui"

export type BulkAction = "stock" | "offer" | "category" | "visibility" | "delete"

const TITLES: Record<BulkAction, string> = {
  stock: "Change stock",
  offer: "Offer",
  category: "Categories",
  visibility: "Show or hide",
  delete: "Delete",
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export default function BulkSheet({
  action,
  onClose,
  onDone,
  selected,
  categories,
  prices,
}: {
  action: BulkAction | null
  onClose: () => void
  /** Clears the selection once the action has gone through for every flower. */
  onDone: () => void
  selected: ShopProduct[]
  categories: ShopCategory[]
  prices: ShopPrices
}) {
  const afterSave = useAfterSave()
  const [busy, setBusy] = useState(false)
  const [failures, setFailures] = useState<Outcome[]>([])
  const [error, setError] = useState("")

  // per-action inputs
  const [stockMode, setStockMode] = useState<StockMode>("set")
  const [stockValue, setStockValue] = useState("10")
  const [percent, setPercent] = useState("20")
  const [categoryId, setCategoryId] = useState("")
  const [addTo, setAddTo] = useState(true)

  useEffect(() => {
    if (action) {
      setFailures([])
      setError("")
      setBusy(false)
    }
  }, [action])

  const n = selected.length
  const names = plural(n, "flower")

  async function run() {
    if (!action) return
    setBusy(true)
    setError("")
    try {
      let results: Outcome[] = []
      let what = ""
      if (action === "stock") {
        const v = Number(stockValue)
        if (!Number.isFinite(v) || v < 0) throw new Error("Enter a number, 0 or more.")
        results = await bulkStock(selected, stockMode, v)
        what = stockMode === "set" ? `Stock set to ${v} on ${names}` : `Added ${v} to the stock of ${names}`
      } else if (action === "offer") {
        const p = Number(percent)
        if (!Number.isFinite(p) || p <= 0 || p >= 90) throw new Error("Choose a discount between 1% and 89%.")
        results = await bulkOffer(selected, prices, p)
        what = `${p}% offer on ${names}`
      } else if (action === "category") {
        if (!categoryId) throw new Error("Choose a category.")
        const name = categories.find((c) => c.id === categoryId)?.name ?? "category"
        results = await bulkCategory(selected, categoryId, addTo)
        what = `${names} ${addTo ? "added to" : "taken out of"} ${name}`
      } else if (action === "delete") {
        results = await bulkDelete(selected)
        what = `Deleted ${names}`
      }
      finish(results, what)
    } catch (err) {
      setError(messageOf(err))
      setBusy(false)
    }
  }

  async function runVisibility(show: boolean) {
    setBusy(true)
    finish(await bulkVisibility(selected, show), `${show ? "Showed" : "Hid"} ${names}`)
  }

  async function runEndOffer() {
    setBusy(true)
    try {
      finish(await bulkOffer(selected, prices, null), `Offer ended on ${names}`)
    } catch (err) {
      setError(messageOf(err))
      setBusy(false)
    }
  }

  async function finish(results: Outcome[], what: string) {
    const failed = results.filter((r) => !r.ok)
    const done = results.length - failed.length
    if (done > 0) await afterSave(what, failed.length ? `${plural(done, "flower")} changed.` : `${what}.`)
    setBusy(false)
    if (failed.length) {
      setFailures(failed)
    } else {
      onDone()
      onClose()
    }
  }

  // Preview for the offer: what the first few would sell at.
  const preview = selected.slice(0, 3).map((p) => {
    const v = p.variants?.[0]
    const { now, was } = sellingOf(v ? prices.prices[v.id] : undefined)
    const full = was ?? now
    const pct = Number(percent)
    return { title: p.title, full, offer: Number.isFinite(pct) && pct > 0 && pct < 90 ? offerPrice(full, pct) : null }
  })

  return (
    <Sheet open={!!action} onClose={onClose} title={action ? `${TITLES[action]} · ${names}` : ""}>
      {failures.length > 0 ? (
        <div className="flex flex-col gap-4">
          <p className="font-medium">
            {plural(failures.length, "flower")} didn't change:
          </p>
          <ul className="flex flex-col gap-2">
            {failures.map((f) => (
              <li key={f.product.id} className="rounded-xl bg-blush-100 px-3 py-2">
                <b className="block">{f.product.title}</b>
                <span className="text-blush-700">{f.error}</span>
              </li>
            ))}
          </ul>
          <Button
            onClick={() => {
              onDone()
              onClose()
            }}
          >
            OK
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {action === "stock" && (
            <>
              <div role="radiogroup" aria-label="How to change it" className="grid grid-cols-2 gap-2">
                {(["set", "add"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={stockMode === m}
                    onClick={() => setStockMode(m)}
                    className={cx(
                      "min-h-[44px] rounded-xl border px-3",
                      stockMode === m ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 bg-white"
                    )}
                  >
                    {m === "set" ? "Set to" : "Add"}
                  </button>
                ))}
              </div>
              <Field
                label={stockMode === "set" ? "How many each can sell" : "How many to add to each"}
                hint={stockMode === "set" ? "Every size of each flower gets this number. Set 0 to mark them sold out." : "Added to every size of each flower."}
              >
                <input inputMode="numeric" value={stockValue} onChange={(e) => setStockValue(e.target.value)} className={inputClass} />
              </Field>
              <div className="flex flex-wrap gap-2">
                {[0, 5, 10, 20].map((q) => (
                  <button key={q} type="button" onClick={() => { setStockMode("set"); setStockValue(String(q)) }} className="min-h-[44px] rounded-full border border-ink-200 px-4">
                    {q === 0 ? "Sold out" : `Set ${q}`}
                  </button>
                ))}
              </div>
            </>
          )}

          {action === "offer" && (
            <>
              <Field label="Discount (%)" hint="Offer prices are rounded down to end in 9.">
                <input inputMode="numeric" value={percent} onChange={(e) => setPercent(e.target.value)} className={inputClass} />
              </Field>
              <div className="flex flex-wrap gap-2">
                {[10, 15, 20, 25, 30].map((q) => (
                  <button key={q} type="button" onClick={() => setPercent(String(q))} className={cx("min-h-[44px] rounded-full border px-4", percent === String(q) ? "border-blush-600 bg-blush-100 text-blush-700" : "border-ink-200")}>
                    {q}%
                  </button>
                ))}
              </div>
              <ul className="flex flex-col gap-1 rounded-xl bg-ink-50 px-3 py-2 text-[15px]">
                {preview.map((p) => (
                  <li key={p.title} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate">{p.title}</span>
                    <span className="flex-none">
                      <s className="text-ink-500">{money(p.full)}</s> {p.offer != null ? money(p.offer) : "–"}
                    </span>
                  </li>
                ))}
                {n > 3 && <li className="text-ink-600">and {plural(n - 3, "more")}</li>}
              </ul>
              <Button variant="secondary" busy={busy} onClick={runEndOffer}>
                End the offer instead
              </Button>
            </>
          )}

          {action === "category" && (
            <>
              <div role="radiogroup" aria-label="Add or take out" className="grid grid-cols-2 gap-2">
                {[true, false].map((a) => (
                  <button key={String(a)} type="button" role="radio" aria-checked={addTo === a} onClick={() => setAddTo(a)} className={cx("min-h-[44px] rounded-xl border px-3", addTo === a ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 bg-white")}>
                    {a ? "Add to" : "Take out of"}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Category">
                {categories.map((c) => (
                  <button key={c.id} type="button" role="radio" aria-checked={categoryId === c.id} onClick={() => setCategoryId(c.id)} className={cx("min-h-[44px] rounded-full border px-4", categoryId === c.id ? "border-blush-600 bg-blush-100 font-medium text-blush-700" : "border-ink-200")}>
                    {c.name}
                  </button>
                ))}
              </div>
            </>
          )}

          {action === "visibility" && (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" busy={busy} onClick={() => runVisibility(false)}>
                Hide all
              </Button>
              <Button busy={busy} onClick={() => runVisibility(true)}>
                Show all
              </Button>
            </div>
          )}

          {action === "delete" && (
            <p>
              Delete {names} for good? This can't be undone. Hiding them keeps them for later. A flower an unsent order is holding
              can't be deleted.
            </p>
          )}

          {error && (
            <p role="alert" className="rounded-xl bg-blush-100 px-3 py-2 text-blush-700">
              {error}
            </p>
          )}

          {action && action !== "visibility" && (
            <Button variant={action === "delete" ? "danger" : "primary"} busy={busy} onClick={run}>
              {action === "delete" ? `Delete ${names}` : action === "offer" ? `Put ${names} on offer` : `Apply to ${names}`}
            </Button>
          )}
        </div>
      )}
    </Sheet>
  )
}
