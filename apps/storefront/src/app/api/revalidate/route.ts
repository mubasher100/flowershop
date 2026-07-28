import { revalidateTag } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

/**
 * Cache invalidation hook, called by the Medusa backend.
 *
 * Catalogue pages are cached so they can be served from R2 rather than
 * re-rendered per request. Without this endpoint, an edit in the admin would
 * not appear on the storefront until the revalidate window expired — up to
 * five minutes of a wrong price or a sold-out product still showing.
 *
 * The backend posts here whenever a product, collection or category changes,
 * so an admin edit is live within a second or two while the cache still does
 * its job for everyone else.
 *
 * Auth is a shared secret. Without it this is an open cache-flush endpoint,
 * which is a cheap denial-of-service against the backend.
 */
export const dynamic = "force-dynamic"

const VALID_TAGS = new Set([
  "products",
  "collections",
  "categories",
  "regions",
  // Homepage layout, edited in the admin's Homepage screen.
  "homepage",
])

export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET

  if (!secret) {
    // Fail closed: an unset secret must not mean "allow everyone".
    return NextResponse.json(
      { error: "Revalidation is not configured." },
      { status: 503 }
    )
  }

  if (req.headers.get("x-revalidate-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 })
  }

  let tags: string[] = []
  try {
    const body = await req.json()
    tags = Array.isArray(body?.tags) ? body.tags : []
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const accepted = tags.filter((t) => VALID_TAGS.has(t))

  if (!accepted.length) {
    return NextResponse.json(
      {
        error: `No known tags. Expected any of: ${Array.from(VALID_TAGS).join(
          ", "
        )}`,
      },
      { status: 400 }
    )
  }

  accepted.forEach((tag) => revalidateTag(tag))

  return NextResponse.json({ revalidated: accepted })
}
