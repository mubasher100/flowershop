import { DEFAULT_LOGO, LOGO_METADATA_KEY } from "@admin-lib/brand-mark"
import { printGiftCards } from "@admin-lib/gift-card"
import { printOrderDocument } from "@admin-lib/print"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"

import { Button, Field, Sheet, cx, inputClass, toast } from "../components/ui"
import { messageOf } from "../lib/bulk"
import {
  ORDER_FIELDS,
  customerName,
  customerPhone,
  dayHeading,
  giftNotes,
  groupByDay,
  isPaid,
  livePayment,
  matchesOrder,
  meta,
  paidOf,
  refundedOf,
  stageOf,
  whatsappLink,
  type ShopOrder,
  type Stage,
} from "../lib/orders"
import { sdk } from "../lib/sdk"
import { KEYS, money } from "../lib/shop"

type Tab = "todo" | "sent" | "cancelled"

const STAGE_PILL: Record<Stage, { label: string; className: string }> = {
  new: { label: "New", className: "bg-blush-600 text-white" },
  confirmed: { label: "Confirmed", className: "bg-champagne-100 text-champagne-700" },
  sent: { label: "Sent", className: "bg-sage-100 text-sage-700" },
  cancelled: { label: "Cancelled", className: "bg-ink-100 text-ink-600" },
}

function useLogo() {
  const { data } = useQuery({ queryKey: ["store"], queryFn: () => sdk.admin.store.list(), staleTime: 5 * 60_000 })
  const url = data?.stores?.[0]?.metadata?.[LOGO_METADATA_KEY]
  return typeof url === "string" && url ? url : DEFAULT_LOGO
}

function useOrderActions(order: ShopOrder) {
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries({ queryKey: KEYS.orders })
  const onError = (fallback: string) => (e: unknown) => toast(messageOf(e) || fallback, "error")

  const confirm = useMutation({
    // An order update replaces metadata, so the whole object goes back with
    // the key added; sending the key alone would wipe the delivery details.
    mutationFn: () =>
      sdk.admin.order.update(order.id, {
        metadata: { ...(order.metadata ?? {}), shop_confirmed_at: new Date().toISOString() },
      }),
    onSuccess: () => {
      toast(`#${order.display_id} confirmed.`)
      refresh()
    },
    onError: onError("Could not confirm the order."),
  })
  const send = useMutation({
    mutationFn: () =>
      sdk.admin.order.createFulfillment(order.id, {
        items: (order.items ?? []).map((i) => ({ id: i.id, quantity: i.quantity })),
      }),
    onSuccess: () => {
      toast(`#${order.display_id} marked as sent.`)
      refresh()
    },
    onError: onError("Could not mark it sent."),
  })
  const markPaid = useMutation({
    mutationFn: () => {
      const p = livePayment(order)
      if (!p) throw new Error("This order has no payment to mark.")
      return sdk.admin.payment.capture(p.id, {})
    },
    onSuccess: () => {
      toast(`#${order.display_id} marked as paid.`)
      refresh()
    },
    onError: onError("Could not mark it paid."),
  })
  const cancel = useMutation({
    mutationFn: () => sdk.admin.order.cancel(order.id),
    onSuccess: () => {
      toast(isPaid(order) ? `#${order.display_id} cancelled and refunded.` : `#${order.display_id} cancelled.`)
      refresh()
    },
    onError: onError("Could not cancel the order."),
  })
  const refund = useMutation({
    mutationFn: (args: { amount: number; note: string }) => {
      const p = livePayment(order)
      if (!p) throw new Error("This order has no payment to refund.")
      return sdk.admin.payment.refund(p.id, { amount: args.amount, note: args.note || undefined })
    },
    onSuccess: (_d, args) => {
      toast(`Refund of ${money(args.amount)} sent for #${order.display_id}.`)
      refresh()
    },
    onError: onError("Could not refund."),
  })

  /** Confirm, opening the WhatsApp message inside the same tap. */
  const confirmAndMessage = () => {
    const href = whatsappLink(order)
    if (href) window.open(href, "_blank", "noopener")
    else toast("No phone number on this order. Confirmed without a message.")
    confirm.mutate()
  }

  return { confirm, send, markPaid, cancel, refund, confirmAndMessage, busy: confirm.isPending || send.isPending || markPaid.isPending || cancel.isPending }
}

