"use client"

import { HttpTypes } from "@medusajs/types"
import { useActionState, useState } from "react"

import DemoPayment from "@modules/checkout/components/demo-payment"
import {
  DELIVERY_AREAS as AREAS,
  DELIVERY_WINDOWS as WINDOWS,
  FIELD_LIMITS,
} from "@lib/util/delivery"

import { convertToLocale } from "@lib/util/money"
import { placeGuestOrder, GuestOrderState } from "@lib/data/guest-order"
import { useTranslations } from "@lib/i18n/use-translations"

/**
 * The demo card gateway is opt-in. Without this flag the checkout is exactly
 * as before — one form, confirmed on WhatsApp — so a simulated payment can
 * never appear on a live storefront by accident.
 */
const DEMO_PAYMENT_ENABLED = process.env.NEXT_PUBLIC_DEMO_PAYMENT === "true"


/**
 * Guest checkout.
 *
 * One screen: who you are, where it goes, when. No account, no email, no
 * online payment — the shopkeeper checks stock and confirms on WhatsApp,
 * so the phone number is the only truly required contact detail.
 */



const labelClass = "text-sm font-medium text-ink-800"
const fieldClass =
  "min-h-[3rem] w-full rounded-xl border border-ink-200 bg-white px-4 text-base text-ink-900 placeholder:text-ink-500 focus:border-blush-500 focus:outline-none focus:ring-2 focus:ring-blush-200"

