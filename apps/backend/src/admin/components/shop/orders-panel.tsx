import {
  ArrowUturnLeft,
  ChatBubbleLeftRight,
  CheckCircle,
  CurrencyDollar,
  DocumentText,
  EllipsisHorizontal,
  Tag,
  XCircle,
} from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Drawer,
  DropdownMenu,
  Heading,
  IconButton,
  Input,
  Label,
  Prompt,
  Tabs,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import { printOrderDocument, SHOP_NAME } from "../../lib/print"
import { sdk } from "../../lib/sdk"
import { useLabelLogo } from "../../lib/use-label-logo"
import {
  isPaid,
  livePayment,
  meta,
  money,
  ORDER_FIELDS,
  ORDERS_KEY,
  paidOf,
  refundedOf,
  stageOf,
  type ShopOrder,
  type Stage,
} from "./shared"

const errorText = (e: unknown, fallback: string) =>
  e instanceof Error && e.message ? e.message : fallback

/** Sorts two-hour windows by when they start; 11:59 goes last. */
function windowRank(window: string): number {
  if (!window) return 99
  if (/11[:.]59/.test(window)) return 98
  const m = window.match(/^(\d{1,2})\s*(am|pm)/i)
  if (!m) return 97
  const h = Number(m[1]) % 12
  return /pm/i.test(m[2]) ? h + 12 : h
}

/** "Today", "Tomorrow", or a date a person can read at a glance. */
function dayHeading(date: string, today: string): string {
  if (date === "unscheduled") return "No delivery date"
  const d = new Date(`${date}T12:00:00Z`)
  const t = new Date(`${today}T12:00:00Z`)
  const days = Math.round((d.getTime() - t.getTime()) / 86400000)
  const pretty = d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
  })
  if (days === 0) return `Today — ${pretty}`
  if (days === 1) return `Tomorrow — ${pretty}`
  if (days < 0) return `Overdue — ${pretty}`
  return pretty
}

/**
 * The "we've got your order" message, ready to send.
 *
 * The shop promises at checkout that it will confirm on WhatsApp, so this
 * writes that message and opens the chat — one tap instead of copying six
 * fields out of the order by hand.
 */
function whatsappLink(order: ShopOrder) {
  const to = (meta(order, "contact_phone") || order.shipping_address?.phone || "").replace(
    /\D/g,
    ""
  )
  if (!to) return null

  const items = (order.items ?? []).map((i) => `• ${i.quantity} × ${i.title}`).join("\n")
  const when = [meta(order, "delivery_date"), meta(order, "delivery_window")]
    .filter(Boolean)
    .join(", ")
  const name = meta(order, "contact_name")

  const lines = [
    `Hello${name ? " " + name : ""}, this is ${SHOP_NAME}.`,
    "",
    `Your order #${order.display_id} is confirmed:`,
    items,
    when ? `Delivery: ${when}` : "",
    meta(order, "delivery_area") ? `Area: ${meta(order, "delivery_area")}` : "",
    meta(order, "recipient_name") ? `For: ${meta(order, "recipient_name")}` : "",
    "",
    "We will message you again when it is on its way. Thank you!",
  ].filter((l) => l !== "")

  return `https://wa.me/${to}?text=${encodeURIComponent(lines.join("\n"))}`
}

const STAGE_BADGE: Record<Stage, { label: string; color: "blue" | "purple" | "green" | "grey" }> = {
  new: { label: "New", color: "blue" },
  confirmed: { label: "Confirmed", color: "purple" },
  sent: { label: "Sent", color: "green" },
  cancelled: { label: "Cancelled", color: "grey" },
}

/* -------------------------------------------------------------- Refund */

