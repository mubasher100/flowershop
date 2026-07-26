import { NextResponse } from "next/server"

import { retrieveCart } from "@lib/data/cart"

/**
 * Cart item count, for the nav badge.
 *
 * The count has to come from a route handler rather than the page: reading
 * the cart cookie during render opts the whole route into dynamic rendering,
 * which is what kept the homepage from being served out of the incremental
 * cache. Route handlers can read cookies freely without affecting how pages
 * are rendered.
 */
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const cart = await retrieveCart()
    const count =
      cart?.items?.reduce((acc, item) => acc + item.quantity, 0) ?? 0

    return NextResponse.json(
      { count },
      { headers: { "Cache-Control": "private, no-store" } }
    )
  } catch {
    // A missing or expired cart is normal, not an error worth surfacing.
    return NextResponse.json({ count: 0 })
  }
}