function OrderCard({ order, logo, onOpen }: { order: ShopOrder; logo: string; onOpen: () => void }) {
  const stage = stageOf(order)
  const a = useOrderActions(order)
  const notes = giftNotes(order)
  const pill = STAGE_PILL[stage]
  const midnight = /11[:.]59/.test(meta(order, "delivery_window"))

  return (
    <li className={cx("flex flex-col gap-2 rounded-2xl border bg-white p-3", "border-ink-200", stage === "new" && "border-s-4 border-s-blush-600")}>
      <button type="button" onClick={onOpen} className="flex flex-col gap-1 text-start">
        <span className="flex items-center justify-between gap-2">
          <span className="font-semibold">
            #{order.display_id} · {customerName(order)}
          </span>
          <span className={cx("flex-none rounded-full px-2.5 py-0.5 text-xs font-semibold", pill.className)}>{pill.label}</span>
        </span>
        <span className="text-[15px] text-ink-700">
          {(order.items ?? []).map((i) => `${i.quantity}× ${i.title}`).join(", ") || "No items"}
        </span>
        <span className="text-sm text-ink-600">
          {[midnight ? "11:59 Midnight" : meta(order, "delivery_window"), meta(order, "delivery_area")].filter(Boolean).join(" · ")}
          {" · "}
          <b className="font-medium text-ink-900">{money(order.total)}</b>
          {stage !== "cancelled" && !isPaid(order) && <span className="ms-1 font-medium text-champagne-700">· not paid</span>}
        </span>
        {notes.map((n, i) => (
          <span key={i} className="line-clamp-2 text-sm italic text-ink-700">
            Card: “{n}”
          </span>
        ))}
      </button>
      {stage !== "cancelled" && (
        <div className="flex gap-2">
          {stage === "new" && (
            <Button className="flex-1" onClick={a.confirmAndMessage} busy={a.confirm.isPending} disabled={a.busy}>
              Confirm
            </Button>
          )}
          {stage === "confirmed" && (
            <Button className="flex-1" onClick={() => a.send.mutate()} busy={a.send.isPending} disabled={a.busy}>
              Mark sent
            </Button>
          )}
          <Button variant="secondary" onClick={() => printOrderDocument(order, "label", undefined, logo)}>
            Label
          </Button>
          {notes.length > 0 && (
            <Button
              variant="secondary"
              onClick={() => {
                if (printGiftCards(order, logo) === "blocked") toast("The print window was blocked. Allow pop-ups and try again.", "error")
              }}
            >
              Card
            </Button>
          )}
        </div>
      )}
    </li>
  )
}

function OrderSheet({ order, logo, onClose }: { order: ShopOrder | null; logo: string; onClose: () => void }) {
  return (
    <Sheet open={!!order} onClose={onClose} title={order ? `Order #${order.display_id}` : ""}>
      {order && <OrderDetail order={order} logo={logo} onClose={onClose} />}
    </Sheet>
  )
}

