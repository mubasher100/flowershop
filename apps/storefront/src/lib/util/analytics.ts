/**
 * Google Analytics 4 (and Google Ads), and the events worth having: add to
 * bag, checkout begun, and the order itself, which is what says whether an ad
 * paid for itself.
 *
 * Off unless NEXT_PUBLIC_GA_ID is set (the GA_MEASUREMENT_ID repo variable;
 * never on staging). It may hold several ids separated by commas: a G- one
 * for Analytics and an AW- one for Google Ads.
 *
 * Nothing here sends a name, a phone number, an address or a gift message.
 * An order page's address opens that order to anyone who has it, so it is
 * replaced before anything is sent.
 */
export const GA_IDS = (process.env.NEXT_PUBLIC_GA_ID ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter((id) => /^(G|AW|GT)-[A-Z0-9]+$/i.test(id))

export const analyticsEnabled = GA_IDS.length > 0

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

/** The same address with the order's id taken out. */
export const maskOrder = (url: string) =>
  url.replace(/\/order\/[^/?#]+[^#]*/, "/order/confirmed")

/**
 * Set up once, before the first event: Google handles the queue in order, and
 * an event queued ahead of the setup goes nowhere.
 */
export function startAnalytics() {
  if (typeof window === "undefined" || !analyticsEnabled || window.gtag) return
  window.dataLayer = window.dataLayer || []
  window.gtag = function () {
    // Google reads the arguments object itself, not an array of it.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments)
  }
  window.gtag("js", new Date())
  const { href } = window.location
  const { referrer } = document
  window.gtag("set", {
    // Only where there is something to hide: a fixed address would otherwise
    // be reported for every page opened after it.
    ...(maskOrder(href) !== href ? { page_location: maskOrder(href) } : {}),
    ...(maskOrder(referrer) !== referrer
      ? { page_referrer: maskOrder(referrer) }
      : {}),
    // Counting orders, not building advertising profiles of visitors.
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    // Coming back from the card page is not a new visit from SkipCash.
    ...(/skipcash/i.test(referrer) ? { ignore_referrer: true } : {}),
  })
  for (const id of GA_IDS) window.gtag("config", id)
}

/** Fire-and-forget. Safe to call when analytics is switched off. */
export function track(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || !analyticsEnabled) return
  try {
    startAnalytics()
    // Moving between pages does not reload, so the address goes with it.
    window.gtag?.("event", event, {
      page_location: maskOrder(window.location.href),
      ...params,
    })
  } catch {
    /* measuring must never break the shop */
  }
}

type Line = {
  title?: string | null
  product_title?: string | null
  product_handle?: string | null
  variant_title?: string | null
  unit_price?: number | null
  quantity?: number | null
}

export const trackedItems = (items: Line[] | null | undefined) =>
  (items ?? []).map((i) => ({
    item_id: i.product_handle ?? undefined,
    item_name: i.product_title ?? i.title ?? undefined,
    item_variant: i.variant_title ?? undefined,
    price: i.unit_price ?? undefined,
    quantity: i.quantity ?? 1,
  }))
