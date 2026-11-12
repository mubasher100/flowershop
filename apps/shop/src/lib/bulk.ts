/**
 * Changing several flowers at once.
 *
 * Each action works flower by flower (a few at a time, to be kind to the
 * backend) and reports per flower, so one refusal — Medusa will not delete a
 * flower an unsent order is holding — does not stop the rest, and the florist
 * is told exactly which ones did not change.
 */
import { applyPrice, sellingOf, setStock, stockOf, type ShopPrices, type ShopProduct } from "./shop"
import { sdk } from "./sdk"

/* ---------------------------------------------------- pure helpers (tested) */

/**
 * The shop's prices end in 9 (since 2 Nov 2026): the largest whole number at
 * or below `amount` that ends in 9. 223.2 → 219, 229 → 229, 230 → 229.
 */
export function endIn9(amount: number): number {
  const whole = Math.floor(amount)
  if (whole < 9) return Math.max(1, whole)
  return whole - ((whole - 9) % 10 + 10) % 10
}

/** An offer price `percent` below `full`, ending in 9 and always below it. */
export function offerPrice(full: number, percent: number): number {
  const target = endIn9(full * (1 - percent / 100))
  return target < full ? target : endIn9(full - 1)
}

export type StockMode = "set" | "add"

/**
 * The shelf count that leaves `value` available to customers.
 *
 * The florist thinks in "how many can I still sell". Medusa keeps the shelf
 * count, with what unsent orders hold on top of it, so "set to 10" on a flower
 * with 2 held puts 12 on the shelf and the website shows 10.
 */
export function nextStocked(stocked: number, held: number, mode: StockMode, value: number): number {
  const v = Math.max(0, Math.round(value))
  return mode === "set" ? v + held : Math.max(held, stocked + v)
}

export type Outcome = { product: ShopProduct; ok: boolean; error?: string }

/** Run `fn` over `items`, `limit` at a time, collecting a result for each. */
export async function runLimited<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>
): Promise<{ item: T; ok: boolean; error?: string }[]> {
  const results: { item: T; ok: boolean; error?: string }[] = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const i = next++
      try {
        await fn(items[i])
        results[i] = { item: items[i], ok: true }
      } catch (err) {
        results[i] = { item: items[i], ok: false, error: messageOf(err) }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

export const messageOf = (err: unknown) =>
  err instanceof Error ? err.message : typeof err === "string" ? err : "Something went wrong."

const asOutcomes = (r: { item: ShopProduct; ok: boolean; error?: string }[]): Outcome[] =>
  r.map(({ item, ok, error }) => ({ product: item, ok, error }))

/* --------------------------------------------------------------- actions */

export async function bulkVisibility(products: ShopProduct[], show: boolean): Promise<Outcome[]> {
  const status = show ? "published" : "draft"
  return asOutcomes(
    await runLimited(products, 4, async (p) => {
      if (p.status !== status) await sdk.admin.product.update(p.id, { status })
    })
  )
}

export async function bulkStock(products: ShopProduct[], mode: StockMode, value: number): Promise<Outcome[]> {
  return asOutcomes(
    await runLimited(products, 3, async (p) => {
      for (const v of p.variants ?? []) {
        const s = stockOf(v)
        if (!s.tracked) continue
        await setStock(v, nextStocked(s.stocked, s.held, mode, value))
      }
    })
  )
}

export async function bulkOffer(
  products: ShopProduct[],
  prices: ShopPrices,
  percent: number | null
): Promise<Outcome[]> {
  if (percent != null && !prices.sale_price_list_id) {
    throw new Error("Offers are switched off in the shop (no active sale price list).")
  }
  return asOutcomes(
    await runLimited(products, 3, async (p) => {
      for (const v of p.variants ?? []) {
        const current = prices.prices[v.id]
        const { now, was } = sellingOf(current)
        const full = was ?? now
        if (!full) continue
        await applyPrice({
          productId: p.id,
          variant: v,
          current,
          saleListId: prices.sale_price_list_id,
          now: percent == null ? full : offerPrice(full, percent),
          was: percent == null ? null : full,
        })
      }
    })
  )
}

export async function bulkCategory(
  products: ShopProduct[],
  categoryId: string,
  add: boolean
): Promise<Outcome[]> {
  // One call for the lot: the category's product list is a single link table.
  try {
    const ids = products.map((p) => p.id)
    await sdk.admin.productCategory.updateProducts(categoryId, add ? { add: ids } : { remove: ids })
    return products.map((product) => ({ product, ok: true }))
  } catch (err) {
    return products.map((product) => ({ product, ok: false, error: messageOf(err) }))
  }
}

export async function bulkDelete(products: ShopProduct[]): Promise<Outcome[]> {
  return asOutcomes(
    await runLimited(products, 2, async (p) => {
      try {
        await sdk.admin.product.delete(p.id)
      } catch (err) {
        // Medusa refuses while an order not yet sent holds the flower.
        const m = messageOf(err)
        throw new Error(/reserv/i.test(m) ? "An order not yet sent is holding it. Hide it instead." : m)
      }
    })
  )
}
