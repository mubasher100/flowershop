/**
 * The "new order" email the shop itself receives.
 *
 * The customer's confirmation (order-email.ts) is a thank-you; this is a
 * work order. It carries everything needed to make and deliver the flowers
 * without opening the admin: who to call, what to make, what to write on the
 * card, where it goes and when. The admin link is there for anything more.
 *
 * Same constraints as the customer email: inline styles, one column, no
 * images or web fonts, so it reads the same on a phone with remote content
 * blocked. English only — it goes to the shop, not the customer.
 */

export type OrderAlertInput = {
  shopName: string
  orderNumber: number | string
  currencyCode: string
  total: number
  /** The delivery fee, so the lines above the total add up to it. */
  delivery?: number
  customerName?: string | null
  customerPhone?: string | null
  customerEmail?: string | null
  items: {
    title: string
    size?: string | null
    quantity: number
    total?: number
    giftNote?: string | null
  }[]
  recipientName?: string | null
  recipientPhone?: string | null
  address?: string | null
  area?: string | null
  deliveryDate?: string | null
  deliveryWindow?: string | null
  deliveryMethod?: string | null
  notes?: string | null
  orderGiftNote?: string | null
  anonymous?: boolean
  demoPayment?: boolean
  adminUrl?: string | null
}

const esc = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

/** Prices are stored as-is in Medusa — 260 is 260.00, never 26000. */
const money = (amount: number, currency: string) =>
  `${currency.toUpperCase()} ${Number(amount || 0).toFixed(2)}`

const digits = (phone?: string | null) => (phone ?? "").replace(/\D/g, "")

const row = (label: string, value: string) =>
  value
    ? `<tr><td style="padding:4px 12px 4px 0;color:#6b5c60;font-size:14px;vertical-align:top;white-space:nowrap">${esc(
        label
      )}</td><td style="padding:4px 0;color:#1c1917;font-size:15px">${value}</td></tr>`
    : ""

export function orderAlertEmail(input: OrderAlertInput) {
  const cur = input.currencyCode || "qar"
  const when = [input.deliveryDate, input.deliveryWindow].filter(Boolean).join(", ")
  const midnight = /11[:.]59/.test(input.deliveryWindow ?? "")

  // The subject is what shows in a phone's notification, so it carries the
  // two things that decide what happens next: when it goes, and how much.
  const subject = `New order #${input.orderNumber} — ${
    when || "no delivery date"
  } — ${money(input.total, cur)}${midnight ? " — 11:59 MIDNIGHT" : ""}`

  // Phone numbers as WhatsApp links: the shop confirms every order there, so
  // one tap from the email opens the right chat.
  const waLink = (phone?: string | null, label?: string | null) => {
    const d = digits(phone)
    if (!d) return esc(label || phone || "")
    return `${esc(label ? `${label} · ` : "")}<a href="https://wa.me/${d}" style="color:#9d1d4a">${esc(phone)}</a>`
  }

  const cardNotes = [
    ...input.items.map((i) => (i.giftNote ?? "").trim()),
    (input.orderGiftNote ?? "").trim(),
  ].filter(Boolean)
  const cards = [...new Set(cardNotes)]

  const items = input.items
    .map(
      (i) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f1e4e8;font-size:15px;color:#1c1917">
          <strong>${esc(i.quantity)} × ${esc(i.title)}</strong>${
            i.size && i.size !== "One size"
              ? `<br/><span style="color:#6b5c60;font-size:13px">${esc(i.size)}</span>`
              : ""
          }
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #f1e4e8;font-size:15px;color:#1c1917;text-align:right;white-space:nowrap">${
          i.total != null ? money(i.total, cur) : ""
        }</td>
      </tr>`
    )
    .join("")

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#fff7f9">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff7f9">
<tr><td align="center" style="padding:20px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;font-family:Arial,Helvetica,sans-serif">
<tr><td style="padding:24px 24px 8px">
  <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#9d1d4a">${esc(
    input.shopName
  )} · new order</div>
  <div style="font-size:26px;font-weight:bold;color:#1c1917;margin-top:6px">Order #${esc(
    input.orderNumber
  )}</div>
  ${
    midnight
      ? `<div style="margin-top:10px;padding:8px 12px;background:#efe6fb;color:#4c1d95;border-radius:8px;font-size:14px;font-weight:bold">11:59 midnight surprise — goes out tonight, cannot slip to the morning</div>`
      : ""
  }
  ${
    input.demoPayment
      ? `<div style="margin-top:10px;padding:8px 12px;background:#fff1e6;color:#9a3412;border-radius:8px;font-size:14px">Demo payment — no money was taken. Confirm how the customer will pay.</div>`
      : ""
  }
</td></tr>

<tr><td style="padding:8px 24px">
  <table role="presentation" cellpadding="0" cellspacing="0">
    ${row("Deliver", esc(when || "No date given"))}
    ${row("Method", esc(input.deliveryMethod ?? ""))}
    ${row("To", waLink(input.recipientPhone, input.recipientName))}
    ${row("Address", esc([input.address, input.area].filter(Boolean).join(", ")))}
    ${row("Notes", esc(input.notes ?? ""))}
  </table>
</td></tr>

<tr><td style="padding:12px 24px 4px">
  <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#6b5c60">To make</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items}
    ${
      input.delivery
        ? `<tr><td style="padding:8px 0;border-bottom:1px solid #f1e4e8;font-size:15px;color:#1c1917">Delivery</td><td style="padding:8px 0;border-bottom:1px solid #f1e4e8;font-size:15px;color:#1c1917;text-align:right">${money(input.delivery, cur)}</td></tr>`
        : ""
    }
    <tr><td style="padding:10px 0;font-size:16px;font-weight:bold;color:#1c1917">Total</td>
        <td style="padding:10px 0;font-size:16px;font-weight:bold;color:#1c1917;text-align:right">${money(
          input.total,
          cur
        )}</td></tr>
  </table>
</td></tr>

${
  cards.length
    ? `<tr><td style="padding:8px 24px">
  <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#6b5c60">Card message${
    cards.length > 1 ? "s" : ""
  }${input.anonymous ? " — send anonymously, no sender name" : ""}</div>
  ${cards
    .map(
      (c) =>
        `<div style="margin-top:6px;padding:12px 14px;border:1px dashed #c9a0ae;border-radius:8px;font-family:Georgia,serif;font-style:italic;font-size:16px;color:#44262e;white-space:pre-wrap">“${esc(
          c
        )}”</div>`
    )
    .join("")}
</td></tr>`
    : ""
}

<tr><td style="padding:12px 24px">
  <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#6b5c60">Customer</div>
  <table role="presentation" cellpadding="0" cellspacing="0">
    ${row("Name", esc(input.customerName ?? ""))}
    ${row("Phone", waLink(input.customerPhone))}
    ${row(
      "Email",
      input.customerEmail
        ? `<a href="mailto:${esc(input.customerEmail)}" style="color:#9d1d4a">${esc(input.customerEmail)}</a>`
        : ""
    )}
  </table>
</td></tr>

${
  input.adminUrl
    ? `<tr><td style="padding:8px 24px 28px">
  <a href="${esc(input.adminUrl)}" style="display:inline-block;padding:12px 20px;background:#be185d;color:#ffffff;text-decoration:none;border-radius:999px;font-weight:bold;font-size:15px">Open the order</a>
</td></tr>`
    : ""
}
</table>
</td></tr></table>
</body></html>`

  return { subject, html }
}
