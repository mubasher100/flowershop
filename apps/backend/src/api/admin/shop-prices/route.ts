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

  const { data: lists } = await query.graph({
    entity: "price_list",
    fields: ["id", "title", "type", "status"],
  })
  const sale =
    lists.find((l) => l.title === SALE_LIST_TITLE && l.type === "sale") ??
    lists.find((l) => l.type === "sale" && l.status === "active")

  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: [
      "id",
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
    const rows = ((v.price_set as { prices?: PriceRow[] } | null)?.prices ??
      []) as PriceRow[]
    const qar = rows.filter((p) => p.currency_code === "qar")
    const base = qar.find((p) => !p.price_list_id)
    const onSale = sale
      ? qar.find((p) => p.price_list_id === sale.id)
      : undefined
    prices[v.id] = {
      base: base ? Number(base.amount) : null,
      sale: onSale ? Number(onSale.amount) : null,
      sale_price_id: onSale?.id ?? null,
    }
  }

  res.json({ sale_price_list_id: sale?.id ?? null, prices })
}
