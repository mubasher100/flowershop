import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/** The sale list the shop's "was / now" prices live in (see seed-pricing.ts). */
const SALE_LIST_TITLE = "Everyday value"

type PriceRow = {
  id: string
  amount: number
  currency_code: string
  price_list_id?: string | null
}

/**
 * Each size's own price and its sale price, for the Shop screen.
 *
 * A struck-through price in Medusa is a sale price list overriding a higher
 * default: the variant's own price is the "was" figure and the list holds
 * what customers actually pay. The admin product API only returns the
 * variant's own price, and price-list prices are keyed by price set rather
 * than variant — so without this the Shop screen showed the crossed-out
 * figure as the price, and editing it changed the wrong number.
 *
 * Read-only: changes go through Medusa's own variant and price-list routes.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // The sale list's prices are read from the list itself and joined on price
  // set. They are not reachable through `price_set.prices`, which returns only
  // the base price — reading them that way found no sale on any flower, though
  // the Store API was applying all fourteen.
  const { data: lists } = await query.graph({
    entity: "price_list",
    fields: [
      "id",
      "title",
      "type",
      "status",
      "prices.id",
      "prices.amount",
      "prices.currency_code",
      "prices.price_set_id",
    ],
  })
  // Only an *active* sale list counts. The shop switched discounts off on
  // 19 Oct 2026 — promotions in Qatar need ministry approval, which it does
  // not have yet — by setting the list to draft. With no active list this
  // route reports none, and the Shop screen hides its Was boxes, so nobody can
  // put a struck-through price back by accident. Set the list active again
  // (Admin → Price Lists) once approval is in.
  const sale =
    lists.find(
      (l) =>
        l.title === SALE_LIST_TITLE &&
        l.type === "sale" &&
        l.status === "active"
    ) ?? lists.find((l) => l.type === "sale" && l.status === "active")

  const salePriceBySet = new Map<string, PriceRow>()
  for (const p of (
    (sale?.prices ?? []) as (PriceRow & {
      price_set_id?: string
    })[]
  ).filter((p) => p.currency_code === "qar" && p.price_set_id)) {
    salePriceBySet.set(p.price_set_id!, p)
  }

  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: [
      "id",
      "price_set.id",
      "price_set.prices.id",
      "price_set.prices.amount",
      "price_set.prices.currency_code",
      "price_set.prices.price_list_id",
    ],
  })

  const prices: Record<
    string,
    { base: number | null; sale: number | null; sale_price_id: string | null }
  > = {}

  for (const v of variants) {
    const set = v.price_set as { id?: string; prices?: PriceRow[] } | null
    const rows = (set?.prices ?? []) as PriceRow[]
    const base = rows.find((p) => p.currency_code === "qar" && !p.price_list_id)
    const onSale = set?.id ? salePriceBySet.get(set.id) : undefined
    prices[v.id] = {
      base: base ? Number(base.amount) : null,
      sale: onSale ? Number(onSale.amount) : null,
      sale_price_id: onSale?.id ?? null,
    }
  }

  res.json({ sale_price_list_id: sale?.id ?? null, prices })
}