export default function GuestCheckout({
  cart,
  shippingOptions,
}: {
  cart: HttpTypes.StoreCart
  shippingOptions: HttpTypes.StoreCartShippingOption[]
}) {
  const [state, formAction, pending] = useActionState<
    GuestOrderState,
    FormData
  >(placeGuestOrder, {})

  const { t } = useTranslations()
  const [payMethod, setPayMethod] = useState<"whatsapp" | "card">("whatsapp")
  const [paymentRef, setPaymentRef] = useState<string | null>(null)

  // Today, in Qatar, as a yyyy-mm-dd bound for the date picker.
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Qatar",
  })

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="font-display text-2xl text-ink-900">
            {t("checkout.yourDetails")}
          </h2>
          <p className="mt-1 text-sm text-ink-600">
            {t("checkout.detailsHelp")}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="name">
            {t("checkout.name")}
          </label>
          <input id="name" name="name" required autoComplete="name"
            maxLength={FIELD_LIMITS.name}
            className={fieldClass} placeholder={t("checkout.namePlaceholder")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="phone">
            {t("checkout.phone")}
          </label>
          {/* dir="ltr" regardless of page direction: a phone number is a
              left-to-right sequence even in Arabic, and letting it inherit RTL
              puts the leading digits on the wrong end as you type. */}
          <input id="phone" name="phone" required type="tel"
            inputMode="tel" autoComplete="tel" dir="ltr" maxLength={FIELD_LIMITS.phone}
            className={`${fieldClass} text-start`}
            placeholder={t("checkout.phonePlaceholder")} />
          <p className="text-xs text-ink-500">{t("checkout.phoneHelp")}</p>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl text-ink-900">
          {t("checkout.delivery")}
        </h2>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="recipient">
            {t("checkout.recipient")}{" "}
            <span className="font-normal text-ink-500">
              {t("checkout.optional")}
            </span>
          </label>
          <input id="recipient" name="recipient" className={fieldClass}
            maxLength={FIELD_LIMITS.recipient}
            placeholder={t("checkout.recipientPlaceholder")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="area">
            {t("checkout.area")}
          </label>
          {/* Area and time-window values stay English in the submitted form.
              They are read off the order by the shopkeeper, who works in
              English — translating the value as well as the label would hand
              them an address they have to translate back. */}
          <select id="area" name="area" required defaultValue="" className={fieldClass}>
            <option value="" disabled>{t("checkout.chooseArea")}</option>
            {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="address">
            {t("checkout.address")}
          </label>
          <textarea id="address" name="address" required rows={3}
            maxLength={FIELD_LIMITS.address}
            className={`${fieldClass} py-3`}
            placeholder={t("checkout.addressPlaceholder")} />
        </div>

        <div className="grid grid-cols-1 gap-4 xsmall:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="delivery_date">
              {t("checkout.date")}
            </label>
            <input id="delivery_date" name="delivery_date" type="date"
              min={today} defaultValue={today} className={fieldClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="delivery_window">
              {t("checkout.time")}
            </label>
            <select id="delivery_window" name="delivery_window"
              defaultValue={WINDOWS[0]} className={fieldClass}>
              {WINDOWS.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className={`${labelClass} mb-1.5`}>
            {t("checkout.speed")}
          </legend>
          {shippingOptions.map((option, i) => (
            <label
              key={option.id}
              className="flex min-h-[3.25rem] cursor-pointer items-center justify-between gap-3 rounded-xl border border-ink-200 bg-white px-4 has-[:checked]:border-blush-500 has-[:checked]:ring-2 has-[:checked]:ring-blush-200"
            >
              <span className="flex items-center gap-3">
                <input type="radio" name="shipping_option_id"
                  value={option.id} defaultChecked={i === 0} required
                  className="h-4 w-4 accent-blush-600" />
                <span className="text-base text-ink-900">{option.name}</span>
              </span>
              <span className="tabular-nums text-ink-700">
                {convertToLocale({
                  amount: option.amount ?? 0,
                  currency_code: cart.currency_code,
                })}
              </span>
            </label>
          ))}
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="gift_note">
            {t("checkout.giftNote")}{" "}
            <span className="font-normal text-ink-500">
              {t("checkout.optional")}
            </span>
          </label>
          <textarea id="gift_note" name="gift_note" rows={3}
            maxLength={FIELD_LIMITS.giftNote}
            className={`${fieldClass} py-3`}
            placeholder={t("checkout.giftNotePlaceholder")} />
        </div>
      </section>

      {state.error && (
        <p role="alert"
          className="rounded-xl border border-blush-300 bg-blush-50 px-4 py-3 text-sm text-blush-800">
          {state.error}
        </p>
      )}

      {/* Payment. The card path is a simulation, shown only when
          NEXT_PUBLIC_DEMO_PAYMENT is set, so it cannot appear on a real
          storefront by accident. SkipCash replaces it in phase 8. */}
      {DEMO_PAYMENT_ENABLED && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-2xl text-ink-900">
            {t("pay.heading")}
          </h2>

          <fieldset className="flex flex-col gap-2">
            <legend className={`${labelClass} mb-1.5`}>{t("pay.method")}</legend>

            {(
              [
                ["whatsapp", "pay.onDelivery", "pay.onDeliveryHint"],
                ["card", "pay.card", "pay.cardHint"],
              ] as const
            ).map(([value, label, hint]) => (
              <label
                key={value}
                className="flex min-h-[3.25rem] cursor-pointer items-start gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3 has-[:checked]:border-blush-500 has-[:checked]:ring-2 has-[:checked]:ring-blush-200"
              >
                <input
                  type="radio"
                  name="payment_method"
                  value={value}
                  checked={payMethod === value}
                  onChange={() => {
                    setPayMethod(value)
                    setPaymentRef(null)
                  }}
                  className="mt-1 h-4 w-4 accent-blush-600"
                />
                <span className="flex flex-col">
                  <span className="text-base text-ink-900">{t(label)}</span>
                  <span className="text-sm text-ink-600">{t(hint)}</span>
                </span>
              </label>
            ))}
          </fieldset>

          {payMethod === "card" && !paymentRef && (
            <DemoPayment
              amount={convertToLocale({
                amount: cart.total ?? 0,
                currency_code: cart.currency_code,
              })}
              onApproved={(result) => setPaymentRef(result.reference)}
            />
          )}

          {paymentRef && (
            <p
              role="status"
              className="rounded-xl border border-sage-300 bg-sage-50 px-4 py-3 text-sm text-sage-800"
            >
              {t("pay.approved")} — {paymentRef}
            </p>
          )}

          {/* Carried into the order so a demo order is always identifiable. */}
          <input type="hidden" name="payment_reference" value={paymentRef ?? ""} />
        </section>
      )}

      <div className="flex flex-col gap-3">
        <button
          type="submit"
          // Card selected means the simulated authorisation has to succeed
          // before the order can go in, which is the sequence a real gateway
          // enforces too.
          disabled={
            pending || (DEMO_PAYMENT_ENABLED && payMethod === "card" && !paymentRef)
          }
          className="inline-flex min-h-[3.25rem] items-center justify-center rounded-full bg-blush-600 px-8 text-base font-semibold text-white transition-colors hover:bg-blush-700 disabled:opacity-60">
          {pending ? t("checkout.placing") : t("checkout.place")}
        </button>
        <p className="text-center text-sm text-ink-600">
          {t("checkout.noCharge")}
        </p>
      </div>
    </form>
  )
}
