/**
 * The product spreadsheet from the phone: download the blank sheet, download
 * every flower in the same layout to use as a price list, and import a filled
 * sheet — a dry-run report first, and nothing written until Apply is tapped.
 *
 * The rules live in lib/spreadsheet.ts, ported from scripts/import-products.mjs.
 */
import { useQuery } from "@tanstack/react-query"
import { useRef, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"

import { Button, Spinner, cx, toast } from "../components/ui"
import { messageOf, runLimited } from "../lib/bulk"
import { useAfterSave, useCatalogue } from "../lib/data"
import { sdk } from "../lib/sdk"
import { uploadPhoto } from "../lib/variants"
import {
  FILE_NAME,
  applyFlower,
  buildWorkbook,
  exportRows,
  planImport,
  readWorkbook,
  sheetCategories,
  type Plan,
  type PlanFlower,
} from "../lib/spreadsheet"
import type { ShopCategory, ShopPrices } from "../lib/shop"

type SheetCategory = ShopCategory & { is_active?: boolean; is_internal?: boolean }

/** The categories customers can see — what the Store API gives the Node script. */
const fetchSheetCategories = () =>
  sdk.client.fetch<{ product_categories: SheetCategory[] }>(
    "/admin/product-categories?limit=200&fields=id,name,handle,is_active,is_internal,rank"
  )

function save(data: ArrayBuffer, name: string) {
  const blob = new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** Shrunk to 1600px, with the website's smaller sizes made too. */
const upload = uploadPhoto

type Progress = { state: "waiting" | "working" | "done" | "failed"; note?: string }

export default function Spreadsheet() {
  const catalogue = useCatalogue()
  const afterSave = useAfterSave()
  const sheetCats = useQuery({ queryKey: ["categories", "sheet"], queryFn: fetchSheetCategories })
  const input = useRef<HTMLInputElement>(null)

  const [making, setMaking] = useState<"blank" | "all" | null>(null)
  const [reading, setReading] = useState(false)
  const [fileName, setFileName] = useState("")
  const [plan, setPlan] = useState<Plan | null>(null)
  const [planPrices, setPlanPrices] = useState<ShopPrices | null>(null)
  const [readError, setReadError] = useState("")
  const [applying, setApplying] = useState(false)
  const [progress, setProgress] = useState<Record<string, Progress> | null>(null)

  const tickNames = () =>
    sheetCategories((sheetCats.data?.product_categories ?? []).filter((c) => c.is_active !== false && !c.is_internal)).map(
      (c) => c.name
    )

  async function download(kind: "blank" | "all") {
    setMaking(kind)
    try {
      if (!sheetCats.data) await sheetCats.refetch()
      const names = tickNames()
      if (kind === "blank") {
        save(await buildWorkbook(names), FILE_NAME)
      } else {
        await catalogue.refetch()
        const rows = exportRows(
          { products: catalogue.products, categories: catalogue.categories, prices: catalogue.prices },
          names
        )
        save(await buildWorkbook(names, rows), `tulips-and-truffles-all-flowers-${new Date().toISOString().slice(0, 10)}.xlsx`)
      }
    } catch (err) {
      toast(`The sheet could not be made: ${messageOf(err)}`, "error")
    } finally {
      setMaking(null)
    }
  }

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setReading(true)
    setReadError("")
    setPlan(null)
    setProgress(null)
    setFileName(file.name)
    try {
      // Plan against the shop as it is now, not as it was when the screen opened.
      const [sheet, [products, categories, prices]] = await Promise.all([
        file.arrayBuffer().then(readWorkbook),
        catalogue.refetch(),
      ])
      if (products.error || categories.error || prices.error) {
        throw products.error ?? categories.error ?? prices.error
      }
      if (!sheet.rows.length) throw new Error("There are no flowers in that sheet — every row is blank or an example.")
      const current = prices.data ?? { sale_price_list_id: null, prices: {} }
      setPlan(
        planImport(sheet, {
          products: products.data?.products ?? [],
          categories: categories.data?.product_categories ?? [],
          prices: current,
        })
      )
      setPlanPrices(current)
    } catch (err) {
      setReadError(messageOf(err))
    } finally {
      setReading(false)
    }
  }

  async function apply() {
    if (!plan || !planPrices) return
    const todo = plan.flowers.filter((f) => f.action === "create" || f.action === "update")
    if (!todo.length) return
    setApplying(true)
    setProgress(Object.fromEntries(todo.map((f) => [f.key, { state: "waiting" } as Progress])))
    const mark = (key: string, p: Progress) => setProgress((all) => ({ ...all, [key]: p }))
    const prices = planPrices
    let added = 0
    let changed = 0
    let failed = 0
    await runLimited(todo, 2, async (f) => {
      mark(f.key, { state: "working" })
      try {
        const note = await applyFlower(f, { prices, upload })
        mark(f.key, { state: "done", note })
        if (f.action === "create") added++
        else changed++
      } catch (err) {
        failed++
        mark(f.key, { state: "failed", note: messageOf(err) })
        throw err
      }
    })
    setApplying(false)
    const parts = [added && `${added} added`, changed && `${changed} changed`].filter(Boolean).join(", ")
    if (added + changed) {
      await afterSave(
        `Spreadsheet: ${parts}`,
        `${parts}${failed ? `, ${failed} did not save` : ""}.`
      )
    } else {
      toast("Nothing was saved. See each flower below.", "error")
    }
  }

  const done = progress != null && !applying
  const toWrite = plan ? plan.counts.create + plan.counts.update : 0

  return (
    <div className="flex flex-col gap-5 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-4">
      <div className="flex items-center gap-2">
        <Link to="/more" className="-ms-2 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-xl" aria-label="Back to More">
          <span aria-hidden>‹</span>
        </Link>
        <h1 className="font-display text-3xl font-semibold">Spreadsheet</h1>
      </div>

      <section className="flex flex-col gap-2 rounded-2xl border border-ink-200 bg-white p-4">
        <h2 className="font-semibold">Download</h2>
        <p className="text-[15px] text-ink-600">
          The sheet has one row per flower and a tick column for each category. Fill it in on a computer or in Excel on
          the phone, then import it below.
        </p>
        <Button variant="secondary" busy={making === "blank"} disabled={!!making} onClick={() => download("blank")}>
          Blank sheet with an example
        </Button>
        <Button variant="secondary" busy={making === "all"} disabled={!!making} onClick={() => download("all")}>
          All flowers, to edit as a price list
        </Button>
        <p className="text-sm text-ink-600">
          In the full list, photos are links. Leave them as they are to keep a flower's photo, or paste a new picture over one.
        </p>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-ink-200 bg-white p-4">
        <h2 className="font-semibold">Import a sheet</h2>
        {!plan && (
          <p className="text-[15px] text-ink-600">
            You will see what would change first. Nothing is saved until you tap Apply.
          </p>
        )}
        <Button onClick={() => input.current?.click()} busy={reading} disabled={applying}>
          {plan || readError ? "Choose another sheet" : "Choose a sheet (.xlsx)"}
        </Button>
        <input
          ref={input}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          tabIndex={-1}
          aria-label="Spreadsheet file"
          onChange={pick}
        />
        {reading && (
          <p className="flex items-center gap-2 text-[15px] text-ink-600" aria-live="polite">
            <Spinner /> Reading {fileName}…
          </p>
        )}
        {readError && (
          <p role="alert" className="rounded-xl bg-blush-100 px-3 py-2 text-[15px] text-blush-700">
            {readError}
          </p>
        )}
      </section>

      {plan && (
        <Report plan={plan} fileName={fileName} progress={progress} />
      )}

      {plan && toWrite > 0 && !done && (
        <div className="sticky bottom-[calc(80px+env(safe-area-inset-bottom))] z-20 flex flex-col gap-1 rounded-2xl bg-white/95 p-2 shadow-lg ring-1 ring-ink-200">
          <Button onClick={apply} busy={applying} className="w-full">
            {applying ? "Saving…" : `Apply: ${[plan.counts.create && `add ${plan.counts.create}`, plan.counts.update && `change ${plan.counts.update}`].filter(Boolean).join(", ")}`}
          </Button>
        </div>
      )}
      {plan && toWrite === 0 && (
        <p className="rounded-2xl bg-sage-100 p-4 text-sage-900">Nothing in this sheet would change the shop.</p>
      )}
      {done && (
        <Button variant="secondary" onClick={() => input.current?.click()}>
          Import another sheet
        </Button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ report */

const ACTION_LABEL: Record<PlanFlower["action"], string> = {
  create: "New",
  update: "Change",
  unchanged: "No change",
  skip: "Skipped",
}

function Report({ plan, fileName, progress }: { plan: Plan; fileName: string; progress: Record<string, Progress> | null }) {
  const { counts } = plan
  const groups: { title: string; action: PlanFlower["action"]; open: boolean }[] = [
    { title: "Will be added", action: "create", open: true },
    { title: "Will change", action: "update", open: true },
    { title: "Skipped", action: "skip", open: true },
    { title: "Already up to date", action: "unchanged", open: false },
  ]
  return (
    <section className="flex flex-col gap-3" aria-label="What this sheet would do">
      <h2 className="font-semibold break-words">{progress ? "Saving" : "Before anything is saved"} · {fileName}</h2>
      <dl className="grid grid-cols-2 gap-2 text-center">
        <Stat label="new" value={counts.create} />
        <Stat label="to change" value={counts.update} />
        <Stat label="skipped" value={counts.skip} tone={counts.skip ? "warn" : undefined} />
        <Stat label="unchanged" value={counts.unchanged} />
      </dl>
      {plan.unknownColumns.length > 0 && (
        <p className="rounded-xl bg-champagne-100 px-3 py-2 text-[15px] text-champagne-900">
          These columns are not categories in the shop, so their ticks are ignored: <b>{plan.unknownColumns.join(", ")}</b>.
          Check the spelling, or make the category in the full admin first.
        </p>
      )}
      {groups.map((g) => {
        const list = plan.flowers.filter((f) => f.action === g.action)
        if (!list.length) return null
        return (
          <details key={g.action} open={g.open} className="rounded-2xl border border-ink-200 bg-white">
            <summary className="flex min-h-[48px] cursor-pointer items-center justify-between gap-2 px-4 font-medium">
              <span>{g.title}</span>
              <span className="text-ink-600">{list.length}</span>
            </summary>
            <ul className="divide-y divide-ink-100 border-t border-ink-100">
              {list.map((f) => (
                <FlowerLine key={f.key} f={f} progress={progress?.[f.key]} />
              ))}
            </ul>
          </details>
        )
      })}
    </section>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "warn" }) {
  return (
    <div className={cx("flex flex-col-reverse rounded-2xl px-2 py-2", tone ? "bg-blush-100 text-blush-700" : "bg-ink-50")}>
      <dt className="text-sm">{label}</dt>
      <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

function FlowerLine({ f, progress }: { f: PlanFlower; progress?: Progress }) {
  const sizes = f.sizes
    .map((s) => `${f.sizes.length > 1 || s.title !== "One size" ? `${s.title} ` : ""}QAR ${s.sale ?? s.base}${s.sale != null ? ` (was ${s.base})` : ""}`)
    .join(" · ")
  let status: ReactNode = null
  if (progress) {
    status =
      progress.state === "working" ? (
        <span className="flex items-center gap-1.5 text-ink-600">
          <Spinner /> Saving
        </span>
      ) : progress.state === "done" ? (
        <span className="text-sage-700">✓ {progress.note}</span>
      ) : progress.state === "failed" ? (
        <span className="text-blush-700">Did not save: {progress.note}</span>
      ) : (
        <span className="text-ink-600">Waiting</span>
      )
  }
  return (
    <li className="flex flex-col gap-1 px-4 py-3 text-[15px]">
      <div className="flex items-start justify-between gap-2">
        <b className="min-w-0 break-words">{f.name}</b>
        <span className="flex-none text-sm text-ink-600">row {f.rows.join(", ")}</span>
      </div>
      {f.action === "skip" ? (
        <span className="text-blush-700">Not imported: {f.reason}.</span>
      ) : f.action === "create" ? (
        <span className="text-ink-700">
          {sizes}
          {f.onOffer ? " · on offer" : ""}
          {f.status === "draft" ? " · hidden" : ""}
          {f.photo ? " · photo" : ""}
        </span>
      ) : f.changes.length ? (
        <ul className="text-ink-700">
          {f.changes.map((c) => (
            <li key={c} className="break-words">{c}</li>
          ))}
        </ul>
      ) : null}
      {f.warnings.length > 0 && (
        <ul className="flex flex-col gap-0.5 text-sm text-champagne-900">
          {f.warnings.map((w) => (
            <li key={w} className="break-words">⚠ {w}</li>
          ))}
        </ul>
      )}
      {status && <div role="status" className="text-sm">{status}</div>}
      <span className="sr-only">{ACTION_LABEL[f.action]}</span>
    </li>
  )
}
