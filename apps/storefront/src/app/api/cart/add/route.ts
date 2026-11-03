import { NextRequest, NextResponse } from "next/server"

import { addToCart } from "@lib/data/cart"
import { getTranslations } from "@lib/i18n/dictionary"

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
  // The page's locale, sent by lib/util/cart-api.ts, so a refusal reads in
  // the customer's language.
  const { t } = getTranslations(req.headers.get("x-segment"))
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
    // Medusa's own wording ("Error setting up the request: Cart cart_01… is
    // already completed") went straight onto the product page. The customer
    // gets a sentence; the detail goes to the Worker log.
    const message = e instanceof Error ? e.message : String(e)
    console.error("Add to bag failed:", message)
    return NextResponse.json(
      {
        error: /not enough stock|insufficient inventory|required inventory/i.test(message)
          ? t("err.soldOut")
          : t("err.addFailed"),
      },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    )
  }
}
