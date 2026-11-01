import { NextRequest, NextResponse } from "next/server"

import { addToCart } from "@lib/data/cart"

/**
 * Add to bag, at an address that survives a deploy.
 *
 * This was a Server Action, and a Server Action is called by an id that
 * changes with every build. A shopper whose page was loaded before a deploy
 * tapped "Add to bag" and got "An error occurred in the Server Components
 * render" — the shop owner hit it on 1 Nov 2026, minutes after a release. A
 * route handler's URL is the same in every build, so an open page keeps
 * working. The work itself is still `addToCart`, unchanged.
 */
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const metadata =
      body?.metadata && typeof body.metadata === "object"
        ? Object.fromEntries(
            Object.entries(body.metadata as Record<string, unknown>)
              .filter(([, v]) => typeof v === "string")
              .map(([k, v]) => [k.slice(0, 40), (v as string).slice(0, 500)])
          )
        : undefined

    await addToCart({
      variantId: String(body?.variantId ?? ""),
      quantity: Math.max(1, Math.min(99, Number(body?.quantity) || 1)),
      countryCode: String(body?.countryCode ?? ""),
      metadata,
    })
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not add to your bag." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    )
  }
}
