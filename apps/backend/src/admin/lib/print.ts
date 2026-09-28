/**
 * Printable order paperwork.
 *
 * Two documents, for two different readers:
 *
 *   - the label goes on the box, so the courier and whoever opens the door
 *     need the recipient, the phone number and the address in that order of
 *     prominence — not the shop's branding;
 *   - the receipt goes to the person who paid, so it itemises what they bought
 *     and what it cost.
 *
 * Rendered into a new window rather than an admin route. A route renders
 * inside the dashboard shell, and hiding the sidebar, header and nav for print
 * with @media rules is fragile — one Medusa release moves a wrapper and the
 * florist gets a page of chrome. A standalone document prints what it says.
 */

import { DEFAULT_CARD_LOGO } from "./brand-mark"

export type PrintableItem = {
  title: string
  quantity: number
  unit_price?: number
  total?: number
  variant_title?: string | null
  metadata?: Record<string, unknown> | null
}

export type PrintableOrder = {
  display_id: number
  created_at: string
  currency_code: string
  subtotal?: number
  shipping_total?: number
  total?: number
  email?: string
  items?: PrintableItem[]
  metadata?: Record<string, unknown> | null
  shipping_methods?: { name?: string; amount?: number }[]
  /**
   * The real destination. Checkout writes the street into `address_1` and the
   * area into `city`; the order metadata only carries the area, so a label
   * built from metadata alone would send the courier to a district with no
   * street.
   */
  shipping_address?: {
    first_name?: string | null
    last_name?: string | null
    phone?: string | null
    address_1?: string | null
    city?: string | null
  } | null
}

const esc = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

/** Prices are stored as-is in Medusa — 260 is 260.00, never 26000. */
const money = (amount: number | undefined, currency: string) =>
  `${currency.toUpperCase()} ${Number(amount ?? 0).toFixed(2)}`

const meta = (order: PrintableOrder, key: string) => {
  const value = (order.metadata ?? {})[key]
  return typeof value === "string" ? value : ""
}

export const BASE_CSS = `
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 16mm;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    color: #1c1917;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  h1, h2, h3 { margin: 0; }
  .muted { color: #57534e; }
  .rule { border: 0; border-top: 1px solid #d6d3d1; margin: 6mm 0; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 10pt; color: #57534e; padding-bottom: 2mm; }
  td { padding: 2mm 0; vertical-align: top; font-size: 11pt; }
  .right { text-align: right; }
  .totals td { padding: 1.5mm 0; }
  .grand td { font-weight: 700; font-size: 13pt; padding-top: 3mm; }
  /* A dashed box reads as "cut here" without needing to say so. */
  .card {
    border: 1px dashed #a8a29e;
    border-radius: 3mm;
    padding: 6mm;
    margin-top: 6mm;
  }

  /* --- the gift card -----------------------------------------------------
     A6 landscape (148 x 105mm), which cuts cleanly out of A4 and fits a
     bouquet sleeve. Sized in mm so it comes off the printer at the size it
     says, whatever the browser's zoom is set to. */
  .giftcard {
    width: 148mm;
    height: 105mm;
    border: 1px dashed #c9a0ae;
    border-radius: 2mm;
    padding: 12mm 14mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    background: #fff7f9;
    box-sizing: border-box;
  }
  .giftcard-mark { width: 16mm; height: 16mm; margin-bottom: 5mm; }
  .giftcard-to {
    font-size: 9pt;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: #9d5b70;
    margin-bottom: 4mm;
  }
  /* Serif, because the print window has none of the site's fonts and a card
     set in the browser's default sans reads like a receipt. */
  .giftcard-note {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 15pt;
    font-style: italic;
    line-height: 1.7;
    color: #44262e;
    max-width: 108mm;
  }
  /* Set by giftCardHtml from how many lines the message will take. */
  .giftcard-note.roomy { font-size: 18pt; line-height: 1.75; }
  .giftcard-note.tight { font-size: 12pt; line-height: 1.5; }
  .giftcard-note.tightest { font-size: 10pt; line-height: 1.4; }
  .giftcard-from {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 12pt;
    color: #6b4048;
    margin-top: 6mm;
  }
  .giftcard-foot {
    margin-top: auto;
    padding-top: 6mm;
    font-size: 7.5pt;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: #b08a96;
  }
  .giftcard-meta { font-size: 8pt; margin-top: 4mm; }
  /* Several cards in one order print one per sheet, so no two cards have to be
     cut from the same page. */
  .giftcard-break { break-after: page; page-break-after: always; height: 0; }
  /* Nothing but the card goes on the page. */
  @media print {
    .giftcard-meta { display: none; }
  }

  @page { margin: 0; }
`

