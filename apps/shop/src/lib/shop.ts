/**
 * The shop's data, as the florist thinks of it.
 *
 * Carried over from the admin's Shop screen (apps/backend/src/admin/
 * components/shop/shared.ts and prices.ts), which this app replaces for
 * everyday use. Everything goes through Medusa's own admin routes, so an
 * order cancelled here is cancelled exactly as in the full admin.
 */
import { sdk } from "./sdk"

export type Money = { id?: string; amount: number; currency_code: string }

export type ShopVariant = {
  id: string
  title: string
  manage_inventory?: boolean
  prices?: Money[]
  inventory_items?: {
    inventory_item_id: string
    inventory?: {
      stocked_quantity?: number
      reserved_quantity?: number
      location_levels?: { location_id: string; stocked_quantity: number }[]
    }
  }[]
}

export type ShopProduct = {
  id: string
  title: string
  handle: string
  description: string | null
  thumbnail: string | null
  status: "published" | "draft" | "proposed" | "rejected"
  categories?: { id: string }[]
  variants?: ShopVariant[]
}

export type ShopCategory = {
  id: string
  name: string
  handle: string
  description?: string | null
  rank?: number | null
  is_active?: boolean
  parent_category_id?: string | null
  metadata?: Record<string, unknown> | null
}

/** Prices are stored as-is in Medusa: 279 is 279.00, never 27900. */
export const money = (amount: number | undefined | null) =>
  `QAR ${Number(amount ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`

export const basePriceOf = (variant?: ShopVariant) =>
  variant?.prices?.find((p) => p.currency_code === "qar") ?? variant?.prices?.[0]

/**
 * One size's stock. `stocked` is on the shelf, `held` is claimed by orders not
 * yet sent (Medusa reserves on purchase and takes stock off the shelf only when
 * the order is sent), `available` is what a customer can still buy.
 */
export const stockOf = (variant?: ShopVariant) => {
  const link = variant?.inventory_items?.[0]
  const inv = link?.inventory
  const stocked = inv?.stocked_quantity ?? 0
  const held = inv?.reserved_quantity ?? 0
  return {
    tracked: !!variant?.manage_inventory && !!link,
    stocked,
    held,
    available: Math.max(0, stocked - held),
    itemId: link?.inventory_item_id,
    locationId: inv?.location_levels?.[0]?.location_id,
  }
}

/** What the website shows for the whole flower: the sum over its sizes. */
export const availableOf = (p: ShopProduct) =>
  (p.variants ?? []).reduce((n, v) => n + stockOf(v).available, 0)

export const STOCK_FIELDS = [
  "variants.manage_inventory",
  "variants.inventory_items.inventory_item_id",
  "variants.inventory_items.inventory.stocked_quantity",
  "variants.inventory_items.inventory.reserved_quantity",
  "variants.inventory_items.inventory.location_levels.location_id",
  "variants.inventory_items.inventory.location_levels.stocked_quantity",
].join(",")

export const PRODUCT_FIELDS = `id,title,handle,description,thumbnail,status,categories.id,variants.id,variants.title,*variants.prices,${STOCK_FIELDS}`

export const KEYS = {
  products: ["products"] as const,
  categories: ["categories"] as const,
  prices: ["shop-prices"] as const,
  orders: ["orders"] as const,
}

export const fetchProducts = () =>
  sdk.client.fetch<{ products: ShopProduct[] }>(
    `/admin/products?limit=500&order=title&fields=${PRODUCT_FIELDS}`
  )

/**
 * The offers category — shown on the website as Black Friday since 13 Nov
 * 2026 (Offers before; the handle never changed). It is not something the
 * florist ticks: a flower is in it exactly while it is on offer, so the offer
 * switch is a plain yes/no and this follows it (the shop's request).
 */
export const OFFER_HANDLE = "hot-deals"

export const offerCategoryOf = (categories: ShopCategory[]) =>
  categories.find((c) => c.handle === OFFER_HANDLE) ?? null

/** The categories the florist chooses from: everything but the offers one. */
export const pickableCategories = (categories: ShopCategory[]) =>
  categories.filter((c) => c.handle !== OFFER_HANDLE)

/** A flower's category ids with the offers category set to match its offer. */
export function withOfferCategory(ids: Iterable<string>, categories: ShopCategory[], onOffer: boolean) {
  const offer = offerCategoryOf(categories)
  const set = new Set(ids)
  if (offer) {
    if (onOffer) set.add(offer.id)
    else set.delete(offer.id)
  }
  return [...set]
}

export const fetchCategories = () =>
  sdk.client.fetch<{ product_categories: ShopCategory[] }>(
    "/admin/product-categories?limit=200&fields=id,name,handle,description,rank,is_active,parent_category_id,metadata"
  )

/* ------------------------------------------------------------- prices */

export type VariantPrice = { base: number | null; sale: number | null; sale_price_id: string | null }
export type ShopPrices = { sale_price_list_id: string | null; prices: Record<string, VariantPrice> }

export const fetchShopPrices = () => sdk.client.fetch<ShopPrices>("/admin/shop-prices")

/** What a customer pays, and the struck-through figure when on offer. */
export const sellingOf = (p?: VariantPrice) => ({
  now: p?.sale ?? p?.base ?? 0,
  was: p?.sale != null && p?.base != null && p.base > p.sale ? p.base : null,
})

/**
 * Write one size's price. `was` above `now` puts it on offer: the variant's own
 * price becomes the was figure and the sale list holds what customers pay.
 * Anything else takes it off offer, removing the sale price, which would
 * otherwise keep overriding the new one.
 */
export async function applyPrice(args: {
  productId: string
  variant: ShopVariant
  current?: VariantPrice
  saleListId: string | null
  now: number
  was: number | null
}) {
  const { productId, variant, current, saleListId, now, was } = args
  const onSale = was != null && was > now && !!saleListId
  const targetBase = onSale ? was! : now
  const basePrice = basePriceOf(variant)

  if (current?.base !== targetBase) {
    await sdk.admin.product.updateVariant(productId, variant.id, {
      prices: [{ ...(basePrice?.id ? { id: basePrice.id } : {}), amount: targetBase, currency_code: "qar" }],
    })
  }
  if (!saleListId) return

  if (onSale) {
    if (current?.sale_price_id) {
      if (current.sale !== now) {
        await sdk.admin.priceList.batchPrices(saleListId, {
          update: [{ id: current.sale_price_id, variant_id: variant.id, amount: now, currency_code: "qar" }],
        })
      }
    } else {
      await sdk.admin.priceList.batchPrices(saleListId, {
        create: [{ variant_id: variant.id, amount: now, currency_code: "qar" }],
      })
    }
  } else if (current?.sale_price_id) {
    await sdk.admin.priceList.batchPrices(saleListId, { delete: [current.sale_price_id] })
  }
}

/* -------------------------------------------------------------- stock */

export async function setStock(variant: ShopVariant, quantity: number) {
  const s = stockOf(variant)
  if (!s.itemId || !s.locationId) {
    throw new Error(`${variant.title} has no stock record at the warehouse.`)
  }
  await sdk.admin.inventoryItem.updateLevel(s.itemId, s.locationId, {
    stocked_quantity: Math.max(0, Math.round(quantity)),
  })
}
