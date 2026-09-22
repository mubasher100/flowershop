"use client"

import { HttpTypes } from "@medusajs/types"
import { useActionState, useEffect, useState } from "react"

import DemoPayment from "@modules/checkout/components/demo-payment"
import {
  DELIVERY_AREAS as AREAS,
  FIELD_LIMITS,
  MIDNIGHT_WINDOW,
  earliestStandardDate,
  isMidnightOption,
  midnightAvailability,
  qatarClock,
  windowsFor,
} from "@lib/util/delivery"
import { setSelectedDelivery } from "@lib/util/delivery-selection"

import { convertToLocale } from "@lib/util/money"
import { placeGuestOrder, GuestOrderState } from "@lib/data/guest-order"
import { useTranslations } from "@lib/i18n/use-translations"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

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
const legalLinkClass =
  "font-medium text-blush-700 underline underline-offset-2 hover:text-blush-800"
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

  const { t, segment } = useTranslations()
  const [payMethod, setPayMethod] = useState<"whatsapp" | "card">("whatsapp")

  /**
   * Which delivery is selected. Needed because 11:59 changes the form: the
   * time is fixed at one minute to midnight, and the date means the night
   * before rather than the day of.
   */
  const [shippingId, setShippingId] = useState<string>(
    shippingOptions[0]?.id ?? ""
  )
  const selectedOption = shippingOptions.find((o) => o.id === shippingId)
  const midnight = isMidnightOption(selectedOption)
  const [paymentRef, setPaymentRef] = useState<string | null>(null)

  // Today, in Qatar, as a yyyy-mm-dd bound for the date picker.
  const clock = qatarClock()
  const today = clock.date
  // Starts at the first date the shop can actually deliver on, which is
  // tomorrow once today's cut-off has passed.
  const [deliveryDate, setDeliveryDate] = useState(() => earliestStandardDate(clock))
  const [deliveryWindow, setDeliveryWindow] = useState("")

  /**
   * 11:59 is pre-order only, and tonight's list closes in the afternoon.
   * Once it has closed the picker will not offer tonight at all; before it
   * opens, tonight is offered with a note, because a customer who came in at
   * 10am is most likely planning tonight and should be told when to return
   * rather than silently pushed to tomorrow.
   */
  /**
   * Standard delivery keeps the shop's own promise: "order before 6pm and it
   * arrives today". After 6pm today is gone, and before then a window has to
   * be far enough ahead to actually make and drive the order — so at 1pm the
   * 2pm slot is no longer offered. Without this the site sold deliveries it
   * could not make, including windows that had already passed.
   */
  const windows = windowsFor(deliveryDate, clock)
  const standardMinDate = earliestStandardDate(clock)
  const sameDayClosed = deliveryDate === today && windows.length === 0

  const midnightStatus = midnight ? midnightAvailability(deliveryDate, clock) : "open"
  // Computed without reference to the current choice, because it is needed
  // in the handler that makes 11:59 the choice.
  const midnightMinDate =
    midnightAvailability(today, clock) === "closed" ? clock.tomorrow : today
  const minDate = midnight ? midnightMinDate : standardMinDate
  const chooseDelivery = (option: HttpTypes.StoreCartShippingOption) => {
    setShippingId(option.id)
    const floor = isMidnightOption(option) ? midnightMinDate : standardMinDate
    if (deliveryDate < floor) setDeliveryDate(floor)
  }

  /**
   * Publish the chosen option so the summary beside the form can price it.
   * The cart carries no shipping method until the order is placed, so the
   * summary would otherwise quote a total with the delivery fee missing.
   */
  // Keep the chosen window inside what is still deliverable: picking a later
  // date reopens the morning slots, and today's slots fall away as the day
  // goes on.
  useEffect(() => {
    if (!windows.length) return
    if (!windows.includes(deliveryWindow)) setDeliveryWindow(windows[0])
  }, [windows, deliveryWindow])

  useEffect(() => {
    setSelectedDelivery(
      selectedOption
        ? { amount: selectedOption.amount ?? 0, name: selectedOption.name ?? "" }
        : null
    )
  }, [selectedOption])

  return (
    <form action={formAction} className="flex flex-col gap-8">
      {/* So the confirmation page opens in the language they ordered in. */}
      <input type="hidden" name="segment" value={segment} />
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
          <label className={labelClass} htmlFor="recipient_phone">
            {t("checkout.recipientPhone")}
          </label>
          {/* The driver's only way to reach the door. Separate from the
              sender's number on purpose: most orders here are gifts, and
              ringing the buyer from outside the recipient's building helps
              nobody. dir="ltr" for the same reason as the sender's field. */}
          <input id="recipient_phone" name="recipient_phone" required type="tel"
            inputMode="tel" dir="ltr" maxLength={FIELD_LIMITS.phone}
            className={`${fieldClass} text-start`}
            placeholder={t("checkout.phonePlaceholder")} />
          <p className="text-xs text-ink-500">{t("checkout.recipientPhoneHelp")}</p>
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

        {/* Delivery choice comes before date and time because choosing 11:59
            rewrites both — the date becomes "the night before" and the time
            is fixed. Put after them, the change happened off-screen. */}
        <fieldset className="flex flex-col gap-2">
          <legend className={`${labelClass} mb-1.5`}>
            {t("checkout.speed")}
          </legend>
          {shippingOptions.map((option) => (
            <label
              key={option.id}
              className="flex min-h-[3.25rem] cursor-pointer items-center justify-between gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3 has-[:checked]:border-blush-500 has-[:checked]:ring-2 has-[:checked]:ring-blush-200"
            >
              <span className="flex items-start gap-3">
                <input type="radio" name="shipping_option_id"
                  value={option.id} required
                  checked={shippingId === option.id}
                  onChange={() => chooseDelivery(option)}
                  className="mt-1 h-4 w-4 accent-blush-600" />
                <span className="flex flex-col">
                  <span className="text-base text-ink-900">
                    {isMidnightOption(option) ? t("midnight.name") : option.name}
                  </span>
                  {isMidnightOption(option) && (
                    <span className="text-sm text-ink-600">{t("midnight.pitch")}</span>
                  )}
                </span>
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
          <label className={labelClass} htmlFor="delivery_notes">
            {t("checkout.instructions")}{" "}
            <span className="font-normal text-ink-500">
              {t("checkout.optional")}
            </span>
          </label>
          {/* Floor, gate code, "call before you arrive". These used to have to
              be squeezed into the address box, where the driver may not read
              them. */}
          <input id="delivery_notes" name="delivery_notes"
            maxLength={FIELD_LIMITS.instructions}
            className={fieldClass}
            placeholder={t("checkout.instructionsPlaceholder")} />
        </div>

        <div className="grid grid-cols-1 gap-4 xsmall:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="delivery_date">
              {midnight ? t("midnight.dateLabel") : t("checkout.date")}
            </label>
            <input id="delivery_date" name="delivery_date" type="date"
              min={minDate} value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              required
              className={fieldClass} />
            {!midnight && sameDayClosed && (
              <p className="text-xs text-ink-500">{t("checkout.sameDayClosed")}</p>
            )}
            {midnight && (
              <p className="text-xs text-ink-500">
                {midnightStatus === "not-yet"
                  ? t("midnight.notYetTonight")
                  : minDate !== today
                    ? t("midnight.closedTonight")
                    : t("midnight.dateHint")}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="delivery_window">
              {t("checkout.time")}
            </label>
            {midnight ? (
              <>
                {/* The time is the whole point of 11:59, so it is shown as a
                    fact rather than offered as a choice — and still submitted,
                    so the label and receipt print it. */}
                <div className={`${fieldClass} flex flex-col justify-center gap-0.5 bg-blush-50 py-2`}>
                  <span className="font-semibold text-blush-700">
                    {t("midnight.window")}
                  </span>
                  <span className="text-xs text-ink-600">
                    {t("midnight.preorder")}
                  </span>
                </div>
                <p className="text-xs text-ink-500">{t("midnight.preorderHint")}</p>
                <input type="hidden" name="delivery_window" value={MIDNIGHT_WINDOW} />
              </>
            ) : (
              <select id="delivery_window" name="delivery_window"
                value={deliveryWindow} onChange={(e) => setDeliveryWindow(e.target.value)}
                className={fieldClass}>
                {windows.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            )}
          </div>
        </div>


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
        {/* Pre-contract information, as Qatar's e-commerce law asks for at
            the point of ordering: what the customer is agreeing to, that the
            price is final, and that they can still change their mind. Links
            open in the same tab on purpose — a half-filled form survives a
            back navigation, and a new tab on a phone is where forms go to be
            forgotten. */}
        <p className="text-center text-xs leading-relaxed text-ink-500">
          {t("checkout.agree")}{" "}
          <LocalizedClientLink href="/terms" className={legalLinkClass}>
            {t("footer.terms")}
          </LocalizedClientLink>{" "}
          {t("common.and")}{" "}
          <LocalizedClientLink href="/privacy" className={legalLinkClass}>
            {t("footer.privacy")}
          </LocalizedClientLink>
          . {t("checkout.cancelNote")}{" "}
          <LocalizedClientLink href="/returns" className={legalLinkClass}>
            {t("footer.returns")}
          </LocalizedClientLink>
          .
        </p>
        <p className="text-center text-xs leading-relaxed text-ink-500">
          {t("checkout.pricesNote")}
        </p>
      </div>
    </form>
  )
}
