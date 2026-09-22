"use client"

import Script from "next/script"

/**
 * Google Analytics 4, and the ecommerce events worth having.
 *
 * The shop had no analytics at all: no way to know how many people visit,
 * which bouquets they look at, or where they leave. That is survivable for a
 * week and indefensible once money is being spent on ads.
 *
 * Off unless NEXT_PUBLIC_GA_ID is set, so the site ships no third-party
 * script — and no cookie banner obligation — until the shop decides to
 * measure. Nothing here sends a name, a phone number or an address; the
 * purchase event carries an order id and a value, which is what attribution
 * needs and no more.
 */
const GA_ID = process.env.NEXT_PUBLIC_GA_ID?.trim()

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

export const analyticsEnabled = !!GA_ID

/** Fire-and-forget. Safe to call when analytics is switched off. */
export function track(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || !window.gtag) return
  window.gtag("event", event, params)
}

export default function Analytics() {
  if (!GA_ID) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', '${GA_ID}', { anonymize_ip: true, currency: 'QAR' });`}
      </Script>
    </>
  )
}
