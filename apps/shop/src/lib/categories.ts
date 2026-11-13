/**
 * Categories as the website shows them.
 *
 * The sort here mirrors `present()` in apps/storefront/src/lib/util/categories.ts
 * exactly — metadata.position first, then the website's built-in order, then
 * Medusa's rank — so the list the florist reorders is the list customers see.
 * Change one, change both.
 */
import { OFFER_HANDLE, type ShopCategory } from "./shop"

/** The website's built-in order, from before categories could be reordered. */
export const TYPE_HANDLES = [
  "hot-deals",
  "bouquets",
  "big-bouquets",
  "vases",
  "table-arrangements",
  "50-roses",
  "100-roses",
  "200-roses",
  "baby-roses",
]
export const OCCASION_HANDLES = ["birthday", "anniversary", "congratulations", "get-well-soon", "new-baby", "thank-you"]

export type Kind = "type" | "occasion"

export const kindOf = (c: ShopCategory): Kind =>
  OCCASION_HANDLES.includes(c.handle) || c.metadata?.kind === "occasion" ? "occasion" : "type"

export function websiteOrder(all: ShopCategory[], kind: Kind): ShopCategory[] {
  const known = kind === "occasion" ? OCCASION_HANDLES : TYPE_HANDLES
  const key = (c: ShopCategory) => {
    const pos = c.metadata?.position
    if (typeof pos === "number") return pos
    const i = known.indexOf(c.handle)
    return i >= 0 ? 1000 + i : 2000 + (c.rank ?? 0)
  }
  return all.filter((c) => !c.parent_category_id && kindOf(c) === kind).sort((a, b) => key(a) - key(b))
}

/** A web address from a name: "Eid Flowers" → "eid-flowers". */
export const slugify = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)

/** A free web address: "eid-flowers", else "eid-flowers-2", … */
export function freeHandle(name: string, taken: Iterable<string>): string {
  const base = slugify(name) || "category"
  const used = new Set(taken)
  if (!used.has(base)) return base
  for (let n = 2; ; n++) if (!used.has(`${base}-${n}`)) return `${base}-${n}`
}

/** Positions for a list after moving one item up (-1) or down (+1). */
export function moved<T>(list: T[], index: number, by: -1 | 1): T[] {
  const to = index + by
  if (to < 0 || to >= list.length) return list
  const next = [...list]
  ;[next[index], next[to]] = [next[to], next[index]]
  return next
}

/** The offers category is driven by the offer switch and cannot be deleted. */
export const isProtected = (c: ShopCategory) => c.handle === OFFER_HANDLE
