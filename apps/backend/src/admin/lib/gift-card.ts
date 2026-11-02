/**
 * The printed gift card: 8 × 12 cm, logo on one side, the message on the other.
 *
 * Built to the shop's spec (2 Nov 2026):
 *   - the card stock is 80 × 120 mm and goes into the printer upright
 *     (portrait), but the card is designed and read landscape, so every side
 *     is laid out 120 × 80 mm and turned a quarter turn onto the page;
 *   - the message grows or shrinks to fill its side — "Happy birthday" prints
 *     large, a paragraph prints small, and neither runs off the card;
 *   - one card per message: the note belongs to the bouquet, and two bouquets
 *     in one order can go to two people.
 *
 * Each card is two pages, logo first and message second, so a duplex printer
 * prints both sides of one card in one pass, and a single-sided one prints
 * the logos to be turned over and fed again.
 *
 * If the printer turns everything upside down, change ROTATE to -90.
 */

import { DEFAULT_LOGO } from "./brand-mark"
import type { PrintableOrder } from "./print"

const ROTATE = 90

const esc = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

/** Every distinct card message on the order: each bouquet's, then the order's. */
export function cardMessages(order: PrintableOrder): string[] {
  const fromItems = (order.items ?? []).map((i) =>
    typeof i.metadata?.gift_note === "string" ? i.metadata.gift_note.trim() : ""
  )
  const orderNote =
    typeof order.metadata?.gift_note === "string" ? order.metadata.gift_note.trim() : ""
  return [...new Set([...fromItems, orderNote].filter(Boolean))]
}

const side = (inner: string) => `<section class="page"><div class="card">${inner}</div></section>`

/**
 * Opens the cards with the print dialog up. "none" when the order carries no
 * message, "blocked" when the browser stopped the window.
 */
export function printGiftCards(
  order: PrintableOrder,
  logoUrl: string = DEFAULT_LOGO
): "printed" | "blocked" | "none" {
  const messages = cardMessages(order)
  if (!messages.length) return "none"

  const pages = messages
    .map(
      (message) =>
        side(`<img class="logo" src="${esc(logoUrl)}" alt="" />`) +
        // dir="auto" so an Arabic message sets right to left on its own.
        side(`<p class="message" dir="auto">${esc(message)}</p>`)
    )
    .join("")

  const win = window.open("", "_blank", "width=700,height=900")
  if (!win) return "blocked"

  win.document.write(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Gift card — Order #${esc(order.display_id)}</title>
  <!-- Cormorant Garamond is the storefront's display face; Noto Naskh Arabic
       carries Arabic messages, which Cormorant has no letters for. -->
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,500&family=Noto+Naskh+Arabic:wght@500&display=swap" />
  <style>
    @page { size: 80mm 120mm; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { background: #fff; }
    .page {
      position: relative; width: 80mm; height: 120mm; overflow: hidden;
      page-break-after: always; break-after: page;
    }
    .page:last-child { page-break-after: auto; break-after: auto; }
    /* Laid out landscape, then turned onto the upright page. */
    .card {
      position: absolute; top: 0; left: 0; width: 120mm; height: 80mm;
      transform-origin: top left;
      transform: ${ROTATE === 90 ? "translateX(80mm) rotate(90deg)" : "translateY(120mm) rotate(-90deg)"};
      display: flex; align-items: center; justify-content: center;
      padding: 9mm 11mm;
    }
    .logo { max-width: 70mm; max-height: 50mm; object-fit: contain; }
    .message {
      width: 100%; max-height: 100%; overflow: hidden; text-align: center;
      white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.25;
      color: #2b1d22;
      font-family: "Cormorant Garamond", "Noto Naskh Arabic", Georgia, serif;
      font-style: italic; font-weight: 500;
    }
    .message:dir(rtl) { font-style: normal; }
  </style>
</head>
<body>
  ${pages}
  <script>
    // Fit each message to its side: the largest size, up to 30pt, at which
    // it still fits. Runs after the fonts arrive, because the fallback face
    // measures differently and would leave the real one overflowing.
    function fit(el) {
      // The card's inner area: its height less the padding that keeps text
      // clear of the edge. (The quarter turn does not change layout sizes.)
      var box = el.parentElement, cs = getComputedStyle(box)
      var maxH = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 1
      var lo = 8, hi = 30
      while (hi - lo > 0.25) {
        var mid = (lo + hi) / 2
        el.style.fontSize = mid + "pt"
        // Width against the message's own box: it spans the card's inner
        // width, so a long unbroken word shows up as scrollWidth > clientWidth.
        if (el.scrollHeight <= maxH && el.scrollWidth <= el.clientWidth) lo = mid
        else hi = mid
      }
      el.style.fontSize = lo + "pt"
    }
    function go() {
      document.querySelectorAll(".message").forEach(fit)
      setTimeout(function () { window.print() }, 150)
    }
    window.addEventListener("load", function () {
      var ready = document.fonts && document.fonts.ready
      // Never hold the print dialog hostage to a font that will not load.
      Promise.race([ready || Promise.resolve(), new Promise(function (r) { setTimeout(r, 2500) })]).then(go)
    })
  <\/script>
</body>
</html>`)
  win.document.close()
  return "printed"
}