export function labelHtml(order: PrintableOrder, shopName: string) {
  const ship = order.shipping_address
  const recipient =
    meta(order, "recipient_name") ||
    [ship?.first_name, ship?.last_name].filter((p) => p && p !== "-").join(" ") ||
    meta(order, "contact_name")
  // The driver rings this from outside the building, so it is the
  // recipient's number — falling back to the buyer's only on older orders
  // placed before that field existed.
  const phone =
    meta(order, "recipient_phone") || ship?.phone || meta(order, "contact_phone")
  const instructions = meta(order, "delivery_notes")
  const area = ship?.city || meta(order, "delivery_area")
  const address = ship?.address_1 || ""
  const date = meta(order, "delivery_date")
  const window = meta(order, "delivery_window")
  const note = meta(order, "gift_note")
  // The buyer asked not to be named on the card or the label.
  const anonymous = meta(order, "anonymous_gift") === "true"

  return `
    <div style="display:flex;justify-content:space-between;align-items:baseline">
      <h2 style="font-size:13pt">${esc(shopName)}</h2>
      <span class="muted" style="font-size:12pt">Order #${esc(order.display_id)}</span>
    </div>
    <hr class="rule" />

    <div class="muted" style="font-size:10pt;letter-spacing:.08em;text-transform:uppercase">
      Deliver to
    </div>
    <!-- The name and number are what a courier reads at arm's length. -->
    <h1 style="font-size:26pt;line-height:1.15;margin-top:2mm">${esc(recipient) || "—"}</h1>
    <div style="font-size:18pt;margin-top:2mm" dir="ltr">${esc(phone) || "—"}</div>

    <div style="font-size:13pt;margin-top:5mm;line-height:1.45">
      ${esc(address) || ""}${address && area ? "<br/>" : ""}${esc(area)}
    </div>
    ${
      instructions
        ? `<div style="font-size:12pt;margin-top:3mm;line-height:1.4">
             <span class="muted">Instructions</span><br/><strong>${esc(instructions)}</strong>
           </div>`
        : ""
    }

    <hr class="rule" />

    <div style="display:flex;gap:12mm;font-size:13pt">
      <div><span class="muted">Date</span><br/><strong>${esc(date) || "—"}</strong></div>
      <div><span class="muted">Time</span><br/><strong>${esc(window) || "—"}</strong></div>
    </div>

    ${
      note
        ? `<div class="card">
             <div class="muted" style="font-size:9pt;letter-spacing:.08em;text-transform:uppercase">
               Gift message — cut out and enclose${anonymous ? " · send anonymously" : ""}
             </div>
             <div style="font-size:15pt;line-height:1.5;margin-top:3mm;font-style:italic">
               “${esc(note)}”
             </div>
           </div>`
        : ""
    }

    <div class="muted" style="margin-top:8mm;font-size:10pt">
      Fresh flowers — keep upright, out of direct sun.
    </div>
  `
}

/**
 * The gift card that goes in with the flowers.
 *
 * The message was already on the delivery label as a dashed cut-out box, which
 * is fine for getting the words to the florist and wrong as the thing the
 * recipient actually holds: it is cut from the same paper as a courier label
 * and carries no branding at all.
 *
 * This prints the message on its own, centred on an A6 card with the shop's
 * mark above it — one card per page, with a dashed edge to cut along. A6 is
 * half of A5 and a quarter of A4, so it cuts down cleanly from stock the shop
 * already has, and it fits the cellophane sleeve of a standard bouquet.
 *
 * `logoUrl` is the shop's uploaded logo when there is one, and the bundled
 * mark otherwise, so this is never unbranded.
 */
