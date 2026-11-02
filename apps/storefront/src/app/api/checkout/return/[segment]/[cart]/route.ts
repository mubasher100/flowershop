import { NextRequest, NextResponse } from "next/server"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { getURLFromRedirectError } from "next/dist/client/components/redirect"

import { placeOrder } from "@lib/data/cart"

/**
 * Where SkipCash sends the customer after the card page.
 *
 * Completing the cart is what places the order, and Medusa only completes it
 * if the SkipCash provider reports the payment paid — it asks SkipCash, so
 * nothing in this URL (which the customer could edit) decides anything. The
 * cart id is in the path because SkipCash appends its own query parameters.
 *
 * If SkipCash's webhook got there first, completing again returns the same
 * order, so a customer who paid always lands on their confirmation. If the
 * payment did not go through, they go back to checkout with their bag intact.
 */
export const dynamic = "force-dynamic"

const handle = async (
  req: NextRequest,
  { params }: { params: Promise<{ segment: string; cart: string }> }
) => {
  const { segment: rawSegment, cart } = await params
  const segment = /^[a-z]{2}-[a-z]{2}$/.test(rawSegment) ? rawSegment : "en-qa"
  const back = (reason: string) =>
    NextResponse.redirect(new URL(`/${segment}/checkout?payment=${reason}`, req.url), 303)

  if (!/^cart_[A-Za-z0-9]+$/.test(cart)) return back("failed")

  try {
    await placeOrder(cart, segment)
    // placeOrder redirects when an order is placed; returning means it was not.
    return back("failed")
  } catch (e) {
    if (isRedirectError(e)) {
      return NextResponse.redirect(new URL(getURLFromRedirectError(e), req.url), 303)
    }
    console.error("Completing a paid checkout failed:", e instanceof Error ? e.message : e)
    return back("failed")
  }
}

export const GET = handle
export const POST = handle
