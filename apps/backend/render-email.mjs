import { orderEmail } from "./.medusa/server/src/lib/order-email.js"
import fs from "fs"
for (const locale of ["en", "ar"]) {
  const { subject, html } = orderEmail({
    shopName: "Tulips and Truffles",
    orderNumber: 21,
    currencyCode: "qar",
    total: 395,
    items: [{ title: "La Vie en Rose — Grandeur", quantity: 1, total: 345 }],
    recipientName: "Layla",
    deliveryArea: "The Pearl",
    deliveryDate: "2026-09-25",
    deliveryWindow: "11:59 PM",
    giftNote: "Happy birthday — see you at midnight.",
    trackUrl: "https://tulipsandtruffle.com/en-qa/track",
    whatsapp: "97451514161",
    locale,
  })
  fs.writeFileSync(`email-${locale}.html`, html)
  console.log(locale, "subject:", subject)
}