export function giftCardHtml(
  order: PrintableOrder,
  shopName: string,
  logoUrl: string
) {
  const anonymous = meta(order, "anonymous_gift") === "true"
  const from = meta(order, "contact_name")
  const recipient =
    meta(order, "recipient_name") ||
    [order.shipping_address?.first_name, order.shipping_address?.last_name]
      .filter((p) => p && p !== "-")
      .join(" ")

  /*
   * One card per message, not one per order.
   *
   * The gift message belongs to the line item on purpose — two bouquets in one
   * order can go to two different people with two different notes — so an
   * order can need several cards. Reading only the order's own metadata
   * printed one card and silently dropped the rest.
   */
  const fromItems = (order.items ?? [])
    .map((item) => ({
      note:
        typeof item.metadata?.gift_note === "string" ? item.metadata.gift_note : "",
      forItem: item.title,
    }))
    .filter((c) => c.note)

  const orderNote = meta(order, "gift_note")
  const cards = fromItems.length
    ? fromItems
    : orderNote
      ? [{ note: orderNote, forItem: "" }]
      : []

  if (!cards.length) {
    return `<p>This order has no gift message, so there is no card to print.</p>`
  }

  // Only worth naming which bouquet a card goes with when there is more than
  // one to confuse.
  const showItem = cards.length > 1

  return cards
    .map(({ note, forItem }) => {
      // Line breaks are the customer's own. A message typed over three short
      // lines is a poem or a list, and reflowing it into a paragraph loses the
      // shape the sender chose.
      const body = esc(note).replace(/\r?\n/g, "<br/>")

      /*
       * Set the message to fit the card rather than letting it run off the
       * bottom of one.
       *
       * The limit is 200 characters, which is about four lines of prose and
       * fits comfortably — but the same 200 characters as eight short lines
       * (a poem, a list of names) is twice the height, and a fixed size would
       * push the last line past the dashed edge with nothing to warn the
       * florist. Counting the lines the text will actually take is what
       * matters, not counting its characters.
       */
      const lines = note
        .split(/\r?\n/)
        .reduce((total, line) => total + Math.max(1, Math.ceil(line.length / 52)), 0)
      const size = lines <= 3 ? "roomy" : lines <= 5 ? "" : lines <= 8 ? "tight" : "tightest"

      return `
    <div class="giftcard">
      <img class="giftcard-mark" src="${esc(logoUrl)}" alt="${esc(shopName)}" />

      ${recipient ? `<div class="giftcard-to">For ${esc(recipient)}</div>` : ""}

      <div class="giftcard-note ${size}">${body}</div>

      ${
        anonymous
          ? `<div class="giftcard-from">— a secret admirer</div>`
          : from
            ? `<div class="giftcard-from">— ${esc(from)}</div>`
            : ""
      }

      <div class="giftcard-foot">${esc(shopName)} &middot; tulipsandtruffle.com</div>
    </div>
    <div class="giftcard-meta muted">
      Order #${esc(order.display_id)} — cut along the dashed line.${
        showItem && forItem ? ` Goes with: ${esc(forItem)}.` : ""
      }${anonymous ? " The sender asked to stay anonymous." : ""}
    </div>
  `
    })
    .join('<div class="giftcard-break"></div>')
}

