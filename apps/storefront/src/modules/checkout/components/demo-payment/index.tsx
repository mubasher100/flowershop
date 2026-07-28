"use client"

import { useTranslations } from "@lib/i18n/use-translations"
import { clx } from "@modules/common/components/ui"
import { useState } from "react"

/**
 * A simulated card payment, for demonstrating the checkout flow.
 *
 * SkipCash is the real provider and is blocked on a merchant account; until
 * then orders are confirmed on WhatsApp. This exists so the card path can be
 * shown to someone without waiting for that.
 *
 * It is built so it cannot be mistaken for, or misused as, real payment:
 *
 *   - The card number is fixed, read-only, and a well-known test value. There
 *     is nowhere to type a real card, which is the only way to be sure nobody
 *     does. A form that merely *said* "test mode" over an editable field would
 *     eventually take somebody's real card details.
 *   - Nothing is sent anywhere. The outcome is chosen explicitly and resolved
 *     locally; no card data enters application state, a request, or an order.
 *   - The banner is unmissable and stays on screen throughout.
 *
 * `paymentRef` is what the parent records on the order, so a demo order is
 * always distinguishable from a real one later.
 */

const TEST_CARD = "4242 4242 4242 4242"
const TEST_EXPIRY = "12 / 34"
const TEST_CVC = "123"

export type DemoPaymentResult = {
  status: "approved"
  reference: string
}

export default function DemoPayment({
  amount,
  onApproved,
}: {
  amount: string
  onApproved: (result: DemoPaymentResult) => void
}) {
  const { t } = useTranslations()
  const [state, setState] = useState<"idle" | "processing" | "declined">("idle")

  const run = (outcome: "approve" | "decline") => {
    setState("processing")

    // A beat of latency, because an instant result does not demonstrate what
    // a real gateway feels like.
    window.setTimeout(() => {
      if (outcome === "decline") {
        setState("declined")
        return
      }
      setState("idle")
      onApproved({
        status: "approved",
        // Prefixed so it is obvious in the admin that no money moved.
        reference: `DEMO-${Math.floor(Math.random() * 1e8)
          .toString()
          .padStart(8, "0")}`,
      })
    }, 1400)
  }

  const field =
    "min-h-[2.75rem] w-full rounded-xl border border-ink-200 bg-ink-50 px-4 text-base text-ink-700"

  return (
    <div className="flex flex-col gap-4 rounded-2xl border-2 border-dashed border-champagne-500 p-4">
      <p
        role="status"
        className="rounded-xl bg-champagne-100 px-4 py-3 text-sm font-medium text-ink-900"
      >
        {t("pay.testBanner")}
      </p>

      <div className="grid grid-cols-1 gap-3 xsmall:grid-cols-2">
        <div className="flex flex-col gap-1.5 xsmall:col-span-2">
          <label htmlFor="demo-card" className="text-sm font-medium text-ink-800">
            {t("pay.cardNumber")}
          </label>
          {/* readOnly, not disabled: a disabled field is skipped by the
              keyboard, so a screen reader user would never hear the test card
              or the note explaining why it cannot be changed. */}
          <input
            id="demo-card"
            readOnly
            value={TEST_CARD}
            dir="ltr"
            aria-describedby="demo-card-note"
            className={`${field} tabular-nums text-start`}
          />
          <p id="demo-card-note" className="text-xs text-ink-500">
            {t("pay.testCardNote")}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="demo-exp" className="text-sm font-medium text-ink-800">
            {t("pay.expiry")}
          </label>
          <input
            id="demo-exp"
            readOnly
            value={TEST_EXPIRY}
            dir="ltr"
            className={`${field} tabular-nums text-start`}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="demo-cvc" className="text-sm font-medium text-ink-800">
            {t("pay.cvc")}
          </label>
          <input
            id="demo-cvc"
            readOnly
            value={TEST_CVC}
            dir="ltr"
            className={`${field} tabular-nums text-start`}
          />
        </div>
      </div>

      {state === "declined" && (
        <p
          role="alert"
          className="rounded-xl border border-blush-300 bg-blush-50 px-4 py-3 text-sm text-blush-800"
        >
          {t("pay.declined")}
        </p>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">
          {t("pay.outcome")}
        </legend>
        <div className="flex flex-col gap-2 xsmall:flex-row">
          <button
            type="button"
            disabled={state === "processing"}
            onClick={() => run("approve")}
            className={clx(
              "inline-flex min-h-[3rem] flex-1 items-center justify-center rounded-full bg-blush-600 px-6 text-base font-semibold text-white transition-colors hover:bg-blush-700",
              state === "processing" && "opacity-60"
            )}
          >
            {state === "processing"
              ? t("pay.processing")
              : t("pay.payNow", { amount })}
          </button>
          <button
            type="button"
            disabled={state === "processing"}
            onClick={() => run("decline")}
            className="inline-flex min-h-[3rem] items-center justify-center rounded-full border border-ink-200 px-6 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50"
          >
            {t("pay.decline")}
          </button>
        </div>
      </fieldset>
    </div>
  )
}
