import { HttpTypes } from "@medusajs/types"

type OrderDetailsProps = {
  order: HttpTypes.StoreOrder
  showStatus?: boolean
}

const formatStatus = (str: string) => {
  const formatted = str.split("_").join(" ")
  return formatted.slice(0, 1).toUpperCase() + formatted.slice(1)
}

const OrderDetails = ({ order, showStatus }: OrderDetailsProps) => {
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

  return (
    <div className="flex flex-col gap-3">
      <p className="text-base leading-relaxed text-ink-700">
        {phone ? (
          <>
            We&apos;ll message you on WhatsApp at{" "}
            <span
              className="font-semibold text-ink-900"
              data-testid="order-phone"
            >
              {phone}
            </span>{" "}
            once we&apos;ve checked the flowers are in stock and confirmed your
            delivery time.
          </>
        ) : (
          <>We&apos;ll be in touch shortly to confirm your order.</>
        )}
      </p>

      {(deliveryDate || deliveryWindow) && (
        <p className="text-base text-ink-700">
          Requested delivery:{" "}
          <span className="font-semibold text-ink-900">
            {[deliveryDate, deliveryWindow].filter(Boolean).join(", ")}
          </span>
        </p>
      )}

      {/* Read the gift message back. It is handwritten onto a card by the
          florist, so a typo is worth catching now rather than at the door. */}
      {!!giftNote && (
        <p className="text-base text-ink-700">
          Gift message:{" "}
          <span className="font-semibold text-ink-900">&ldquo;{giftNote}&rdquo;</span>
        </p>
      )}

      <div className="flex flex-col gap-1 text-sm text-ink-600">
        <span>
          Order date:{" "}
          <span data-testid="order-date">
            {new Date(order.created_at).toDateString()}
          </span>
        </span>
        <span>
          Order number:{" "}
          <span className="font-semibold text-ink-900" data-testid="order-id">
            {order.display_id}
          </span>
        </span>
      </div>

      {showStatus && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-ink-600">
          <span>
            Order status:{" "}
            <span data-testid="order-status">
              {formatStatus(order.fulfillment_status)}
            </span>
          </span>
          <span>
            Payment status:{" "}
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