export function receiptHtml(order: PrintableOrder, shopName: string) {
  const currency = order.currency_code || "qar"
  const rows = (order.items ?? [])
    .map((item) => {
      const gift =
        typeof item.metadata?.gift_note === "string" ? item.metadata.gift_note : ""
      const extras = [
        item.variant_title,
        gift ? `“${gift}”` : "",
      ]
        .filter(Boolean)
        .join(" · ")

      return `
        <tr>
          <td>
            ${esc(item.title)}
            ${extras ? `<div class="muted" style="font-size:10pt">${esc(extras)}</div>` : ""}
          </td>
          <td class="right">${item.quantity}</td>
          <td class="right">${money(item.total ?? (item.unit_price ?? 0) * item.quantity, currency)}</td>
        </tr>`
    })
    .join("")

  const shipping =
    order.shipping_total ?? order.shipping_methods?.[0]?.amount ?? 0

  /**
   * Goods are summed from the lines rather than read from `order.subtotal`.
   *
   * On a real order that field came back as 275 for a single 225 item with 50
   * delivery — it already included shipping. Printed as "Subtotal 275" above
   * "Delivery 50" against a total of 275, the receipt contradicted itself.
   * The line items are unambiguous, and `total` is what was actually charged.
   */
  const goods = (order.items ?? []).reduce(
    (sum, i) => sum + (i.total ?? (i.unit_price ?? 0) * i.quantity),
    0
  )

  // Anything left over is a discount or an adjustment. Showing it as its own
  // line is better than three numbers that do not add up.
  const adjustment = (order.total ?? goods + shipping) - goods - shipping

  return `
    <div style="display:flex;justify-content:space-between;align-items:baseline">
      <h1 style="font-size:20pt">${esc(shopName)}</h1>
      <div class="right">
        <div style="font-size:13pt"><strong>Order #${esc(order.display_id)}</strong></div>
        <div class="muted" style="font-size:10pt">
          ${esc(new Date(order.created_at).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }))}
        </div>
      </div>
    </div>

    <hr class="rule" />

    <div style="display:flex;gap:14mm;font-size:11pt">
      <div>
        <div class="muted" style="font-size:9pt;text-transform:uppercase;letter-spacing:.08em">Billed to</div>
        <div style="margin-top:1.5mm">${esc(meta(order, "contact_name")) || esc(order.email) || "—"}</div>
        <div dir="ltr">${esc(meta(order, "contact_phone"))}</div>
      </div>
      <div>
        <div class="muted" style="font-size:9pt;text-transform:uppercase;letter-spacing:.08em">Delivery</div>
        <div style="margin-top:1.5mm">${esc(meta(order, "recipient_name")) || "—"}</div>
        <div dir="ltr">${esc(meta(order, "recipient_phone"))}</div>
        <div>${esc(order.shipping_address?.address_1 ?? "")}</div>
        <div>${esc(order.shipping_address?.city || meta(order, "delivery_area"))}</div>
        <div>${esc(meta(order, "delivery_date"))} ${esc(meta(order, "delivery_window"))}</div>
      </div>
    </div>

    <hr class="rule" />

    <table>
      <thead>
        <tr><th>Item</th><th class="right">Qty</th><th class="right">Amount</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <hr class="rule" />

    <table class="totals" style="width:70mm;margin-left:auto">
      <tr><td class="muted">Items</td><td class="right">${money(goods, currency)}</td></tr>
      <tr><td class="muted">Delivery</td><td class="right">${money(shipping, currency)}</td></tr>
      ${
        Math.abs(adjustment) > 0.005
          ? `<tr><td class="muted">${adjustment < 0 ? "Discount" : "Adjustment"}</td>
             <td class="right">${money(adjustment, currency)}</td></tr>`
          : ""
      }
      <tr class="grand"><td>Total</td><td class="right">${money(order.total ?? goods + shipping, currency)}</td></tr>
    </table>

    ${
      meta(order, "payment_reference")
        ? `<p class="muted" style="font-size:9pt;margin-top:8mm">
             Reference ${esc(meta(order, "payment_reference"))} — simulated payment, no funds were taken.
           </p>`
        : `<p class="muted" style="font-size:10pt;margin-top:8mm">
             Payment is confirmed with you on WhatsApp. Nothing is charged online.
           </p>`
    }

    <p class="muted" style="font-size:10pt;margin-top:2mm">Thank you for your order.</p>
  `
}

export type DocKind = "label" | "receipt" | "gift-card"

/**
 * Opens the document in a new window and triggers the print dialog.
 *
 * Returns false when the browser blocked the popup, so the caller can say so
 * rather than leaving the florist tapping a button that appears to do nothing.
 */
export const SHOP_NAME = "Tulips and Truffles"

export function printOrderDocument(
  order: PrintableOrder,
  kind: DocKind,
  shopName = SHOP_NAME,
  /** The shop's uploaded logo. Falls back to the bundled mark. */
  logoUrl: string = DEFAULT_CARD_LOGO
): boolean {
  const heading = { label: "Label", receipt: "Receipt", "gift-card": "Gift card" }[
    kind
  ]
  const title = `${heading} — Order #${order.display_id}`

  const bodyHtml =
    kind === "label"
      ? labelHtml(order, shopName)
      : kind === "gift-card"
        ? giftCardHtml(order, shopName, logoUrl)
        : receiptHtml(order, shopName)

  const win = window.open("", "_blank", "width=820,height=1000")
  if (!win) return false

  win.document.write(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>
  <style>${BASE_CSS}</style>
</head>
<body>
  ${bodyHtml}
  <script>
    // Wait a tick so layout settles before the dialog measures the page.
    window.addEventListener("load", function () { setTimeout(function () { window.print() }, 150) })
  <\/script>
</body>
</html>`)
  win.document.close()
  return true
}
