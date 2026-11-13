/**
 * Delivery days: close a day (Eid, a holiday), cap how many orders a day or a
 * time window takes, and see how full the coming weeks are. The full admin's
 * Delivery days page, at phone size, through the same /admin/delivery-days
 * route. Checkout reads these live, so a change applies to the next customer
 * — no cache wait.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState, type FormEvent } from "react"

import { SubPage } from "../components/page"
import { Button, Field, Sheet, Toggle, cx, inputClass, toast } from "../components/ui"
import { messageOf } from "../lib/bulk"
import { todayInQatar } from "../lib/orders"
import { sdk } from "../lib/sdk"

type Day = {
  date: string
  closed: boolean
  max_orders: number | null
  max_per_window: number | null
  booked: number
  note: string | null
}
type DaysResponse = { days: Day[]; defaults: { max_orders: number; max_per_window: number } }

const KEY = ["delivery-days"]
/** As far ahead as checkout offers dates (28 days since Black Friday). */
const AHEAD = 28

export const nextDays = (from: string, n: number) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(`${from}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() + i)
    return d.toISOString().slice(0, 10)
  })

const pretty = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })

export default function DeliveryDays() {
  const days = useQuery({ queryKey: KEY, queryFn: () => sdk.client.fetch<DaysResponse>("/admin/delivery-days") })
  const [open, setOpen] = useState<string | null>(null)

  const byDate = new Map((days.data?.days ?? []).map((d) => [d.date, d]))
  const defaults = days.data?.defaults
  const today = todayInQatar()

  return (
    <SubPage title="Delivery days">
      <p className="text-[15px] text-ink-600">
        Tap a day to close it or limit its orders. Changes apply to the next customer at checkout straight away.
      </p>
      {days.isPending ? (
        <p className="text-ink-600">Loading…</p>
      ) : days.error ? (
        <p role="alert" className="text-blush-700">{messageOf(days.error)}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-ink-100 rounded-2xl border border-ink-200 bg-white">
          {nextDays(today, AHEAD).map((date) => {
            const d = byDate.get(date)
            const limit = d?.max_orders ?? defaults?.max_orders ?? 0
            const booked = d?.booked ?? 0
            const full = !d?.closed && limit > 0 && booked >= limit
            return (
              <li key={date}>
                <button type="button" onClick={() => setOpen(date)} className="flex min-h-[56px] w-full items-center justify-between gap-3 px-3 text-start">
                  <span className="min-w-0">
                    <span className="font-medium">{date === today ? "Today" : pretty(date)}</span>
                    {d?.note && <span className="block truncate text-sm text-ink-600">{d.note}</span>}
                  </span>
                  <span
                    className={cx(
                      "flex-none rounded-full px-2.5 py-1 text-sm font-medium",
                      d?.closed ? "bg-ink-100 text-ink-700" : full ? "bg-blush-100 text-blush-700" : "bg-sage-100 text-sage-800"
                    )}
                  >
                    {d?.closed ? "Closed" : `${booked} of ${limit}${full ? " · full" : ""}`}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <DaySheet date={open} day={open ? byDate.get(open) : undefined} defaults={defaults} onClose={() => setOpen(null)} />
    </SubPage>
  )
}

function DaySheet({
  date,
  day,
  defaults,
  onClose,
}: {
  date: string | null
  day?: Day
  defaults?: DaysResponse["defaults"]
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [closed, setClosed] = useState(false)
  const [maxOrders, setMaxOrders] = useState("")
  const [maxPerWindow, setMaxPerWindow] = useState("")
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!date) return
    setClosed(day?.closed ?? false)
    setMaxOrders(day?.max_orders != null ? String(day.max_orders) : "")
    setMaxPerWindow(day?.max_per_window != null ? String(day.max_per_window) : "")
    setNote(day?.note ?? "")
    setError("")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  const limit = (s: string) => (s.trim() === "" ? null : Number(s))

  async function save(e: FormEvent) {
    e.preventDefault()
    const mo = limit(maxOrders)
    const mw = limit(maxPerWindow)
    if ([mo, mw].some((n) => n != null && (!Number.isInteger(n) || n < 0))) return setError("Limits are whole numbers, 0 or more.")
    setBusy(true)
    setError("")
    try {
      await sdk.client.fetch("/admin/delivery-days", {
        method: "POST",
        body: { date, closed, max_orders: mo, max_per_window: mw, note: note.trim() || null },
      })
      await qc.invalidateQueries({ queryKey: KEY })
      toast(closed ? `${pretty(date!)} closed. Customers can't choose it now.` : `${pretty(date!)} saved.`)
      onClose()
    } catch (err) {
      setError(messageOf(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={!!date}
      onClose={onClose}
      title={date ? pretty(date) : ""}
      footer={
        <div className="flex flex-col gap-2">
          {error && <p role="alert" className="rounded-xl bg-blush-100 px-3 py-2 text-[15px] text-blush-700">{error}</p>}
          <Button type="submit" form="day-form" busy={busy} className="w-full">
            Save
          </Button>
        </div>
      }
    >
      <form id="day-form" onSubmit={save} noValidate className="flex flex-col gap-5">
        <p className="text-[15px] text-ink-600">{day?.booked ?? 0} orders booked for this day so far.</p>
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-ink-50 px-3 py-1">
          <span>
            <span className="font-medium">Closed</span>
            <span className="block text-sm text-ink-600">{closed ? "Customers can't pick this day." : "Taking orders."}</span>
          </span>
          <Toggle checked={closed} onChange={setClosed} label="Closed" />
        </div>
        {!closed && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Orders this day" hint={`Empty: ${defaults?.max_orders ?? "shop default"}`}>
              <input inputMode="numeric" value={maxOrders} onChange={(e) => setMaxOrders(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Per time window" hint={`Empty: ${defaults?.max_per_window ?? "shop default"}`}>
              <input inputMode="numeric" value={maxPerWindow} onChange={(e) => setMaxPerWindow(e.target.value)} className={inputClass} />
            </Field>
          </div>
        )}
        <Field label="Note for yourself" hint="Only you see it, e.g. Eid, staff off.">
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} className={inputClass} />
        </Field>
      </form>
    </Sheet>
  )
}
