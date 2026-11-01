import { getTranslations } from "@lib/i18n/dictionary"
import { HttpTypes } from "@medusajs/types"

type OrderDetailsProps = {
  order: HttpTypes.StoreOrder
  showStatus?: boolean
  /** The locale URL segment, e.g. "ar-qa". */
  segment?: string
}

const formatStatus = (str: string) => {
  const formatted = str.split("_").join(" ")
  return formatted.slice(0, 1).toUpperCase() + formatted.slice(1)
}

const OrderDetails = ({ order, showStatus, segment }: OrderDetailsProps) => {
  const { t, locale } = getTranslations(segment)
  /**
   * Medusa requires an email on every order, so guest checkout derives a
   * placeholder from the phone number. It must never be shown — the original
   * copy read "we have sent the order confirmation details to
   * 97466960994@guest.flowershop.qa", which looks broken and promises an
   * email that will never arrive.
   *
   * The phone number is the real contact, so that is what we confirm back.
   */
  const phone =
    (order.metadata?.contact_phone as string | undefined) ??
    order.shipping_address?.phone ??
    null

  const deliveryDate = order.metadata?.delivery_date as string | undefined
  const deliveryWindow = order.metadata?.delivery_window as string | undefined
  const giftNote = order.metadata?.gift_note as string | undefined

  // In the visitor's language, and on Doha's calendar: an order placed at
  // 1am Qatar time is still the previous day in UTC.
  const orderDate = new Date(order.created_at).toLocaleDateString(
    locale === "ar" ? "ar-QA" : "en-GB",
    { dateStyle: "long", timeZone: "Asia/Qatar" }
  )

  return (
    <div className="flex flex-col gap-3">
      <p className="text-base leading-relaxed text-ink-700">
        {phone ? (
          <>
            {t("order.whatsappAtBefore")}{" "}
            <span
              className="font-semibold text-ink-900"
              data-testid="order-phone"
              dir="ltr"
            >
              {phone}
            </span>{" "}
            {t("order.whatsappAtAfter")}
          </>
        ) : (
          <>{t("order.inTouch")}</>
        )}
      </p>

      {(deliveryDate || deliveryWindow) && (
        <p className="text-base text-ink-700">
          {t("order.requestedDelivery")}{" "}
          <span className="font-semibold text-ink-900">
            {[deliveryDate, deliveryWindow].filter(Boolean).join(", ")}
          </span>
        </p>
      )}

      {/* Read the gift message back. It is handwritten onto a card by the
          florist, so a typo is worth catching now rather than at the door. */}
      {!!giftNote && (
        <p className="text-base text-ink-700">
          {t("order.giftMessage")}{" "}
          <span className="font-semibold text-ink-900">&ldquo;{giftNote}&rdquo;</span>
        </p>
      )}

      <div className="flex flex-col gap-1 text-sm text-ink-600">
        <span>
          {t("order.date")}{" "}
          <span data-testid="order-date">{orderDate}</span>
        </span>
        <span>
          {t("order.number")}{" "}
          <span className="font-semibold text-ink-900" data-testid="order-id">
            {order.display_id}
          </span>
        </span>
      </div>

      {showStatus && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-ink-600">
          <span>
            {t("order.status")}{" "}
            <span data-testid="order-status">
              {formatStatus(order.fulfillment_status)}
            </span>
          </span>
          <span>
            {t("order.paymentStatus")}{" "}
            <span data-testid="order-payment-status">
              {formatStatus(order.payment_status)}
            </span>
          </span>
        </div>
      )}
    </div>
  )
}

export default OrderDetails
