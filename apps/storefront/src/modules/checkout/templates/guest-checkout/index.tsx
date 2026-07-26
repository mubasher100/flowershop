"use client"

import { HttpTypes } from "@medusajs/types"
import { useActionState } from "react"

import { convertToLocale } from "@lib/util/money"
import { placeGuestOrder, GuestOrderState } from "@lib/data/guest-order"

/**
 * Guest checkout.
 *
 * One screen: who you are, where it goes, when. No account, no email, no
 * online payment — the shopkeeper checks stock and confirms on WhatsApp,
 * so the phone number is the only truly required contact detail.
 */

/** Doha municipalities and the districts people actually name. */
const AREAS = [
  "Al Dafna", "West Bay", "The Pearl", "Lusail", "Msheireb", "Al Sadd",
  "Bin Mahmoud", "Al Waab", "Aziziya", "Al Rayyan", "Umm Salal",
  "Al Wakrah", "Al Khor", "Education City", "Old Airport", "Muaither",
]

const WINDOWS = [
  "10am – 12pm", "12pm – 2pm", "2pm – 4pm",
  "4pm – 6pm", "6pm – 8pm", "8pm – 9pm",
]

const labelClass = "text-sm font-medium text-ink-800"
const fieldClass =
  "min-h-[3rem] w-full rounded-xl border border-ink-200 bg-white px-4 text-base text-ink-900 placeholder:text-ink-400 focus:border-blush-500 focus:outline-none focus:ring-2 focus:ring-blush-200"

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

  // Today, in Qatar, as a yyyy-mm-dd bound for the date picker.
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Qatar",
  })

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="font-display text-2xl text-ink-900">Your details</h2>
          <p className="mt-1 text-sm text-ink-600">
            We&apos;ll confirm your order on WhatsApp once we&apos;ve checked
            the flowers are in stock.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="name">
            Your name
          </label>
          <input id="name" name="name" required autoComplete="name"
            className={fieldClass} placeholder="Full name" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="phone">
            WhatsApp number
          </label>
          <input id="phone" name="phone" required type="tel"
            inputMode="tel" autoComplete="tel"
            className={fieldClass} placeholder="e.g. 3312 3456" />
          <p className="text-xs text-ink-500">
            This is how we reach you — please make sure it&apos;s on WhatsApp.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl text-ink-900">Delivery</h2>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="recipient">
            Who is it for? <span className="font-normal text-ink-500">(optional)</span>
          </label>
          <input id="recipient" name="recipient" className={fieldClass}
            placeholder="Leave blank if it's for you" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="area">
            Area
          </label>
          <select id="area" name="area" required defaultValue="" className={fieldClass}>
            <option value="" disabled>Choose an area</option>
            {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="address">
            Building, street and any landmark
          </label>
          <textarea id="address" name="address" required rows={3}
            className={`${fieldClass} py-3`}
            placeholder="Villa 12, Street 850, near Al Sadd Sports Club" />
        </div>

        <div className="grid grid-cols-1 gap-4 xsmall:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="delivery_date">
              Delivery date
            </label>
            <input id="delivery_date" name="delivery_date" type="date"
              min={today} defaultValue={today} className={fieldClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="delivery_window">
              Preferred time
            </label>
            <select id="delivery_window" name="delivery_window"
              defaultValue={WINDOWS[0]} className={fieldClass}>
              {WINDOWS.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className={`${labelClass} mb-1.5`}>Delivery speed</legend>
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
            Gift note <span className="font-normal text-ink-500">(optional)</span>
          </label>
          <textarea id="gift_note" name="gift_note" rows={3} maxLength={300}
            className={`${fieldClass} py-3`}
            placeholder="We'll write this by hand and seal it with the flowers." />
        </div>
      </section>

      {state.error && (
        <p role="alert"
          className="rounded-xl border border-blush-300 bg-blush-50 px-4 py-3 text-sm text-blush-800">
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <button type="submit" disabled={pending}
          className="inline-flex min-h-[3.25rem] items-center justify-center rounded-full bg-blush-600 px-8 text-base font-semibold text-white transition-colors hover:bg-blush-700 disabled:opacity-60">
          {pending ? "Sending your order…" : "Place order"}
        </button>
        <p className="text-center text-sm text-ink-600">
          Nothing is charged now. We&apos;ll confirm availability and payment
          with you on WhatsApp.
        </p>
      </div>
    </form>
  )
}
