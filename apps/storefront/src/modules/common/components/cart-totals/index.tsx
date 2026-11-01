"use client"

import { useTranslations } from "@lib/i18n/use-translations"
import { convertToLocale } from "@lib/util/money"
import React from "react"

type CartTotalsProps = {
  /**
   * The delivery fee the customer has just selected, before it reaches the
   * cart. Passed by the checkout summary so the total on screen matches the
   * total that will be charged; the cart page leaves it undefined.
   */
  shippingOverride?: number | null
  /** Shown instead of a zero fee where no choice has been made yet. */
  shippingPlaceholder?: string
  totals: {
    total?: number | null
    subtotal?: number | null
    tax_total?: number | null
    currency_code: string
    item_subtotal?: number | null
    shipping_subtotal?: number | null
    discount_subtotal?: number | null
  }
}

const CartTotals: React.FC<CartTotalsProps> = ({
  totals,
  shippingOverride,
  shippingPlaceholder,
}) => {
  const {
    currency_code,
    total,
    item_subtotal,
    shipping_subtotal,
    discount_subtotal,
  } = totals
  const { t } = useTranslations()

  // Qatar charges no VAT and the shop runs no shipping-specific tax, so the
  // selected fee can simply be added; the server arrives at the same number
  // when it prices the order.
  const shipping = shippingOverride ?? shipping_subtotal ?? 0
  const shownTotal =
    shippingOverride == null
      ? total ?? 0
      : (total ?? 0) - (shipping_subtotal ?? 0) + shippingOverride
  const showPlaceholder = shippingOverride == null && !shipping_subtotal && !!shippingPlaceholder

  return (
    <div>
      <div className="flex flex-col gap-y-2 txt-medium text-ui-fg-subtle ">
        <div className="flex items-center justify-between">
          <span>{t("cart.subtotal")}</span>
          <span data-testid="cart-subtotal" data-value={item_subtotal || 0}>
            {convertToLocale({ amount: item_subtotal ?? 0, currency_code })}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>{t("cart.shipping")}</span>
          <span data-testid="cart-shipping" data-value={shipping}>
            {showPlaceholder
              ? shippingPlaceholder
              : shipping
                ? convertToLocale({ amount: shipping, currency_code })
                : t("checkout.free")}
          </span>
        </div>
        {!!discount_subtotal && (
          <div className="flex items-center justify-between">
            <span>{t("cart.discount")}</span>
            <span
              className="text-ui-fg-interactive"
              data-testid="cart-discount"
              data-value={discount_subtotal || 0}
            >
              -{" "}
              {convertToLocale({
                amount: discount_subtotal ?? 0,
                currency_code,
              })}
            </span>
          </div>
        )}
        {/* No Taxes row: Qatar has no VAT and the shop charges none, so it
            only ever said "QAR 0.00" and invited the question why. */}
      </div>
      <div className="h-px w-full border-b border-gray-200 my-4" />
      <div className="flex items-center justify-between text-ui-fg-base mb-2 txt-medium ">
        <span>{t("cart.total")}</span>
        <span
          className="txt-xlarge-plus"
          data-testid="cart-total"
          data-value={shownTotal}
        >
          {convertToLocale({ amount: shownTotal, currency_code })}
        </span>
      </div>
      <div className="h-px w-full border-b border-gray-200 mt-4" />
    </div>
  )
}

export default CartTotals
