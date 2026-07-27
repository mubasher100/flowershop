import { listProducts } from "@lib/data/products"
import { NextRequest, NextResponse } from "next/server"

/**
 * A minimal catalogue index for instant client-side search.
 *
 * Search used to go through the store page: every keystroke pushed a new URL,
 * re-rendered the route on the server, and made three calls to Railway before
 * anything appeared. Half a second of nothing per character is what "search is
 * slow" meant.
 *
 * The catalogue is ~50 products, so the whole searchable surface fits in a few
 * kilobytes. Ship it once and every subsequent query is a synchronous filter
 * over an array — no network, no spinner.
 *
 * Revisit this if the catalogue reaches a few hundred products; at that point
 * it wants a real search index rather than a bigger download.
 */

export const revalidate = 300

type IndexedProduct = {
  id: string
  title: string
  handle: string
  thumbnail: string | null
  /** Cheapest variant, already formatted for display. */
  price: string | null
  /** Lowercased haystack: title, collection, categories and colour tags. */
  terms: string
}

export async function GET(request: NextRequest) {
  const countryCode =
    request.nextUrl.searchParams.get("country")?.toLowerCase() || "qa"

  try {
    const { response } = await listProducts({
      countryCode,
      queryParams: {
        limit: 100,
        fields:
          "id,title,handle,thumbnail,*collection,*categories,*tags,*variants.calculated_price",
      },
    })

    const products: IndexedProduct[] = response.products.map((p) => {
      const prices = (p.variants ?? [])
        .map((v) => v.calculated_price?.calculated_amount)
        .filter((n): n is number => typeof n === "number")

      const cheapest = prices.length ? Math.min(...prices) : null

      // Everything someone might plausibly type, flattened into one string so
      // matching is a single indexOf rather than a walk over nested fields.
      const terms = [
        p.title,
        p.collection?.title,
        ...(p.categories ?? []).map((c) => c.name),
        ...(p.tags ?? []).map((t) => t.value),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return {
        id: p.id,
        title: p.title ?? "",
        handle: p.handle ?? "",
        thumbnail: p.thumbnail ?? null,
        price: cheapest === null ? null : `QAR ${cheapest.toFixed(2)}`,
        terms,
      }
    })

    return NextResponse.json(
      { products },
      {
        headers: {
          // Long browser cache with revalidation: the index is identical for
          // every visitor, and a stale entry costs nothing worse than a
          // missing new product for a few minutes.
          "Cache-Control":
            "public, max-age=300, s-maxage=300, stale-while-revalidate=3600",
        },
      }
    )
  } catch (error) {
    console.error("search-index failed", error)
    return NextResponse.json({ products: [] }, { status: 200 })
  }
}
