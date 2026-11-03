"use client"

import { getTranslations } from "@lib/i18n/dictionary"

/**
 * The browser's side of the bag and checkout routes in app/api.
 *
 * These used to call Server Actions directly. A Server Action is addressed by
 * an id that changes with every build, so any page loaded before a deploy
 * failed on its next add or order. Plain routes keep one address forever.
 *
 * Each request carries the page's locale segment (en-qa, ar-qa) in
 * x-segment, so the route answers in the customer's language — the language
 * lives in the URL, and a route's own URL does not carry it.
 */
const segment = () =>
  typeof window === "undefined" ? undefined : window.location.pathname.split("/")[1]
const say = (key: "err.generic" | "err.offline") => getTranslations(segment()).t(key)

const post = async (path: string, body: BodyInit, json = true) => {
  let res: Response
  try {
    res = await fetch(path, {
      method: "POST",
      headers: {
        ...(json ? { "content-type": "application/json" } : {}),
        "x-segment": segment() ?? "",
      },
      body,
      cache: "no-store",
    })
  } catch {
    throw new Error(say("err.offline"))
  }
  const data = (await res.json().catch(() => ({}))) as {
    error?: string
    redirect?: string
    payUrl?: string
  }
  return { ok: res.ok, data }
}

export const addToBag = async (args: {
  variantId: string
  quantity: number
  countryCode: string
  metadata?: Record<string, string>
}) => {
  const { ok, data } = await post("/api/cart/add", JSON.stringify(args))
  if (!ok) throw new Error(data.error || say("err.generic"))
}

/** Quantity 0 removes the line. */
export const setBagLine = async (lineId: string, quantity: number) => {
  const { ok, data } = await post("/api/cart/line", JSON.stringify({ lineId, quantity }))
  if (!ok) throw new Error(data.error || say("err.generic"))
}

/**
 * Never throws: an order redirects, comes back with a message, or — if the
 * reply never arrived — says so, because the order may well have gone
 * through. "Place order" hands the phone to WhatsApp, and Chrome on iOS can
 * suspend the page with the request already at the server.
 */
export const placeOrderRequest = async (
  form: FormData
): Promise<{ error?: string; redirect?: string; payUrl?: string; unreachable?: boolean }> => {
  try {
    const { ok, data } = await post("/api/checkout/place", form, false)
    if (data.payUrl) return { payUrl: data.payUrl }
    if (data.redirect) return { redirect: data.redirect }
    if (data.error) return { error: data.error }
    return ok ? {} : { error: say("err.generic") }
  } catch (e) {
    return { error: e instanceof Error ? e.message : say("err.generic"), unreachable: true }
  }
}

/**
 * Whether the bag has been turned into an order. The count reads 0 once the
 * cart is completed (and clears the stale cookie as it does).
 */
export const bagIsEmpty = async () => {
  try {
    const res = await fetch("/api/cart-count", { cache: "no-store" })
    const data = await res.json()
    return data.count === 0
  } catch {
    return false
  }
}
