import { NextRequest, NextResponse } from "next/server"

import { getOrSetCart } from "@lib/data/cart"

/**
 * Makes sure the visitor has a cart before they need one.
 *
 * Creating a cart is a Medusa workflow of its own, ~1.7s on top of the ~2.5s
 * the add takes — so a first-time visitor's first Add to bag (and Checkout
 * now, which waits for it) paid both. The product page calls this in the
 * background once the visitor starts using the page, so by the time they
 * tap, the cart exists and only the add is left. With a cart cookie already
 * set it does nothing over the network.
 *
 * A route rather than a Server Action, like the others in app/api/cart, so
 * a page loaded before a deploy can still call it.
 */
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    await getOrSetCart(String(body?.countryCode ?? ""))
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } })
  } catch (e) {
    // Nothing depends on this: the add creates the cart itself if need be.
    console.error("Cart warm-up failed:", e instanceof Error ? e.message : e)
    return NextResponse.json({ ok: false }, { status: 200, headers: { "Cache-Control": "no-store" } })
  }
}