function OrderDetail({ order, logo, onClose }: { order: ShopOrder; logo: string; onClose: () => void }) {
  const a = useOrderActions(order)
  const stage = stageOf(order)
  const paid = isPaid(order)
  const remaining = Math.max(0, paidOf(order) - refundedOf(order))
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [refunding, setRefunding] = useState(false)
  const [amount, setAmount] = useState(String(remaining))
  const [note, setNote] = useState("")
  const wa = whatsappLink(order)
  const phone = customerPhone(order)

  const row = (label: string, value: string | null | undefined) =>
    value ? (
      <div className="flex justify-between gap-4 py-1.5">
        <dt className="text-ink-600">{label}</dt>
        <dd className="min-w-0 text-end font-medium [overflow-wrap:anywhere]">{value}</dd>
      </div>
    ) : null

  return (
    <div className="flex flex-col gap-5">
      <dl className="divide-y divide-ink-100 text-[15px]">
        {row("Status", STAGE_PILL[stage].label + (paid ? " · paid" : stage === "cancelled" ? "" : " · not paid"))}
        {row("Customer", customerName(order))}
        {row("Phone", phone)}
        {row("For", [meta(order, "recipient_name"), meta(order, "recipient_phone")].filter(Boolean).join(" · "))}
        {row("Delivery", [meta(order, "delivery_date") && dayHeading(meta(order, "delivery_date")), meta(order, "delivery_window")].filter(Boolean).join(" · "))}
        {row("Area", meta(order, "delivery_area"))}
        {row("Address", order.shipping_address?.address_1)}
        {row("Notes", meta(order, "delivery_notes"))}
        {row("Total", money(order.total))}
        {refundedOf(order) > 0 ? row("Refunded", money(refundedOf(order))) : null}
      </dl>

      <ul className="flex flex-col gap-1 rounded-xl bg-ink-50 p-3 text-[15px]">
        {(order.items ?? []).map((i) => (
          <li key={i.id}>
            {i.quantity}× {i.title}
            {i.variant_title && i.variant_title !== "One size" ? ` (${i.variant_title})` : ""}
          </li>
        ))}
      </ul>
      {giftNotes(order).map((n, i) => (
        <blockquote key={i} className="rounded-xl border border-dashed border-ink-300 p-3 italic">
          “{n}”
        </blockquote>
      ))}

      <div className="grid grid-cols-2 gap-2">
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="flex min-h-[44px] items-center justify-center rounded-xl border border-ink-200 bg-white font-medium">
            WhatsApp
          </a>
        )}
        {phone && (
          <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="flex min-h-[44px] items-center justify-center rounded-xl border border-ink-200 bg-white font-medium">
            Call
          </a>
        )}
        {meta(order, "location_url") && (
          <a href={meta(order, "location_url")} target="_blank" rel="noopener noreferrer" className="col-span-2 flex min-h-[44px] items-center justify-center rounded-xl border border-ink-200 bg-white font-medium">
            Open location in Maps
          </a>
        )}
        <Button variant="secondary" onClick={() => printOrderDocument(order, "label", undefined, logo)}>
          Print label
        </Button>
        <Button variant="secondary" onClick={() => printOrderDocument(order, "receipt", undefined, logo)}>
          Print receipt
        </Button>
      </div>

      {stage !== "cancelled" && !paid && livePayment(order) && (
        <Button variant="secondary" busy={a.markPaid.isPending} onClick={() => a.markPaid.mutate()}>
          Mark as paid
        </Button>
      )}

      {stage === "sent" && paid && remaining > 0 && !refunding && (
        <Button variant="secondary" onClick={() => setRefunding(true)}>
          Refund…
        </Button>
      )}
      {refunding && (
        <div className="flex flex-col gap-3 rounded-2xl border border-ink-200 p-3">
          <Field label="Amount to refund (QAR)" hint={`Up to ${money(remaining)}. Lower it for a partial refund.`}>
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Why (optional)">
            <input value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} placeholder="Arrived late" />
          </Field>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setRefunding(false)}>
              Back
            </Button>
            <Button
              className="flex-1"
              busy={a.refund.isPending}
              disabled={!(Number(amount) > 0 && Number(amount) <= remaining)}
              onClick={() => a.refund.mutate({ amount: Number(amount), note }, { onSuccess: () => setRefunding(false) })}
            >
              Refund {Number(amount) > 0 ? money(Number(amount)) : ""}
            </Button>
          </div>
        </div>
      )}

      {(stage === "new" || stage === "confirmed") &&
        (confirmCancel ? (
          <div className="flex flex-col gap-2 rounded-2xl border border-blush-600 p-3">
            <p>
              Cancel #{order.display_id}?{paid ? " The payment is refunded to the customer's card." : " The delivery slot becomes free again."}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmCancel(false)}>
                Keep it
              </Button>
              <Button variant="danger" className="flex-1" busy={a.cancel.isPending} onClick={() => a.cancel.mutate(undefined, { onSuccess: onClose })}>
                Cancel order
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" className="self-start text-blush-700" onClick={() => setConfirmCancel(true)}>
            Cancel this order
          </Button>
        ))}
    </div>
  )
}

