"use client"

import { HttpTypes } from "@medusajs/types"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import DemoPayment from "@modules/checkout/components/demo-payment"
import {
  DELIVERY_AREAS as AREAS,
  FIELD_LIMITS,
  MIDNIGHT_WINDOW,
  earliestStandardDate,
  isMidnightOption,
  isStandardOption,
  midnightAvailability,
  qatarClock,
  windowsFor,
} from "@lib/util/delivery"
import { setSelectedDelivery } from "@lib/util/delivery-selection"
import { readCheckoutDraft, saveCheckoutDraft } from "@lib/util/checkout-draft"
import type { DayAvailability } from "@lib/data/delivery-availability"

import { convertToLocale } from "@lib/util/money"
import { bagIsEmpty, placeOrderRequest } from "@lib/util/cart-api"
import {
  deliveryAddressFor,
  whatsappLink,
  whatsappOrderMessage,
} from "@lib/util/whatsapp-order"
import { useTranslations } from "@lib/i18n/use-translations"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import PageLoading from "@modules/common/components/page-loading"
import SampleCardButton from "@modules/common/components/sample-card"

/**
 * The demo card gateway is opt-in. Without this flag the checkout is exactly
 * as before — one form, confirmed on WhatsApp — so a simulated payment can
 * never appear on a live storefront by accident.
 */
const DEMO_PAYMENT_ENABLED = process.env.NEXT_PUBLIC_DEMO_PAYMENT === "true"

/**
 * Card payment before the order (SkipCash). On, "Place order" goes to the
 * card page and WhatsApp waits for the confirmation page — nothing is
 * ordered until payment goes through, so there is nothing to send yet.
 */
const ONLINE_PAYMENT = process.env.NEXT_PUBLIC_ONLINE_PAYMENT === "skipcash"

/** The shop's WhatsApp, digits only. Unset means no hand-off. */
const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP?.replace(/\D/g, "") || null

/** The plain fields kept for the round trip to SkipCash (checkout-draft). */
const DRAFT_FIELDS = [
  "name",
  "phone",
  "email",
  "recipient",
  "recipient_phone",
  "area",
  "address",
  "delivery_notes",
  "gift_note",
  "anonymous",
]


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
const cardClass =
  "flex flex-col gap-4 rounded-2xl border border-ink-100 bg-white p-4 shadow-sm small:p-6"
const choiceClass =
  "flex min-h-[3.25rem] cursor-pointer items-start gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3 has-[:checked]:border-blush-500 has-[:checked]:ring-2 has-[:checked]:ring-blush-200"
const fieldClass =
  "min-h-[3rem] w-full rounded-xl border border-ink-200 bg-white px-4 text-base text-ink-900 placeholder:text-ink-500 focus:border-blush-500 focus:outline-none focus:ring-2 focus:ring-blush-200"

