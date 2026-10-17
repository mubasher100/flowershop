import { sdk } from "../../lib/sdk"

/**
 * Selling price and "was" price, as the florist thinks of them.
 *
 * Medusa models a struck-through price as a sale price list overriding a
 * higher default: the variant's own price is the "was" figure and the list
 * holds what customers pay. The florist should never need to know that, so
 * the Shop screen speaks in two plain numbers — *Price* and *Was* — and this
 * module turns them into the variant price and the sale-list price.
 *
 * Reading comes from /admin/shop-prices, because the admin product API only
 * returns the variant's own price.
 */

export type VariantPrice = {
  base: number | null
  sale: number | null
  sale_price_id: string | null
}

export type ShopPrices = {
  sale_price_list_id: string | null
  prices: Record<string, VariantPrice>
}

export const SHOP_PRICES_KEY = ["shop-prices"]

export const fetchShopPrices = () =>
  sdk.client.fetch<ShopPrices>("/admin/shop-prices")

/** What a customer pays, and the struck-through figure when on sale. */
export const sellingOf = (p?: VariantPrice) => ({
  now: p?.sale ?? p?.base ?? 0,
  was: p?.sale != null && p?.base != null && p.base > p.sale ? p.base : null,
})

/**
 * Write one size's price.
 *
 * `was` above `now` puts the size on sale: own price = was, sale price = now.
 * Anything else takes it off sale: own price = now, and the sale price is
 * removed — left behind, it would keep overriding the new price.
 */
export async function applyPrice({
  productId,
  variantId,
  basePriceId,
  current,
  saleListId,
  now,
  was,
}: {
  productId: string
  variantId: string
  basePriceId?: string
  current?: VariantPrice
  saleListId: string | null
  now: number
  was: number | null
}) {
  const onSale = was != null && was > now && !!saleListId
  const targetBase = onSale ? was! : now

  if (current?.base !== targetBase) {
    await sdk.admin.product.updateVariant(productId, variantId, {
      prices: [
        {
          ...(basePriceId ? { id: basePriceId } : {}),
          amount: targetBase,
          currency_code: "qar",
        },
      ],
    })
  }

  if (!saleListId) return

  if (onSale) {
    if (current?.sale_price_id) {
      if (current.sale !== now) {
        await sdk.admin.priceList.batchPrices(saleListId, {
          update: [
            {
              id: current.sale_price_id,
              variant_id: variantId,
              amount: now,
              currency_code: "qar",
            },
          ],
        })
      }
    } else {
      await sdk.admin.priceList.batchPrices(saleListId, {
        create: [{ variant_id: variantId, amount: now, currency_code: "qar" }],
      })
    }
  } else if (current?.sale_price_id) {
    await sdk.admin.priceList.batchPrices(saleListId, {
      delete: [current.sale_price_id],
    })
  }
}
