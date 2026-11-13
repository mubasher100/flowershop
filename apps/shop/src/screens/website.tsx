import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { Button, toast } from "../components/ui"
import { messageOf } from "../lib/bulk"
import { STOREFRONT, sdk } from "../lib/sdk"
import { clock, countdown, liveBy, pending, readChanges } from "../lib/live"

type Publish = {
  available: boolean
  last: { running: boolean; started_at: string; finished_at: string | null; ok: boolean | null } | null
}

/**
 * "Make it live now": a fresh website deploy, which clears every cached copy
 * at once (about five minutes) instead of waiting out the half hour. Shown
 * only once the backend has a GitHub token to start the deploy with.
 */
function MakeLiveNow() {
  const qc = useQueryClient()
  const status = useQuery({
    queryKey: ["publish-now"],
    queryFn: () => sdk.client.fetch<Publish>("/admin/publish-now"),
    refetchInterval: (q) => (q.state.data?.last?.running ? 15_000 : false),
  })
  const [busy, setBusy] = useState(false)
  const last = status.data?.last
  if (!status.data?.available) return null

  async function go() {
    setBusy(true)
    try {
      const r = await sdk.client.fetch<{ started: boolean }>("/admin/publish-now", { method: "POST" })
      toast(r.started ? "Refreshing the website. Everything is live in about 5 minutes." : "Already refreshing. It finishes in a few minutes.")
      // GitHub takes a moment to list the new run.
      setTimeout(() => qc.invalidateQueries({ queryKey: ["publish-now"] }), 5000)
    } catch (err) {
      toast(messageOf(err), "error")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-ink-200 bg-white p-4">
      <b>Can't wait?</b>
      <p className="text-[15px] text-ink-600">
        Make it live now refreshes the whole website, so every change shows in about 5 minutes. The website keeps working
        while it does.
      </p>
      {last?.running ? (
        <p className="text-[15px] font-medium text-champagne-800" aria-live="polite">
          Refreshing since {clock(new Date(last.started_at))}…
        </p>
      ) : (
        <Button busy={busy} onClick={go}>
          Make it live now
        </Button>
      )}
      {last && !last.running && last.finished_at && (
        <p className="text-sm text-ink-600">
          Last refresh {last.ok ? "finished" : "did not finish"} at {clock(new Date(last.finished_at))}
          {last.ok ? "." : ". The website is still on the version before it."}
        </p>
      )}
    </section>
  )
}

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

      {waiting.length > 0 && <MakeLiveNow />}

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
        <Link to="/website/homepage" className="flex min-h-[48px] items-center justify-between rounded-2xl border border-ink-200 bg-white px-4">
          Homepage <span aria-hidden>›</span>
        </Link>
        <Link to="/more/categories" className="flex min-h-[48px] items-center justify-between rounded-2xl border border-ink-200 bg-white px-4">
          Categories <span aria-hidden>›</span>
        </Link>
      </section>
    </div>
  )
}