function RefundDrawer({
  order,
  onClose,
}: {
  order: ShopOrder
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const remaining = Math.max(0, paidOf(order) - refundedOf(order))
  const [amount, setAmount] = useState(String(remaining))
  const [note, setNote] = useState("")

  const refund = useMutation({
    mutationFn: () => {
      const payment = livePayment(order)
      if (!payment) throw new Error("This order has no payment to refund.")
      return sdk.admin.payment.refund(payment.id, {
        amount: Number(amount),
        note: note.trim() || undefined,
      })
    },
    onSuccess: () => {
      toast.success(`Refund of ${money(Number(amount))} recorded on #${order.display_id}.`)
      queryClient.invalidateQueries({ queryKey: ORDERS_KEY })
      onClose()
    },
    onError: (e) => toast.error(errorText(e, "Could not record the refund.")),
  })

  const value = Number(amount)
  const valid = value > 0 && value <= remaining

  return (
    <Drawer open onOpenChange={(o) => !o && onClose()}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>Refund order #{order.display_id}</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-5 p-4">
          <Text size="small" className="text-ui-fg-subtle">
            Paid {money(paidOf(order))}
            {refundedOf(order) > 0 ? `, already refunded ${money(refundedOf(order))}` : ""}.
            Up to {money(remaining)} can be refunded.
          </Text>

          <div className="flex flex-col gap-2">
            <Label size="small" weight="plus" htmlFor="refund-amount">
              Amount to refund (QAR)
            </Label>
            <Input
              id="refund-amount"
              type="number"
              inputMode="decimal"
              min={1}
              max={remaining}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Text size="xsmall" className="text-ui-fg-muted">
              The full amount is filled in. Lower it for a partial refund —
              say, for a late delivery.
            </Text>
          </div>

          <div className="flex flex-col gap-2">
            <Label size="small" weight="plus" htmlFor="refund-note">
              Why{" "}
              <span className="text-ui-fg-muted font-normal">(optional, for your records)</span>
            </Label>
            <Textarea
              id="refund-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Arrived late"
            />
          </div>

          {/* Honest about what this does today. The manual payment provider
              records a refund; it cannot move money it never collected. */}
          <div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3">
            <Text size="small" className="text-ui-fg-subtle">
              Until card payments are switched on, this <strong>records</strong> the
              refund — send the money back yourself, by bank transfer or cash.
            </Text>
          </div>
        </Drawer.Body>
        <Drawer.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <Drawer.Close asChild>
              <Button size="small" variant="secondary">
                Cancel
              </Button>
            </Drawer.Close>
            <Button
              size="small"
              onClick={() => refund.mutate()}
              disabled={!valid || refund.isPending}
              isLoading={refund.isPending}
            >
              Refund {valid ? money(value) : ""}
            </Button>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}

/* ---------------------------------------------------------- Order card */

function OrderCard({
  order,
  logo,
  onRefund,
  onCancel,
}: {
  order: ShopOrder
  logo: string
  onRefund: (o: ShopOrder) => void
  onCancel: (o: ShopOrder) => void
}) {
  const queryClient = useQueryClient()
  const stage = stageOf(order)
  const paid = isPaid(order)
  const refundable = paidOf(order) - refundedOf(order) > 0
  const refresh = () => queryClient.invalidateQueries({ queryKey: ORDERS_KEY })

  const confirm = useMutation({
    mutationFn: () =>
      sdk.admin.order.update(order.id, {
        // The whole object is sent back: an update replaces metadata, and the
        // delivery date, recipient and gift message all live in it.
        metadata: { ...(order.metadata ?? {}), shop_confirmed_at: new Date().toISOString() },
      }),
    onSuccess: () => {
      toast.success(`#${order.display_id} confirmed.`)
      refresh()
    },
    onError: (e) => toast.error(errorText(e, "Could not confirm the order.")),
  })

  const send = useMutation({
    mutationFn: () =>
      sdk.admin.order.createFulfillment(order.id, {
        items: (order.items ?? []).map((i) => ({ id: i.id, quantity: i.quantity })),
      }),
    onSuccess: () => {
      toast.success(`#${order.display_id} marked as sent.`)
      refresh()
    },
    onError: (e) => toast.error(errorText(e, "Could not update the order.")),
  })

  const markPaid = useMutation({
    mutationFn: () => {
      const payment = livePayment(order)
      if (!payment) throw new Error("This order has no payment to mark.")
      return sdk.admin.payment.capture(payment.id, {})
    },
    onSuccess: () => {
      toast.success(`#${order.display_id} marked as paid.`)
      refresh()
    },
    onError: (e) => toast.error(errorText(e, "Could not mark it paid.")),
  })

  const confirmAndMessage = () => {
    // Open the chat first, synchronously inside the click — a window opened
    // after an await is treated as a popup and blocked.
    const href = whatsappLink(order)
    if (href) window.open(href, "_blank", "noopener")
    else toast.info("No phone number on this order — confirmed without a message.")
    confirm.mutate()
  }

  const busy = confirm.isPending || send.isPending || markPaid.isPending
  const badge = STAGE_BADGE[stage]

  return (
    <div className="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-start md:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Text size="small" leading="compact" weight="plus">
            #{order.display_id}
          </Text>
          <Badge size="2xsmall" color={badge.color}>
            {badge.label}
          </Badge>
          {stage !== "cancelled" && (
            <Badge size="2xsmall" color={paid ? "green" : "orange"}>
              {order.payment_status === "refunded"
                ? "refunded"
                : order.payment_status === "partially_refunded"
                  ? "part refunded"
                  : paid
                    ? "paid"
                    : "not paid yet"}
            </Badge>
          )}
          {meta(order, "delivery_window") === "11:59 PM" && (
            <Badge size="2xsmall" color="purple">
              11:59 midnight
            </Badge>
          )}
          {meta(order, "payment_reference") && (
            <Badge size="2xsmall" color="grey">
              demo payment
            </Badge>
          )}
        </div>

        <Text size="small" leading="compact">
          {meta(order, "contact_name") || "Guest"}
          {meta(order, "contact_phone") ? ` · ${meta(order, "contact_phone")}` : ""}
        </Text>

        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          {(order.items ?? []).map((i) => `${i.quantity}× ${i.title}`).join(", ") || "No items"}
        </Text>

        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          {[meta(order, "delivery_area"), meta(order, "delivery_date"), meta(order, "delivery_window")]
            .filter(Boolean)
            .join(" · ")}
          {meta(order, "recipient_name") ? ` · for ${meta(order, "recipient_name")}` : ""}
          {meta(order, "recipient_phone") ? ` (${meta(order, "recipient_phone")})` : ""}
        </Text>

        {meta(order, "delivery_notes") && (
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            Note: {meta(order, "delivery_notes")}
          </Text>
        )}
      </div>

      <div className="flex flex-none flex-wrap items-center gap-2">
        <Text size="small" leading="compact" weight="plus" className="me-1">
          {money(order.total, order.currency_code)}
        </Text>

        {/* The one thing to do next, as the only filled button. */}
        {stage === "new" && (
          <Button size="small" onClick={confirmAndMessage} disabled={busy} isLoading={confirm.isPending}>
            <CheckCircle />
            Confirm
          </Button>
        )}
        {stage === "confirmed" && (
          <Button size="small" onClick={() => send.mutate()} disabled={busy} isLoading={send.isPending}>
            <CheckCircle />
            Mark sent
          </Button>
        )}

        {stage !== "cancelled" && (
          <Button
            size="small"
            variant="secondary"
            onClick={() => printOrderDocument(order, "label", undefined, logo)}
          >
            <Tag />
            Label
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenu.Trigger asChild>
            <IconButton size="small" variant="transparent" aria-label={`More for order #${order.display_id}`}>
              <EllipsisHorizontal />
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end">
            <DropdownMenu.Item
              className="gap-x-2"
              onClick={() => printOrderDocument(order, "receipt", undefined, logo)}
            >
              <DocumentText className="text-ui-fg-subtle" />
              Print receipt
            </DropdownMenu.Item>
            {whatsappLink(order) && (
              <DropdownMenu.Item
                className="gap-x-2"
                onClick={() => window.open(whatsappLink(order)!, "_blank", "noopener")}
              >
                <ChatBubbleLeftRight className="text-ui-fg-subtle" />
                Message on WhatsApp
              </DropdownMenu.Item>
            )}
            {stage !== "cancelled" && !paid && livePayment(order) && (
              <DropdownMenu.Item className="gap-x-2" onClick={() => markPaid.mutate()}>
                <CurrencyDollar className="text-ui-fg-subtle" />
                Mark as paid
              </DropdownMenu.Item>
            )}
            {/* Before it goes out, cancelling handles the money itself —
                Medusa refunds a paid order as part of the cancel. After, it
                cannot be cancelled, only refunded. */}
            {stage === "sent" && paid && refundable && (
              <DropdownMenu.Item className="gap-x-2" onClick={() => onRefund(order)}>
                <ArrowUturnLeft className="text-ui-fg-subtle" />
                Refund
              </DropdownMenu.Item>
            )}
            {(stage === "new" || stage === "confirmed") && (
              <>
                <DropdownMenu.Separator />
                <DropdownMenu.Item className="gap-x-2" onClick={() => onCancel(order)}>
                  <XCircle className="text-ui-fg-subtle" />
                  Cancel order
                </DropdownMenu.Item>
              </>
            )}
          </DropdownMenu.Content>
        </DropdownMenu>
      </div>
    </div>
  )
}

/* --------------------------------------------------------------- Panel */

export default function OrdersPanel() {
  const queryClient = useQueryClient()
  const { logo } = useLabelLogo()
  const [refunding, setRefunding] = useState<ShopOrder | null>(null)
  const [cancelling, setCancelling] = useState<ShopOrder | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ORDERS_KEY,
    queryFn: () =>
      sdk.client.fetch<{ orders: ShopOrder[] }>(
        `/admin/orders?limit=100&order=-created_at&fields=${ORDER_FIELDS}`
      ),
    // New orders arrive while this screen is open all morning.
    refetchInterval: 60_000,
  })

  const cancel = useMutation({
    mutationFn: (o: ShopOrder) => sdk.admin.order.cancel(o.id),
    onSuccess: (_d, o) => {
      toast.success(
        isPaid(o)
          ? `#${o.display_id} cancelled and its payment refunded.`
          : `#${o.display_id} cancelled. The delivery slot is free again.`
      )
      queryClient.invalidateQueries({ queryKey: ORDERS_KEY })
      setCancelling(null)
    },
    onError: (e) => toast.error(errorText(e, "Could not cancel the order.")),
  })

  const orders = data?.orders ?? []
  const todo = orders.filter((o) => ["new", "confirmed"].includes(stageOf(o)))
  const sent = orders.filter((o) => stageOf(o) === "sent")
  const cancelled = orders.filter((o) => stageOf(o) === "cancelled")
  const newCount = todo.filter((o) => stageOf(o) === "new").length

  /*
   * To-do orders are grouped by the day they go out, soonest first, earliest
   * window first within a day. A florist works tomorrow's run, not the order
   * in which people happened to click "buy".
   */
  const byDay = new Map<string, ShopOrder[]>()
  for (const o of todo) {
    const key = meta(o, "delivery_date") || "unscheduled"
    if (!byDay.has(key)) byDay.set(key, [])
    byDay.get(key)!.push(o)
  }
  const dayGroups = [...byDay.entries()].sort(([a], [b]) =>
    a === "unscheduled" ? 1 : b === "unscheduled" ? -1 : a.localeCompare(b)
  )
  for (const [, group] of dayGroups) {
    group.sort(
      (x, y) => windowRank(meta(x, "delivery_window")) - windowRank(meta(y, "delivery_window"))
    )
  }
  const todayQa = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Qatar" })

  const card = (o: ShopOrder) => (
    <OrderCard key={o.id} order={o} logo={logo} onRefund={setRefunding} onCancel={setCancelling} />
  )

  const empty = (text: string) => (
    <div className="px-6 py-8">
      <Text size="small" className="text-ui-fg-subtle">
        {text}
      </Text>
    </div>
  )

  return (
    <Container className="p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div>
          <Heading level="h2">Orders</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Confirm each new order on WhatsApp, then mark it sent when the
            courier has it.
          </Text>
        </div>
        {newCount > 0 && (
          <Badge size="small" color="blue">
            {newCount} new
          </Badge>
        )}
      </div>

      <Tabs defaultValue="todo">
        <Tabs.List className="px-6">
          <Tabs.Trigger value="todo">To do ({todo.length})</Tabs.Trigger>
          <Tabs.Trigger value="sent">Sent</Tabs.Trigger>
          <Tabs.Trigger value="cancelled">Cancelled</Tabs.Trigger>
        </Tabs.List>

        <div className="mt-2 border-t border-ui-border-base">
          {isLoading ? (
            empty("Loading orders…")
          ) : (
            <>
              <Tabs.Content value="todo">
                {todo.length === 0
                  ? empty("Nothing to do. Every order has gone out.")
                  : dayGroups.map(([day, group]) => (
                      <div key={day}>
                        <div className="flex items-center justify-between bg-ui-bg-subtle px-6 py-2">
                          <Text size="small" weight="plus">
                            {dayHeading(day, todayQa)}
                          </Text>
                          <Text size="small" className="text-ui-fg-subtle">
                            {group.length} order{group.length === 1 ? "" : "s"}
                          </Text>
                        </div>
                        <div className="divide-y">{group.map(card)}</div>
                      </div>
                    ))}
              </Tabs.Content>
              <Tabs.Content value="sent">
                <div className="divide-y">
                  {sent.length === 0 ? empty("Nothing sent yet.") : sent.map(card)}
                </div>
              </Tabs.Content>
              <Tabs.Content value="cancelled">
                <div className="divide-y">
                  {cancelled.length === 0 ? empty("No cancelled orders.") : cancelled.map(card)}
                </div>
              </Tabs.Content>
            </>
          )}
        </div>
      </Tabs>

      {refunding && <RefundDrawer order={refunding} onClose={() => setRefunding(null)} />}

      <Prompt open={!!cancelling} onOpenChange={(o) => !o && setCancelling(null)}>
        <Prompt.Content>
          <Prompt.Header>
            <Prompt.Title>Cancel order #{cancelling?.display_id}?</Prompt.Title>
            <Prompt.Description>
              {cancelling && isPaid(cancelling)
                ? `The ${money(paidOf(cancelling))} payment is refunded and the delivery slot is freed. This cannot be undone.`
                : "The customer is not charged and the delivery slot is freed. This cannot be undone."}
            </Prompt.Description>
          </Prompt.Header>
          <Prompt.Footer>
            <Prompt.Cancel>Keep the order</Prompt.Cancel>
            <Prompt.Action onClick={() => cancelling && cancel.mutate(cancelling)}>
              Cancel order
            </Prompt.Action>
          </Prompt.Footer>
        </Prompt.Content>
      </Prompt>
    </Container>
  )
}