export default function GuestCheckout({
  cart,
  shippingOptions,
  availability = [],
}: {
  cart: HttpTypes.StoreCart
  shippingOptions: HttpTypes.StoreCartShippingOption[]
  /** What the shop can still take, per day, for the coming weeks. */
  availability?: DayAvailability[]
}) {
  const [orderError, setOrderError] = useState<string | undefined>()
  const [pending, setPending] = useState(false)
  const [placedWithoutReply, setPlacedWithoutReply] = useState(false)
  const router = useRouter()

  const { t, segment } = useTranslations()
  const [payMethod, setPayMethod] = useState<"whatsapp" | "card">("whatsapp")
  const [forSomeoneElse, setForSomeoneElse] = useState(false)

  /**
   * "Use my current location": the phone's GPS as a Google Maps link, sent in
   * the WhatsApp message and kept on the order. Optional — the customer can
   * always drop a pin in the chat instead — so every failure is a sentence,
   * never a blocker.
   */
  const [pin, setPin] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState<string | null>(null)
  const locateMe = () => {
    setLocateError(null)
    if (!("geolocation" in navigator)) {
      setLocateError(t("checkout.locateFailed"))
      return
    }
    setLocating(true)
    const found = (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude.toFixed(6)
      const lng = pos.coords.longitude.toFixed(6)
      setPin(`https://www.google.com/maps?q=${lat},${lng}`)
      setLocating(false)
    }
    const failed = (err: GeolocationPositionError) => {
      setLocateError(
        err.code === err.PERMISSION_DENIED
          ? t("checkout.locateBlocked")
          : t("checkout.locateUnavailable")
      )
      setLocating(false)
    }
    // A phone answers from GPS. A computer has none: it asks the operating
    // system, which guesses from Wi-Fi — and asking it for GPS accuracy
    // usually just times out. So a failed precise fix is retried at normal
    // accuracy before giving up (it worked on phones and failed on PCs).
    navigator.geolocation.getCurrentPosition(
      found,
      (err) =>
        err.code === err.PERMISSION_DENIED
          ? failed(err)
          : navigator.geolocation.getCurrentPosition(found, failed, {
              enableHighAccuracy: false,
              timeout: 15000,
              maximumAge: 300000,
            }),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    )
  }

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
  const [noteLength, setNoteLength] = useState(0)

  // Today, in Qatar, as a yyyy-mm-dd bound for the date picker.
  const clock = qatarClock()
  const today = clock.date
  // Starts at the first date the shop can actually deliver on, which is
  // tomorrow once today's cut-off has passed.
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const earliest = earliestStandardDate(clock)
    const open = availability.find((d) => d.date >= earliest && !d.closed && !d.full)
    return open?.date ?? earliest
  })
  const [deliveryWindow, setDeliveryWindow] = useState("")

  /**
   * 11:59 is pre-order only, and tonight's list closes in the afternoon.
   * Once it has closed the picker will not offer tonight at all; before it
   * opens, tonight is offered with a note, because a customer who came in at
   * 10am is most likely planning tonight and should be told when to return
   * rather than silently pushed to tomorrow.
   */
  /**
   * Standard delivery keeps the shop's own promise: "order before 8pm and it
   * arrives today". After 8pm today is gone, and before then a window has to
   * be far enough ahead to actually make and drive the order — an hour's
   * notice, so at 2pm the 2pm slot is no longer offered. Without this the site sold deliveries it
   * could not make, including windows that had already passed.
   */
  /**
   * A day the shop has closed or already filled cannot be chosen, and a
   * window with no room left is not offered. The server re-checks both when
   * the order is placed — this is so the customer never picks one.
   */
  const dayState = new Map(availability.map((d) => [d.date, d]))
  const unavailable = (date: string) => {
    const day = dayState.get(date)
    return !!day && (day.closed || day.full)
  }
  const firstOpen = (from: string) => {
    const candidates = availability.map((d) => d.date).filter((d) => d >= from)
    return candidates.find((d) => !unavailable(d)) ?? from
  }

  const clockWindows = windowsFor(deliveryDate, clock)
  const fullWindows = dayState.get(deliveryDate)?.full_windows ?? []
  const windows = clockWindows.filter((w) => !fullWindows.includes(w))
  const standardMinDate = firstOpen(earliestStandardDate(clock))
  const sameDayClosed = deliveryDate === today && windows.length === 0
  const dayClosed = unavailable(deliveryDate)

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

  // Whatever was typed before the trip to SkipCash, back in the form. The
  // plain fields are written straight into the inputs once the render that
  // restores the gift checkbox has put the recipient's fields on the page.
  const formRef = useRef<HTMLFormElement>(null)
  const [draftFields, setDraftFields] = useState<Record<string, string> | null>(null)
  useEffect(() => {
    const draft = readCheckoutDraft(cart.id)
    if (!draft) return
    const option = shippingOptions.find((o) => o.id === draft.shippingId)
    if (option) setShippingId(option.id)
    const floor = isMidnightOption(option) ? midnightMinDate : standardMinDate
    if (draft.deliveryDate >= floor) setDeliveryDate(draft.deliveryDate)
    // Checked against what is still offered by the effect above.
    if (draft.deliveryWindow) setDeliveryWindow(draft.deliveryWindow)
    setForSomeoneElse(draft.forSomeoneElse)
    setPin(draft.pin)
    setDraftFields(draft.fields)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    const form = formRef.current
    if (!draftFields || !form) return
    for (const [name, value] of Object.entries(draftFields)) {
      const el = form.elements.namedItem(name)
      if (el instanceof HTMLInputElement && el.type === "checkbox") {
        el.checked = value === "true"
      } else if (
        (el instanceof HTMLInputElement ||
          el instanceof HTMLTextAreaElement ||
          el instanceof HTMLSelectElement) &&
        !el.value
      ) {
        el.value = value
      }
    }
    setDraftFields(null)
  }, [draftFields])

  // Back from SkipCash without a paid order: say so, with the bag intact.
  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get("payment")
    if (reason) setOrderError(t("checkout.paymentFailed"))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Back from SkipCash with the browser's back button: the page comes out of
  // the back/forward cache exactly as it was left — mid-submit, the button
  // still saying it is sending. Nothing is in flight any more, so free it.
  useEffect(() => {
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) setPending(false)
    }
    window.addEventListener("pageshow", restored)
    return () => window.removeEventListener("pageshow", restored)
  }, [])

  useEffect(() => {
    setSelectedDelivery(
      selectedOption
        ? { amount: selectedOption.amount ?? 0, name: selectedOption.name ?? "" }
        : null
    )
  }, [selectedOption])

  /**
   * The order, as the WhatsApp message the shop receives — built from the
   * form and the bag because the order does not exist yet. The confirmation
   * page offers the same message again with the order number on it.
   */
  const buildWhatsappLink = (data: FormData) => {
    if (!WHATSAPP) return null
    const s = (k: string) => String(data.get(k) ?? "").trim()
    const delivery = selectedOption?.amount ?? 0
    return whatsappLink(
      WHATSAPP,
      whatsappOrderMessage({
        currencyCode: cart.currency_code,
        items: (cart.items ?? []).map((item) => ({
          quantity: item.quantity,
          title: item.product_title ?? item.title,
          size: item.variant_title,
          total: item.total,
          note: (item.metadata as Record<string, unknown> | null)?.gift_note as
            | string
            | undefined,
        })),
        deliveryName: selectedOption?.name,
        deliveryAmount: delivery,
        total: (cart.total ?? 0) - (cart.shipping_subtotal ?? 0) + delivery,
        date: s("delivery_date"),
        window: s("delivery_window"),
        area: s("area"),
        address: deliveryAddressFor(s("address"), true),
        locationUrl: pin,
        instructions: s("delivery_notes"),
        recipientName: (forSomeoneElse && s("recipient")) || s("name"),
        // Unticked "gift for someone else": it goes to the customer.
        recipientPhone: forSomeoneElse ? s("recipient_phone") : s("phone"),
        giftNote: s("gift_note"),
        anonymous: data.get("anonymous") === "true",
        contactName: s("name"),
        contactPhone: s("phone"),
        locationOnWhatsapp: true,
      })
    )
  }

  /**
   * Place the order and open WhatsApp, in the one tap.
   *
   * WhatsApp has to open inside the tap itself: a phone only hands a link to
   * the WhatsApp app on a user gesture, and a redirect after the order had
   * saved left customers on WhatsApp's web page instead. The order request
   * is started first, so it is already on its way when WhatsApp takes the
   * screen.
   *
   * The order goes to a route, not a Server Action, so a checkout opened
   * before a deploy can still place it (lib/util/cart-api.ts). The browser's
   * own required-field checks have already passed by the time this runs.
   */
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return

    const data = new FormData(event.currentTarget)
    setOrderError(undefined)
    setPending(true)

    // Kept for the round trip to SkipCash: Back, or a declined card, reloads
    // this page empty (lib/util/checkout-draft.ts).
    saveCheckoutDraft({
      cartId: cart.id,
      fields: Object.fromEntries(
        DRAFT_FIELDS.map((name) => [name, String(data.get(name) ?? "")])
      ),
      forSomeoneElse,
      pin,
      shippingId,
      deliveryDate,
      deliveryWindow,
    })

    const request = placeOrderRequest(data)
    const whatsapp = ONLINE_PAYMENT ? null : buildWhatsappLink(data)
    if (whatsapp) window.open(whatsapp, "_blank", "noopener")

    request.then(async (result) => {
      // Off to SkipCash. The button stays busy: the page is leaving.
      if (result.payUrl) {
        window.location.assign(result.payUrl)
        return
      }
      if (result.redirect) {
        router.push(result.redirect)
        return
      }
      // The reply was lost — most likely the phone switched to WhatsApp and
      // the page was suspended. If the bag is now an order, it went through:
      // say so, rather than invite a second attempt.
      if (result.unreachable && (await bagIsEmpty())) {
        setPlacedWithoutReply(true)
        setPending(false)
        return
      }
      setOrderError(
        result.error ?? t("err.orderFailed")
      )
      setPending(false)
    })
  }

  /**
   * The next fortnight as tappable days, the way delivery apps offer them.
   * The native date input this replaced was also what pushed the page wider
   * than an iPhone's screen: iOS gives it an intrinsic width a grid will not
   * shrink.
   */
  // Named here rather than through Intl: the server's and the browser's
  // Arabic date data differ, and the mismatch broke hydration on /ar-qa.
  const names = segment.startsWith("ar") ? AR_DATE_NAMES : EN_DATE_NAMES
  // Four weeks, matching the availability the page asks for: Black Friday
  // shoppers order early and reserve a day after it, which a fortnight from
  // mid-November did not reach.
  const days = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(`${today}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + i)
    const value = d.toISOString().slice(0, 10)
    return {
      value,
      top:
        i === 0
          ? t("checkout.today")
          : i === 1
            ? t("checkout.tomorrow")
            : names.days[d.getUTCDay()],
      bottom: `${names.digits(d.getUTCDate())} ${names.months[d.getUTCMonth()]}`,
      off: value < minDate || unavailable(value),
    }
  })

  /**
   * Each step shows a tick once everything required in it is filled in,
   * read straight from the browser's own validity so it can never disagree
   * with what the form will accept.
   */
  const detailsRef = useRef<HTMLElement>(null)
  const whereRef = useRef<HTMLElement>(null)
  const [done, setDone] = useState({ details: false, where: false })
  const recheck = () => {
    const ok = (el: HTMLElement | null) =>
      !!el &&
      Array.from(
        el.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
          "input, select, textarea"
        )
      ).every((f) => f.checkValidity())
    setDone({ details: ok(detailsRef.current), where: ok(whereRef.current) })
  }
  useEffect(() => {
    recheck()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forSomeoneElse, draftFields])

  const deliveryAmount = selectedOption?.amount ?? 0
  const total = (cart.total ?? 0) - (cart.shipping_subtotal ?? 0) + deliveryAmount

  return (
    <form ref={formRef} onSubmit={handleSubmit} onInput={recheck} onChange={recheck}
      className="flex flex-col gap-5">
      {/* Covers the page from the tap until the card page (or the
          confirmation) takes over — saving the order and opening the payment
          take a few seconds, and a button that only changes its words did
          not read as "something is happening". Back from SkipCash, the
          pageshow handler clears pending and with it this. */}
      {pending && (
        <PageLoading overlay
          message={ONLINE_PAYMENT ? t("checkout.toPayment") : t("checkout.placing")} />
      )}
      {/* So the confirmation page opens in the language they ordered in. */}
      <input type="hidden" name="segment" value={segment} />

      <section ref={detailsRef} className={cardClass} aria-labelledby="step-details">
        <StepHeading id="step-details" n={1} done={done.details} doneLabel={t("checkout.stepDone")}>
          {t("checkout.yourDetails")}
        </StepHeading>
        <p className="-mt-2 text-sm text-ink-600">{t("checkout.detailsHelp")}</p>

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

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="email">
            {t("checkout.email")}{" "}
            <span className="font-normal text-ink-500">
              {t("checkout.optional")}
            </span>
          </label>
          {/* Optional on purpose: the shop reaches people on WhatsApp, and a
              required address would cost orders. Given one, we send a written
              confirmation — the only record a guest checkout can leave. */}
          <input id="email" name="email" type="email" inputMode="email"
            autoComplete="email" dir="ltr" maxLength={FIELD_LIMITS.email}
            className={`${fieldClass} text-start`}
            placeholder={t("checkout.emailPlaceholder")} />
          <p className="text-xs text-ink-500">{t("checkout.emailHelp")}</p>
        </div>
      </section>

      <section ref={whereRef} className={cardClass} aria-labelledby="step-where">
        <StepHeading id="step-where" n={2} done={done.where} doneLabel={t("checkout.stepDone")}>
          {t("checkout.whereTo")}
        </StepHeading>

        {/* Who it goes to, behind a checkbox (the shop's request, 2 Nov 2026).
            Unticked, the order is delivered to the person placing it and the
            driver calls their number; ticked, the recipient's name and phone
            appear. The server applies the same rule, so an unticked form never
            needs a second phone number. */}
        <label className={choiceClass}>
          <input type="checkbox" name="for_someone_else" value="true"
            checked={forSomeoneElse}
            onChange={(e) => setForSomeoneElse(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-blush-600" />
          <span className="flex flex-col">
            <span className="text-base text-ink-900">{t("checkout.forSomeoneElse")}</span>
            <span className="text-sm text-ink-600">{t("checkout.forSomeoneElseHint")}</span>
          </span>
        </label>

        {forSomeoneElse && (
          <div className="flex flex-col gap-4 border-s-2 border-blush-200 ps-4">
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
              {/* The driver's only way to reach the door when it is a gift.
                  dir="ltr" for the same reason as the sender's field. */}
              <input id="recipient_phone" name="recipient_phone" required type="tel"
                inputMode="tel" dir="ltr" maxLength={FIELD_LIMITS.phone}
                className={`${fieldClass} text-start`}
                placeholder={t("checkout.phonePlaceholder")} />
              <p className="text-xs text-ink-500">{t("checkout.recipientPhoneHelp")}</p>
            </div>
          </div>
        )}

        {/* The pin first: one tap, and the shop has the exact spot. */}
        <div className="flex flex-col gap-1.5">
          <button type="button" onClick={locateMe} disabled={locating}
            className={`flex min-h-[3.5rem] w-full items-center gap-3 rounded-xl border px-4 text-start transition-colors disabled:opacity-60 ${
              pin
                ? "border-sage-400 bg-sage-50"
                : "border-blush-300 bg-blush-50 hover:border-blush-500"
            }`}>
            <span aria-hidden="true" className="text-xl">{pin ? "✅" : "📍"}</span>
            <span className="flex flex-col">
              <span className="text-base font-semibold text-ink-900">
                {locating ? t("checkout.locating") : pin ? t("checkout.located") : t("checkout.locateMe")}
              </span>
              {pin && !locating && (
                <span className="text-sm text-blush-700 underline underline-offset-2">
                  {t("checkout.relocate")}
                </span>
              )}
            </span>
          </button>
          {pin && (
            <a href={pin} target="_blank" rel="noopener noreferrer"
              className={`${legalLinkClass} self-start text-sm`}>
              {t("checkout.viewOnMap")}
            </a>
          )}
          {locateError && (
            <p role="alert" className="text-sm text-blush-700">{locateError}</p>
          )}
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

        {/* The exact location always comes on WhatsApp (the shop's rule since
            2 Nov 2026), so the street is optional and there is nothing to tick:
            the order says the location is to follow, and the label and the
            shop's email show it. A pin from "Use my current location" rides
            along in the WhatsApp message and on the order. */}
        <input type="hidden" name="location_on_whatsapp" value="true" />
        <input type="hidden" name="location_url" value={pin ?? ""} />

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="address">
            {t("checkout.address")}{" "}
            <span className="font-normal text-ink-500">
              {t("checkout.optional")}
            </span>
          </label>
          <textarea id="address" name="address" rows={2}
            maxLength={FIELD_LIMITS.address}
            aria-describedby="location-note"
            className={`${fieldClass} py-3`}
            placeholder={t("checkout.addressPlaceholder")} />
          <p id="location-note" className="text-sm font-medium text-blush-700">
            {t("checkout.locationNote")}
          </p>
        </div>

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
      </section>

      <section className={cardClass} aria-labelledby="step-when">
        <StepHeading id="step-when" n={3}
          done={!dayClosed && (midnight || windows.length > 0)}
          doneLabel={t("checkout.stepDone")}>
          {t("checkout.when")}
        </StepHeading>

        {/* Delivery choice comes before date and time because choosing 11:59
            rewrites both — the date becomes "the night before" and the time
            is fixed. Put after them, the change happened off-screen. */}
        <fieldset className="flex flex-col gap-2">
          <legend className={`${labelClass} mb-1.5`}>
            {t("checkout.speed")}
          </legend>
          {shippingOptions.map((option) => (
            <label key={option.id}
              className={`${choiceClass} items-center justify-between`}>
              <span className="flex items-start gap-3">
                <input type="radio" name="shipping_option_id"
                  value={option.id} required
                  checked={shippingId === option.id}
                  onChange={() => chooseDelivery(option)}
                  className="mt-1 h-5 w-5 shrink-0 accent-blush-600" />
                <span className="flex flex-col">
                  <span className="text-base text-ink-900">
                    {isMidnightOption(option)
                      ? t("midnight.name")
                      : isStandardOption(option)
                        ? t("delivery.standardName")
                        : option.name}
                  </span>
                  {isMidnightOption(option) && (
                    <span className="text-sm text-ink-600">{t("midnight.pitch")}</span>
                  )}
                </span>
              </span>
              <span className="shrink-0 tabular-nums text-ink-700">
                {/* Delivery is free for now (1 Nov 2026), and "QAR 0.00"
                    reads as a missing price rather than a free one. */}
                {option.amount
                  ? convertToLocale({
                      amount: option.amount,
                      currency_code: cart.currency_code,
                    })
                  : t("checkout.free")}
              </span>
            </label>
          ))}
        </fieldset>

        <fieldset className="flex min-w-0 flex-col gap-1.5">
          <legend className={`${labelClass} mb-1.5`}>
            {midnight ? t("midnight.dateLabel") : t("checkout.date")}
          </legend>
          {/* A sideways-scrolling row inside the card; the page itself never
              scrolls sideways. Each day is a real radio, so it submits and is
              announced like one. */}
          <div className="flex snap-x gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
            {days.map((d) => (
              <label key={d.value}
                className={`flex min-h-[3.75rem] w-[4.5rem] shrink-0 snap-start flex-col items-center justify-center rounded-xl border text-center transition-colors ${
                  d.off
                    ? "cursor-not-allowed border-ink-100 bg-ink-50 text-ink-500 line-through"
                    : "cursor-pointer border-ink-200 bg-white text-ink-900 has-[:checked]:border-blush-600 has-[:checked]:bg-blush-600 has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blush-300"
                }`}>
                <input type="radio" name="delivery_date" value={d.value}
                  required disabled={d.off}
                  checked={deliveryDate === d.value}
                  onChange={() => setDeliveryDate(d.value)}
                  className="sr-only" />
                <span className="text-xs font-medium">{d.top}</span>
                <span className="text-sm font-semibold">{d.bottom}</span>
                {d.off && <span className="sr-only">{t("checkout.dayUnavailable")}</span>}
              </label>
            ))}
          </div>
          {dayClosed && (
            <p className="text-sm font-medium text-blush-700">
              {t("checkout.dayClosed")}
            </p>
          )}
          {!midnight && !dayClosed && sameDayClosed && (
            <p className="text-sm text-ink-600">{t("checkout.sameDayClosed")}</p>
          )}
          {midnight && (
            <p className="text-sm text-ink-600">
              {midnightStatus === "not-yet"
                ? t("midnight.notYetTonight")
                : minDate !== today
                  ? t("midnight.closedTonight")
                  : t("midnight.dateHint")}
            </p>
          )}
        </fieldset>

        {midnight ? (
          <div className="flex flex-col gap-1.5">
            <p className={labelClass}>{t("checkout.time")}</p>
            {/* The time is the whole point of 11:59, so it is shown as a
                fact rather than offered as a choice — and still submitted,
                so the label and receipt print it. */}
            <div className="flex flex-col gap-0.5 rounded-xl border border-blush-300 bg-blush-50 px-4 py-3">
              <span className="font-semibold text-blush-700">{t("midnight.window")}</span>
              <span className="text-sm text-ink-600">{t("midnight.preorder")}</span>
            </div>
            <p className="text-sm text-ink-600">{t("midnight.preorderHint")}</p>
            <input type="hidden" name="delivery_window" value={MIDNIGHT_WINDOW} />
          </div>
        ) : (
          windows.length > 0 && (
            <fieldset className="flex flex-col gap-1.5">
              <legend className={`${labelClass} mb-1.5`}>{t("checkout.time")}</legend>
              <div className="grid grid-cols-2 gap-2">
                {windows.map((w) => (
                  <label key={w}
                    className="flex min-h-[3rem] cursor-pointer items-center justify-center rounded-xl border border-ink-200 bg-white px-2 text-center text-sm font-medium text-ink-900 transition-colors has-[:checked]:border-blush-600 has-[:checked]:bg-blush-600 has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blush-300">
                    <input type="radio" name="delivery_window" value={w} required
                      checked={deliveryWindow === w}
                      onChange={() => setDeliveryWindow(w)}
                      className="sr-only" />
                    <span dir="ltr">{w}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )
        )}
      </section>

      <section className={cardClass} aria-labelledby="step-card">
        <StepHeading id="step-card" n={4} done={false} doneLabel={t("checkout.stepDone")}>
          {t("checkout.cardMessage")}{" "}
          <span className="font-sans text-base font-normal text-ink-500">
            {t("checkout.optional")}
          </span>
        </StepHeading>

        <div className="flex flex-col gap-1.5">
          <label className="sr-only" htmlFor="gift_note">
            {t("checkout.giftNote")}
          </label>
          <textarea id="gift_note" name="gift_note" rows={3}
            maxLength={FIELD_LIMITS.giftNote}
            onInput={(e) => setNoteLength(e.currentTarget.value.length)}
            className={`${fieldClass} py-3`}
            placeholder={t("checkout.giftNotePlaceholder")} />
          <p className="text-end text-xs tabular-nums text-ink-500" aria-hidden="true">
            {noteLength}/{FIELD_LIMITS.giftNote}
          </p>
          {/* Reads the field when tapped: it is uncontrolled, and a restored
              draft fills it without an input event. */}
          <SampleCardButton sourceId="gift_note" />
        </div>

        {/* Sending without a name is a normal thing to want from a flower
            shop. The florist still sees who ordered — this only keeps the
            name off the card and the delivery label. */}
        <label className={choiceClass}>
          <input type="checkbox" name="anonymous" value="true"
            className="mt-1 h-5 w-5 shrink-0 accent-blush-600" />
          <span className="flex flex-col">
            <span className="text-base text-ink-900">{t("checkout.anonymous")}</span>
            <span className="text-sm text-ink-600">{t("checkout.anonymousHint")}</span>
          </span>
        </label>
      </section>

      {orderError && (
        <p role="alert"
          className="rounded-xl border border-blush-300 bg-blush-50 px-4 py-3 text-sm text-blush-800">
          {orderError}
        </p>
      )}

      {placedWithoutReply && (
        <div role="status"
          className="flex flex-col gap-3 rounded-xl border border-sage-300 bg-sage-50 px-4 py-4 text-sm text-sage-800">
          <p className="text-base font-semibold">{t("checkout.placedTitle")}</p>
          <p>{t("checkout.placedBody")}</p>
          <LocalizedClientLink href="/" className={legalLinkClass}>
            {t("nav.home")}
          </LocalizedClientLink>
        </div>
      )}

      {/* Payment. The card path is a simulation, shown only when
          NEXT_PUBLIC_DEMO_PAYMENT is set, so it cannot appear on a real
          storefront by accident. */}
      {DEMO_PAYMENT_ENABLED && (
        <section className={cardClass}>
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
              <label key={value} className={choiceClass}>
                <input
                  type="radio"
                  name="payment_method"
                  value={value}
                  checked={payMethod === value}
                  onChange={() => {
                    setPayMethod(value)
                    setPaymentRef(null)
                  }}
                  className="mt-1 h-5 w-5 shrink-0 accent-blush-600"
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

      {/* The total and the button ride along the bottom of a phone screen
          while the form scrolls, like a delivery app's basket bar, and settle
          into place at the end. The safe-area padding keeps it clear of the
          iPhone's home bar. */}
      <div className="sticky bottom-0 z-20 -mx-4 border-t border-ink-100 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur small:static small:mx-0 small:border-0 small:bg-transparent small:p-0 small:backdrop-blur-none">
        <button
          type="submit"
          // Card selected means the simulated authorisation has to succeed
          // before the order can go in, which is the sequence a real gateway
          // enforces too.
          disabled={
            pending ||
            // Placed already, reply lost — a second tap would be a second order.
            placedWithoutReply ||
            dayClosed ||
            (!midnight && !windows.length) ||
            (DEMO_PAYMENT_ENABLED && payMethod === "card" && !paymentRef)
          }
          className="flex min-h-[3.5rem] w-full items-center justify-between gap-3 rounded-full bg-blush-600 px-6 text-base font-semibold text-white transition-colors hover:bg-blush-700 disabled:opacity-60">
          <span>
            {pending
              ? t("checkout.placing")
              : ONLINE_PAYMENT
                ? t("checkout.payAndPlace")
                : t("checkout.place")}
          </span>
          <span className="tabular-nums" dir="ltr">
            {convertToLocale({ amount: total, currency_code: cart.currency_code })}
          </span>
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-center text-sm text-ink-600">
          {ONLINE_PAYMENT ? t("checkout.payNote") : t("checkout.noCharge")}
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

      {/* For someone who came from "Checkout now" and wants another bouquet
          — the bag keeps what is already in it. It used to sit in the
          header, beside the logo (moved 9 Nov 2026, the shop's request). */}
      <div className="flex flex-col items-center gap-1 border-t border-ink-100 pt-5">
        <LocalizedClientLink
          href="/store"
          className="inline-flex min-h-[3rem] items-center justify-center rounded-full border border-blush-600 px-8 text-base font-semibold text-blush-700 transition-colors hover:bg-blush-50"
          data-testid="shop-more-link"
        >
          {t("checkout.shopMore")}
        </LocalizedClientLink>
        <p className="text-center text-xs text-ink-600">{t("checkout.shopMoreHint")}</p>
      </div>
    </form>
  )
}

const EN_DATE_NAMES = {
  days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  digits: (n: number) => String(n),
}
// Gulf usage: Gregorian month names, Arabic-Indic digits.
const AR_DATE_NAMES = {
  days: ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
  months: [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
  ],
  digits: (n: number) => String(n).replace(/\d/g, (c) => "٠١٢٣٤٥٦٧٨٩"[Number(c)]),
}

/** A step's heading: its number, turning into a tick once it is complete. */
function StepHeading({
  id,
  n,
  done,
  doneLabel,
  children,
}: {
  id: string
  n: number
  done: boolean
  doneLabel: string
  children: React.ReactNode
}) {
  return (
    <h2 id={id} className="flex items-center gap-3 font-display text-2xl text-ink-900">
      <span
        aria-hidden="true"
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-sans text-sm font-semibold transition-colors ${
          done ? "bg-sage-600 text-white" : "bg-blush-100 text-blush-700"
        }`}
      >
        {done ? "✓" : n}
      </span>
      <span>{children}</span>
      {done && <span className="sr-only">({doneLabel})</span>}
    </h2>
  )
}
