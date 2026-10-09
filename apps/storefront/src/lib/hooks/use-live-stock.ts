"use client"

import { sdk } from "@lib/config"
import { useEffect, useState } from "react"

export type LiveStock = {
  manage_inventory: boolean
  allow_backorder: boolean
  inventory_quantity: number
}

/**
 * The product's stock as it is right now, fetched in the browser.
 *
 * Product pages are served from the edge cache, and that cache is tuned for
 * the Worker's CPU budget rather than freshness: a cached page can be up to
 * about half an hour behind the admin (see open-next.config.ts — both faster
 * settings took the site down). For a name or a photo that is fine. For stock
 * it is not: a flower that sold out ten minutes ago would still say "In stock"
 * and take the order as far as checkout, where Medusa refuses it.
 *
 * So the page stays cached and only this one small number is live — a single
 * Store API call per product page, made after the page has painted. It reads
 * no cookies, so it cannot opt the route out of static rendering. If it fails,
 * the page falls back to the cached figures it already had.
 */
export function useLiveStock(productId?: string) {
  const [stock, setStock] = useState<Record<string, LiveStock>>({})

  useEffect(() => {
    if (!productId) return
    let cancelled = false

    sdk.store.product
      .list({
        id: [productId],
        limit: 1,
        fields:
          "id,variants.id,variants.manage_inventory,variants.allow_backorder,+variants.inventory_quantity",
      })
      .then(({ products }) => {
        if (cancelled) return
        const next: Record<string, LiveStock> = {}
        for (const v of products?.[0]?.variants ?? []) {
          next[v.id] = {
            manage_inventory: !!v.manage_inventory,
            allow_backorder: !!v.allow_backorder,
            inventory_quantity: v.inventory_quantity ?? 0,
          }
        }
        setStock(next)
      })
      .catch(() => {
        // The cached figures stand. A failed stock check must never block
        // the page or the buy button any more than the cache already would.
      })

    return () => {
      cancelled = true
    }
  }, [productId])

  return stock
}