export default function Orders() {
  const logo = useLogo()
  const [tab, setTab] = useState<Tab>("todo")
  const [query, setQuery] = useState("")
  const [openId, setOpenId] = useState<string | null>(null)

  const { data, isPending, error, refetch } = useQuery({
    queryKey: KEYS.orders,
    queryFn: () => sdk.client.fetch<{ orders: ShopOrder[] }>(`/admin/orders?limit=200&order=-created_at&fields=${ORDER_FIELDS}`),
    refetchInterval: 30_000,
  })
  const orders = data?.orders ?? []
  const found = orders.filter((o) => matchesOrder(o, query))
  const todo = found.filter((o) => ["new", "confirmed"].includes(stageOf(o)))
  const newCount = orders.filter((o) => stageOf(o) === "new").length
  const list = tab === "todo" ? todo : found.filter((o) => stageOf(o) === (tab === "sent" ? "sent" : "cancelled"))
  const groups = useMemo(() => (tab === "todo" ? groupByDay(list) : [["", list] as [string, ShopOrder[]]]), [tab, list])
  const open = orders.find((o) => o.id === openId) ?? null

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-20 flex flex-col gap-3 bg-blush-50/95 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <h1 className="font-display text-3xl font-semibold">Orders</h1>
          {newCount > 0 && <span className="rounded-full bg-blush-600 px-3 py-1 text-sm font-semibold text-white">{newCount} new</span>}
        </div>
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Order number, name or phone" aria-label="Search orders" className={inputClass} />
        <div role="tablist" aria-label="Orders" className="grid grid-cols-3 gap-2">
          {(
            [
              ["todo", `To do · ${todo.length}`],
              ["sent", "Sent"],
              ["cancelled", "Cancelled"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={cx("min-h-[40px] rounded-full border text-[15px]", tab === id ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 bg-white text-ink-700")}>
              {label}
            </button>
          ))}
        </div>
      </header>

      {error ? (
        <div className="m-4 flex flex-col gap-3 rounded-2xl bg-blush-100 p-4 text-blush-700">
          <p>Orders didn't load. Check the connection and try again.</p>
          <Button variant="secondary" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : isPending ? (
        <p className="p-6 text-center text-ink-600">Loading orders…</p>
      ) : list.length === 0 ? (
        <p className="p-6 text-center text-ink-600">
          {query ? `No orders match "${query}".` : tab === "todo" ? "Nothing to do. Every order has gone out." : "None yet."}
        </p>
      ) : (
        <div className="flex flex-col gap-4 px-3 pb-4">
          {groups.map(([day, group]) => (
            <section key={day || "all"} className="flex flex-col gap-2" aria-label={day ? dayHeading(day) : undefined}>
              {day && (
                <h2 className={cx("flex justify-between px-1 pt-1 text-sm font-semibold", dayHeading(day).startsWith("Overdue") ? "text-blush-700" : "text-ink-700")}>
                  <span>{dayHeading(day)}</span>
                  <span className="font-normal text-ink-600">{group.length}</span>
                </h2>
              )}
              <ul className="flex flex-col gap-2">
                {group.map((o) => (
                  <OrderCard key={o.id} order={o} logo={logo} onOpen={() => setOpenId(o.id)} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <OrderSheet order={open} logo={logo} onClose={() => setOpenId(null)} />
    </div>
  )
}
