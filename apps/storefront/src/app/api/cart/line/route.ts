import { NextRequest, NextResponse } from "next/server"

import { deleteLineItem, updateLineItem } from "@lib/data/cart"
import { getTranslations } from "@lib/i18n/dictionary"

/**
 * Change a bag line's quantity, or remove it (quantity 0).
 *
 * A route handler rather than a Server Action for the same reason as
 * /api/cart/add: its address does not change between deploys, so a bag page
 * opened before a release still works after it.
 */
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const { t } = getTranslations(req.headers.get("x-segment"))
  try {
    const body = await req.json()
    const lineId = String(body?.lineId ?? "")
    const quantity = Math.max(0, Math.min(99, Number(body?.quantity) || 0))

    if (quantity === 0) await deleteLineItem(lineId)
    else await updateLineItem({ lineId, quantity })

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error("Bag update failed:", message)
    return NextResponse.json(
      {
        error: /not enough stock|insufficient inventory|required inventory/i.test(message)
          ? t("err.notEnough")
          : t("err.bagFailed"),
      },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    )
  }
}
