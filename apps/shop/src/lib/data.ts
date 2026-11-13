import { useQuery, useQueryClient } from "@tanstack/react-query"

import { recordChange, liveBy, clock } from "./live"
import { KEYS, fetchCategories, fetchProducts, fetchShopPrices } from "./shop"
import { toast } from "../components/ui"

/** Flowers, categories and prices: what every flower screen reads. */
export function useCatalogue() {
  const products = useQuery({ queryKey: KEYS.products, queryFn: fetchProducts })
  const categories = useQuery({ queryKey: KEYS.categories, queryFn: fetchCategories })
  const prices = useQuery({ queryKey: KEYS.prices, queryFn: fetchShopPrices })
  return {
    products: products.data?.products ?? [],
    categories: categories.data?.product_categories ?? [],
    prices: prices.data ?? { sale_price_list_id: null, prices: {} },
    isPending: products.isPending || categories.isPending || prices.isPending,
    error: products.error || categories.error || prices.error,
    refetch: () => Promise.all([products.refetch(), categories.refetch(), prices.refetch()]),
  }
}

/**
 * After any save: refresh what changed, note it in the change log, and tell
 * the florist when it will be on the website.
 */
export function useAfterSave() {
  const qc = useQueryClient()
  return async (what: string, message?: string) => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: KEYS.products }),
      qc.invalidateQueries({ queryKey: KEYS.prices }),
      qc.invalidateQueries({ queryKey: KEYS.categories }),
    ])
    const change = recordChange(what)
    toast(`${message ?? "Saved."} On the website by ${clock(liveBy(change.at))}.`)
  }
}
