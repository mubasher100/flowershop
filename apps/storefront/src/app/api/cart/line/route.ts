import { NextRequest, NextResponse } from "next/server"

import { deleteLineItem, updateLineItem } from "@lib/data/cart"

/**
 * Change a bag line's quantity, or remove it (quantity 0).
 *
 * A route handler rather than a Server Action for the same reason as
 * /api/cart/add: its address does not change between deploys, so a bag page
 * opened before a release still works after it.
 */
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const lineId = String(body?.lineId ?? "")
    const quantity = Math.max(0, Math.min(99, Number(body?.quantity) || 0))

    if (quantity === 0) await deleteLineItem(lineId)
    else await updateLineItem({ lineId, quantity })

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not update your bag." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    )
  }
}
