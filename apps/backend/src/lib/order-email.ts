/**
 * The order confirmation email.
 *
 * Written here rather than in a provider's dashboard so it is reviewable in
 * code, translatable next to the rest of the copy, and cannot drift from what
 * the site actually promises.
 *
 * Deliberately plain HTML with inline styles and a single-column table: every
 * email client mangles something, and a layout that survives Outlook is worth
 * more than one that looks clever in Gmail. No images and no web fonts, so it
 * renders the same with remote content blocked — which is the default for a
 * lot of people.
 */

export type OrderEmailInput = {
  shopName: string
  orderNumber: number | string
  currencyCode: string
  total: number
  items: { title: string; quantity: number; total?: number }[]
  recipientName?: string | null
  deliveryArea?: string | null
  deliveryDate?: string | null
  deliveryWindow?: string | null
  giftNote?: string | null
  trackUrl?: string | null
  whatsapp?: string | null
  locale?: "en" | "ar"
}

const COPY = {
  en: {
    subject: (shop: string, n: string | number) => `${shop} — order #${n} confirmed`,
    heading: "Thank you for your order",
    intro: (shop: string) =>
      `We have your order and ${shop} will confirm the details with you on WhatsApp shortly.`,
    orderNumber: "Order number",
    delivery: "Delivery",
    deliveringTo: "Delivering to",
    giftMessage: "Your gift message",
    total: "Total",
    track: "Track your order",
    questions: "Any questions? Message us on WhatsApp.",
    footerNote:
      "You are receiving this because you placed an order. We do not send marketing email.",
  },
  ar: {
    subject: (shop: string, n: string | number) => `${shop} — تأكيد الطلب رقم ${n}`,
    heading: "شكراً لطلبك",
    intro: (shop: string) =>
      `استلمنا طلبك، وسيؤكد لك ${shop} التفاصيل عبر واتساب قريباً.`,
    orderNumber: "رقم الطلب",
    delivery: "التوصيل",
    deliveringTo: "التوصيل إلى",
    giftMessage: "رسالة الإهداء",
    total: "الإجمالي",
    track: "تتبع طلبك",
    questions: "لديك سؤال؟ راسلنا على واتساب.",
    footerNote:
      "وصلتك هذه الرسالة لأنك قدّمت طلباً. نحن لا نرسل رسائل تسويقية.",
  },
} as const

const esc = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  )

const money = (amount: number, currency: string) =>
  `${currency.toUpperCase()} ${Number(amount ?? 0).toFixed(2)}`

export function orderEmail(input: OrderEmailInput): {
  subject: string
  html: string
} {
  const locale = input.locale === "ar" ? "ar" : "en"
  const t = COPY[locale]
  const dir = locale === "ar" ? "rtl" : "ltr"

  const when = [input.deliveryDate, input.deliveryWindow].filter(Boolean).join(" · ")
  const rows = input.items
    .map(
      (i) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #ecdcd7;color:#2f1c19">
            ${esc(i.quantity)} × ${esc(i.title)}
          </td>
          <td align="${locale === "ar" ? "left" : "right"}" style="padding:8px 0;border-bottom:1px solid #ecdcd7;color:#2f1c19;white-space:nowrap">
            ${i.total != null ? esc(money(i.total, input.currencyCode)) : ""}
          </td>
        </tr>`
    )
    .join("")

  const line = (label: string, value: string) => `
    <tr>
      <td style="padding:4px 0;color:#8a7a75;font-size:13px">${esc(label)}</td>
      <!-- dir="ltr" on the value: dates, times and order numbers are
           left-to-right sequences even on an Arabic page, and without this
           "2026-09-25 · 11:59 PM" renders reversed. -->
      <td align="${locale === "ar" ? "left" : "right"}" dir="ltr" style="padding:4px 0;color:#2f1c19;font-size:13px">${esc(value)}</td>
    </tr>`

  const html = `<!doctype html>
<html lang="${locale}" dir="${dir}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 12px;background:#fff9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #ecdcd7;border-radius:4px">
    <tr><td style="padding:28px 28px 0">
      <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#8b4a38">${esc(input.shopName)}</div>
      <h1 style="margin:10px 0 0;font-size:24px;line-height:1.25;color:#2f1c19;font-weight:600">${esc(t.heading)}</h1>
      <p style="margin:10px 0 0;font-size:15px;line-height:1.55;color:#5d4741">${esc(t.intro(input.shopName))}</p>
    </td></tr>

    <tr><td style="padding:22px 28px 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${line(t.orderNumber, `#${input.orderNumber}`)}
        ${when ? line(t.delivery, when) : ""}
        ${input.deliveryArea ? line(t.deliveringTo, `${input.recipientName ? `${input.recipientName}, ` : ""}${input.deliveryArea}`) : ""}
      </table>
    </td></tr>

    <tr><td style="padding:18px 28px 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${rows}
        <tr>
          <td style="padding:12px 0 0;color:#2f1c19;font-weight:600">${esc(t.total)}</td>
          <td align="${locale === "ar" ? "left" : "right"}" style="padding:12px 0 0;color:#2f1c19;font-weight:600;white-space:nowrap">
            ${esc(money(input.total, input.currencyCode))}
          </td>
        </tr>
      </table>
    </td></tr>

    ${
      input.giftNote
        ? `<tr><td style="padding:18px 28px 0">
             <div style="padding:14px 16px;background:#fdf3f0;border-radius:3px">
               <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8b4a38">${esc(t.giftMessage)}</div>
               <div style="margin-top:6px;font-size:15px;font-style:italic;color:#2f1c19">&ldquo;${esc(input.giftNote)}&rdquo;</div>
             </div>
           </td></tr>`
        : ""
    }

    ${
      input.trackUrl
        ? `<tr><td style="padding:22px 28px 0">
             <a href="${esc(input.trackUrl)}" style="display:inline-block;padding:12px 22px;background:#963d50;color:#ffffff;text-decoration:none;border-radius:999px;font-size:15px;font-weight:600">${esc(t.track)}</a>
           </td></tr>`
        : ""
    }

    <tr><td style="padding:22px 28px 28px">
      <p style="margin:0;font-size:13px;line-height:1.5;color:#8a7a75">
        ${esc(t.questions)}${
          input.whatsapp
            ? ` <a href="https://wa.me/${esc(input.whatsapp)}" style="color:#7a2f40">+${esc(input.whatsapp)}</a>`
            : ""
        }
      </p>
      <p style="margin:10px 0 0;font-size:12px;line-height:1.5;color:#a89a96">${esc(t.footerNote)}</p>
    </td></tr>
  </table>
</body>
</html>`

  return { subject: t.subject(input.shopName, input.orderNumber), html }
}
