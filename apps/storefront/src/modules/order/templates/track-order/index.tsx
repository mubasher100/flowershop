"use client"

import { useActionState } from "react"

import { convertToLocale } from "@lib/util/money"
import { trackOrder, TrackState } from "@lib/data/order-lookup"
import { useTranslations } from "@lib/i18n/use-translations"

const labelClass = "text-sm font-medium text-ink-800"
const fieldClass =
  "min-h-[3rem] w-full rounded-xl border border-ink-200 bg-white px-4 text-base text-ink-900 placeholder:text-ink-500 focus:border-blush-500 focus:outline-none focus:ring-2 focus:ring-blush-200"

/**
 * Finding an order again.
 *
 * Two fields, because two is what a guest checkout can ask for: the order
 * number from the confirmation and the phone number on the order.
 */
export default function TrackOrder() {
  const { t } = useTranslations()
  const [state, action, pending] = useActionState<TrackState, FormData>(
    trackOrder,
    {}
  )
  const order = state.order

  return (
    <div className="flex flex-col gap-8">
      <form action={action} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 xsmall:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="order_number">
              {t("track.orderNumber")}
            </label>
            <input id="order_number" name="order_number" required
              inputMode="numeric" dir="ltr" className={`${fieldClass} text-start`}
              placeholder={t("track.orderNumberPlaceholder")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="phone">
              {t("track.phone")}
            </label>
            <input id="phone" name="phone" required type="tel" inputMode="tel"
              dir="ltr" autoComplete="tel" className={`${fieldClass} text-start`}
              placeholder={t("checkout.phonePlaceholder")} />
          </div>
        </div>

        <button type="submit" disabled={pending}
          className="inline-flex min-h-[3.25rem] w-fit items-center justify-center rounded-full bg-blush-600 px-8 text-base font-semibold text-white transition-colors hover:bg-blush-700 disabled:opacity-60">
          {pending ? t("track.searching") : t("track.find")}
        </button>

        {state.error && (
          <p role="alert"
            className="rounded-xl border border-blush-300 bg-blush-50 px-4 py-3 text-sm text-blush-800">
            {state.error}
          </p>
        )}
      </form>

      {order && (
        <div role="status" className="flex flex-col gap-3 rounded-2xl border border-ink-200 bg-white p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl text-ink-900">
              {t("track.order")} #{order.order_number}
            </h2>
            <span className="rounded-full bg-blush-50 px-3 py-1 text-sm font-semibold text-blush-700">
              {order.state === "sent"
                ? t("track.sent")
                : order.state === "cancelled"
                  ? t("track.cancelled")
                  : t("track.preparing")}
            </span>
          </div>

          {(order.delivery_date || order.delivery_window) && (
            <p className="text-base text-ink-700">
              {t("track.delivery")}{" "}
              <span className="font-semibold text-ink-900">
                {[order.delivery_date, order.delivery_window].filter(Boolean).join(", ")}
              </span>
              {order.delivery_area ? ` · ${order.delivery_area}` : ""}
            </p>
          )}

          {order.recipient_name && (
            <p className="text-base text-ink-700">
              {t("track.recipient")}{" "}
              <span className="font-semibold text-ink-900">{order.recipient_name}</span>
            </p>
          )}

          <ul className="flex flex-col gap-1 text-base text-ink-700">
            {order.items.map((i, n) => (
              <li key={n}>
                {i.quantity} × {i.title}
              </li>
            ))}
          </ul>

          <p className="text-base text-ink-900">
            <span className="font-semibold">
              {convertToLocale({ amount: order.total, currency_code: order.currency_code })}
            </span>
            {order.shipping_method ? ` · ${order.shipping_method}` : ""}
          </p>

          <p className="text-sm text-ink-600">{t("track.help")}</p>
        </div>
      )}
    </div>
  )
}
