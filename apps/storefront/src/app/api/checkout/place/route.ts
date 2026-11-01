import { NextRequest, NextResponse } from "next/server"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { getURLFromRedirectError } from "next/dist/client/components/redirect"

import { placeGuestOrder } from "@lib/data/guest-order"

/**
 * Place the order, at an address that survives a deploy.
 *
 * `placeGuestOrder` was posted as a Server Action, whose id changes with
 * every build — so a customer who had checkout open across a release lost
 * the order to "An error occurred in the Server Components render". This
 * route runs the very same function; only the way the browser reaches it
 * changed.
 *
 * On success that function redirects to the confirmation page, which it does
 * by throwing. Here the throw is caught and the address handed back for the
 * browser to follow.
 */
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const state = await placeGuestOrder({}, formData)
    return NextResponse.json(state, { headers: { "Cache-Control": "no-store" } })
  } catch (e) {
    if (isRedirectError(e)) {
      return NextResponse.json(
        { redirect: getURLFromRedirectError(e) },
        { headers: { "Cache-Control": "no-store" } }
      )
    }
    console.error("Placing order failed", e)
    return NextResponse.json(
      { error: "We couldn't confirm that order. Please try again." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    )
  }
}
