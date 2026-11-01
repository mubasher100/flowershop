import { getTranslations } from "@lib/i18n/dictionary"
import { isMidnightOption } from "@lib/util/delivery"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { Heading, Text } from "@modules/common/components/ui"

import Divider from "@modules/common/components/divider"

type ShippingDetailsProps = {
  order: HttpTypes.StoreOrder
  /** The locale URL segment, e.g. "ar-qa". */
  segment?: string
}

const ShippingDetails = ({ order, segment }: ShippingDetailsProps) => {
  const { t } = getTranslations(segment)
  const method = order.shipping_methods?.[0] as
    | { name?: string; total?: number }
    | undefined
  const fee = method?.total ?? 0
  // Named as checkout names it: 11:59 in the visitor's language, anything
  // else by its Medusa name.
  const methodName = isMidnightOption(method) ? t("midnight.name") : method?.name

  return (
    <div>
      <Heading level="h2" className="flex flex-row text-3xl-regular my-6">
        {t("checkout.delivery")}
      </Heading>
      <div className="flex flex-col gap-y-6 small:flex-row small:items-start small:gap-x-8">
        <div
          className="flex flex-col small:w-1/3"
          data-testid="shipping-address-summary"
        >
          <Text className="txt-medium-plus text-ui-fg-base mb-1">
            {t("order.deliveringTo")}
          </Text>
          <Text className="txt-medium text-ui-fg-subtle">
            {order.shipping_address?.first_name}{" "}
            {order.shipping_address?.last_name}
          </Text>
          <Text className="txt-medium text-ui-fg-subtle">
            {order.shipping_address?.address_1}{" "}
            {order.shipping_address?.address_2}
          </Text>
          <Text className="txt-medium text-ui-fg-subtle">
            {order.shipping_address?.city}
          </Text>
          {/* No country line: every order is in Qatar, and a bare "QA"
              means nothing to the customer. */}
        </div>

        <div
          className="flex flex-col small:w-1/3"
          data-testid="shipping-contact-summary"
        >
          <Text className="txt-medium-plus text-ui-fg-base mb-1">
            {t("order.contact")}
          </Text>
          {/* dir on an inline span, not the paragraph: an LTR paragraph
              would align to the left edge of an Arabic page. */}
          <Text className="txt-medium text-ui-fg-subtle">
            <span dir="ltr">{order.shipping_address?.phone}</span>
          </Text>
          {/* order.email is a placeholder derived from the phone number
              (97455512345@guest.flowershop.qa) because Medusa requires one.
              It is not a real address and must never be shown. */}
          {!!(order.metadata?.delivery_notes as string) && (
            <Text className="txt-medium text-ui-fg-subtle">
              {order.metadata?.delivery_notes as string}
            </Text>
          )}
        </div>

        <div
          className="flex flex-col small:w-1/3"
          data-testid="shipping-method-summary"
        >
          <Text className="txt-medium-plus text-ui-fg-base mb-1">
            {t("order.method")}
          </Text>
          <Text className="txt-medium text-ui-fg-subtle">
            {methodName} (
            {fee
              ? convertToLocale({
                  amount: fee,
                  currency_code: order.currency_code,
                })
              : t("checkout.free")}
            )
          </Text>
        </div>
      </div>
      <Divider className="mt-8" />
    </div>
  )
}

export default ShippingDetails
