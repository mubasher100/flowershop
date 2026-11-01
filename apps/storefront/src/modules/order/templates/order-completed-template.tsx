import { Heading } from "@modules/common/components/ui"
import { cookies as nextCookies } from "next/headers"

import CartTotals from "@modules/common/components/cart-totals"
import Help from "@modules/order/components/help"
import Items from "@modules/order/components/items"
import OnboardingCta from "@modules/order/components/onboarding-cta"
import OrderDetails from "@modules/order/components/order-details"
import ShippingDetails from "@modules/order/components/shipping-details"
import SendOnWhatsapp from "@modules/order/components/send-on-whatsapp"
import { HttpTypes } from "@medusajs/types"
import { getTranslations } from "@lib/i18n/dictionary"

type OrderCompletedTemplateProps = {
  order: HttpTypes.StoreOrder
  segment?: string
}

export default async function OrderCompletedTemplate({
  order,
  segment,
}: OrderCompletedTemplateProps) {
  const cookies = await nextCookies()

  const isOnboarding = cookies.get("_medusa_onboarding")?.value === "true"
  const { t } = getTranslations(segment)

  return (
    <div className="py-6 min-h-[calc(100vh-64px)]">
      <div className="content-container flex flex-col justify-center items-center gap-y-10 max-w-4xl h-full w-full">
        {isOnboarding && <OnboardingCta orderId={order.id} />}
        <div
          className="flex flex-col gap-4 max-w-4xl h-full bg-white w-full py-10"
          data-testid="order-complete-container"
        >
          <Heading
            level="h1"
            className="flex flex-col gap-y-3 text-ui-fg-base text-3xl mb-4"
          >
            <span>{t("order.thankYou")}</span>
            <span>{t("order.placed")}</span>
          </Heading>
          {/* Every order is confirmed on WhatsApp, so starting that chat is
              the next thing the customer has to do — it goes first. */}
          <SendOnWhatsapp order={order} segment={segment} />
          <OrderDetails order={order} segment={segment} />
          <Heading level="h2" className="flex flex-row text-3xl-regular">
            {t("cart.summary")}
          </Heading>
          <Items order={order} />
          <CartTotals totals={order} />
          <ShippingDetails order={order} segment={segment} />
          {/* No PaymentDetails here. Nothing is paid online — payment is
              agreed on WhatsApp — so it printed "Manual Payment … paid at"
              for money that had not moved. */}
          <Help segment={segment} />
        </div>
      </div>
    </div>
  )
}
