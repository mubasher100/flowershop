import { useEffect, useState } from "react"

import { BACKEND, STOREFRONT } from "../lib/sdk"
import { clock, countdown, liveBy, pending, readChanges } from "../lib/live"

/** Re-render every second while something is counting down. */
function useNow(active: boolean) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [active])
  return now
}

function useChanges() {
  const [, bump] = useState(0)
  useEffect(() => {
    const on = () => bump((n) => n + 1)
    window.addEventListener("tt-changes", on)
    return () => window.removeEventListener("tt-changes", on)
  }, [])
  return readChanges()
}

export default function Website() {
  const changes = useChanges()
  const { waiting, liveAt } = pending()
  const now = useNow(waiting.length > 0)
  const left = liveAt ? countdown(liveAt, now) : null

  return (
    <div className="flex flex-col gap-4 px-4 pt-[max(12px,env(safe-area-inset-top))]">
      <h1 className="font-display text-3xl font-semibold">Website</h1>

      {left && liveAt ? (
        <section className="flex flex-col gap-2 rounded-2xl bg-champagne-100 p-4 text-champagne-900" aria-live="polite">
          <b>
            {waiting.length} change{waiting.length === 1 ? "" : "s"} on the way
          </b>
          <div className="flex items-end justify-between gap-3">
            <span>All live by {clock(liveAt)}</span>
            <span className="text-2xl font-semibold tabular-nums">{left}</span>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl bg-sage-100 p-4 text-sage-900">
          <b>Everything is live.</b>
          <p className="text-[15px]">Changes reach the website within 30 minutes of saving.</p>
        </section>
      )}

      {changes.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">Today's changes</h2>
          <ul className="flex flex-col divide-y divide-ink-100 rounded-2xl border border-ink-200 bg-white">
            {changes.map((c) => {
              const at = liveBy(c.at)
              const live = at <= now
              return (
                <li key={c.at + c.what} className="flex items-center justify-between gap-3 px-3 py-2.5 text-[15px]">
                  <span className="min-w-0">{c.what}</span>
                  <span className={live ? "flex-none text-sage-700" : "flex-none text-champagne-700"}>
                    {live ? "Live" : `by ${clock(at)}`}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Look after the website</h2>
        <a href={STOREFRONT} target="_blank" rel="noreferrer" className="flex min-h-[48px] items-center justify-between rounded-2xl border border-ink-200 bg-white px-4">
          Open the website <span aria-hidden>↗</span>
        </a>
        <a href={`${BACKEND}/app/homepage-sections`} target="_blank" rel="noreferrer" className="flex min-h-[48px] items-center justify-between rounded-2xl border border-ink-200 bg-white px-4">
          Homepage sections <span aria-hidden>↗</span>
        </a>
        <a href={`${BACKEND}/app/categories`} target="_blank" rel="noreferrer" className="flex min-h-[48px] items-center justify-between rounded-2xl border border-ink-200 bg-white px-4">
          Categories <span aria-hidden>↗</span>
        </a>
      </section>
    </div>
  )
}
