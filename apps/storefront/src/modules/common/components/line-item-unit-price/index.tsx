"use client"

import { useTranslations } from "@lib/i18n/use-translations"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@modules/common/components/ui"

type LineItemUnitPriceProps = {
  item: HttpTypes.StoreCartLineItem | HttpTypes.StoreOrderLineItem
  style?: "default" | "tight"
  currencyCode: string
}

const LineItemUnitPrice = ({
  item,
  style = "default",
  currencyCode,
}: LineItemUnitPriceProps) => {
  const total = item.total ?? 0
  const original_total = item.original_total ?? 0
  const hasReducedPrice = total < original_total
  const { t } = useTranslations()

  return (
    <div className="flex flex-col text-ui-fg-muted justify-center h-full">
      {/* The struck-through price only; the shop does not show a
          percentage off. */}
      {hasReducedPrice && (
        <p>
          {style === "default" && (
            <span className="text-ui-fg-muted">{t("product.original")} </span>
          )}
          <span
            className="line-through"
            data-testid="product-unit-original-price"
          >
            {convertToLocale({
              amount: original_total / item.quantity,
              currency_code: currencyCode,
            })}
          </span>
        </p>
      )}
      <span
        className={clx("text-base-regular", {
          "text-ui-fg-interactive": hasReducedPrice,
        })}
        data-testid="product-unit-price"
      >
        {convertToLocale({
          amount: total / item.quantity,
          currency_code: currencyCode,
        })}
      </span>
    </div>
  )
}

export default LineItemUnitPrice
