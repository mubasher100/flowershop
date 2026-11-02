"use client"

/**
 * The browser's side of the bag and checkout routes in app/api.
 *
 * These used to call Server Actions directly. A Server Action is addressed by
 * an id that changes with every build, so any page loaded before a deploy
 * failed on its next add or order. Plain routes keep one address forever.
 */
const GENERIC = "Something went wrong. Please try again."
const OFFLINE = "We couldn't reach the shop. Check your connection and try again."

const post = async (path: string, body: BodyInit, json = true) => {
  let res: Response
  try {
    res = await fetch(path, {
      method: "POST",
      headers: json ? { "content-type": "application/json" } : undefined,
      body,
      cache: "no-store",
    })
  } catch {
    throw new Error(OFFLINE)
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
  if (!ok) throw new Error(data.error || GENERIC)
}

/** Quantity 0 removes the line. */
export const setBagLine = async (lineId: string, quantity: number) => {
  const { ok, data } = await post("/api/cart/line", JSON.stringify({ lineId, quantity }))
  if (!ok) throw new Error(data.error || GENERIC)
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
    return ok ? {} : { error: GENERIC }
  } catch (e) {
    return { error: e instanceof Error ? e.message : GENERIC, unreachable: true }
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
