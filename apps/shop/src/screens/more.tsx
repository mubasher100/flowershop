import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Link } from "react-router-dom"

import { Card } from "../components/page"
import { Button, Toggle, toast } from "../components/ui"
import { messageOf } from "../lib/bulk"
import { recordChange, clock, liveBy } from "../lib/live"
import { BACKEND, IS_STAGING, sdk } from "../lib/sdk"
import { KEYS } from "../lib/shop"

/**
 * Everything the shop runs that is not an order or a flower. Each of these
 * used to be a link out to the full admin; since 13 Nov 2026 they are pages
 * of this app, and the full admin is the fallback at the bottom.
 */
const PAGES: { to: string; label: string; hint: string }[] = [
  { to: "/more/spreadsheet", label: "Spreadsheet", hint: "Download the sample, import flowers, export them all" },
  { to: "/more/categories", label: "Categories", hint: "Add, rename, reorder or hide" },
  { to: "/website/homepage", label: "Homepage", hint: "Carousel, rows of flowers and banners" },
  { to: "/more/delivery-days", label: "Delivery days", hint: "Close a day or limit its orders" },
  { to: "/more/printing", label: "Printing", hint: "Sample gift card, label logo" },
]

type PriceList = { id: string; title: string; type: string; status: string }

/** The sale list (Everyday value): active shows every offer, draft hides them all. */
function OffersSwitch() {
  const qc = useQueryClient()
  const lists = useQuery({
    queryKey: ["price-lists"],
    queryFn: () => sdk.client.fetch<{ price_lists: PriceList[] }>("/admin/price-lists?limit=50&fields=id,title,type,status"),
  })
  const sale =
    lists.data?.price_lists.find((l) => l.type === "sale" && l.title === "Everyday value") ??
    lists.data?.price_lists.find((l) => l.type === "sale")
  const [confirmOff, setConfirmOff] = useState(false)
  const [busy, setBusy] = useState(false)

  async function set(active: boolean) {
    if (!sale) return
    setBusy(true)
    try {
      await sdk.admin.priceList.update(sale.id, { status: active ? "active" : "draft" })
      await Promise.all([qc.invalidateQueries({ queryKey: ["price-lists"] }), qc.invalidateQueries({ queryKey: KEYS.prices })])
      const change = recordChange(active ? "Offers switched on" : "Offers switched off")
      toast(`${active ? "Offers on." : "Offers off: every flower at its full price."} On the website by ${clock(liveBy(change.at))}.`)
      setConfirmOff(false)
    } catch (err) {
      toast(messageOf(err), "error")
    } finally {
      setBusy(false)
    }
  }

  if (!sale) return null
  const on = sale.status === "active"
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <span>
          <span className="font-semibold">Offers</span>
          <span className="block text-sm text-ink-600">
            {on ? "Offer prices are showing, with the full price struck through." : "Off: every flower sells at its full price."}
          </span>
        </span>
        <Toggle checked={on} disabled={busy} onChange={(v) => (v ? set(true) : setConfirmOff(true))} label="Offers" />
      </div>
      {confirmOff && (
        <div className="flex flex-col gap-2 rounded-2xl border border-blush-600 p-3">
          <p>Switch every offer off? Offer prices are kept and come back when you switch them on again.</p>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmOff(false)}>
              Keep them on
            </Button>
            <Button variant="danger" className="flex-1" busy={busy} onClick={() => set(false)}>
              Switch off
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

export default function More() {
  const qc = useQueryClient()
  const me = useQuery({ queryKey: ["me"], queryFn: () => sdk.admin.user.me(), staleTime: Infinity })

  async function signOut() {
    await sdk.auth.logout().catch(() => undefined)
    qc.clear()
    window.location.assign("/")
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-6">
      <h1 className="font-display text-3xl font-semibold">More</h1>
      <ul className="flex flex-col divide-y divide-ink-100 rounded-2xl border border-ink-200 bg-white">
        {PAGES.map((p) => (
          <li key={p.to}>
            <Link to={p.to} className="flex min-h-[60px] items-center justify-between gap-3 px-4 py-2">
              <span>
                <span className="font-medium">{p.label}</span>
                <span className="block text-sm text-ink-600">{p.hint}</span>
              </span>
              <span aria-hidden className="text-ink-500">›</span>
            </Link>
          </li>
        ))}
      </ul>
      <OffersSwitch />
      <section className="flex flex-col gap-2 rounded-2xl border border-ink-200 bg-white p-4">
        <p className="text-[15px] text-ink-600">
          Signed in as <b className="text-ink-900">{me.data?.user.email}</b>
          {IS_STAGING ? " on the staging copy" : ""}.
        </p>
        <Button variant="secondary" onClick={signOut}>
          Sign out
        </Button>
        <a href={`${BACKEND}/app/orders`} target="_blank" rel="noreferrer" className="flex min-h-[44px] items-center justify-center text-[15px] text-ink-700 underline">
          Open the full admin (computer) ↗
        </a>
      </section>
    </div>
  )
}
