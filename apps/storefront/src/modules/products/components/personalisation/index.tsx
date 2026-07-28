"use client"

import { useTranslations } from "@lib/i18n/use-translations"
import { clx } from "@modules/common/components/ui"

/**
 * Gift message and ribbon, chosen on the product page.
 *
 * The reference sites ask for both here rather than at checkout, and they are
 * right to: two bouquets in one order can go to two different people, so the
 * message belongs to the item, not the order. The checkout still has an
 * order-level note for delivery instructions.
 *
 * Both are optional and both are free — the homepage already promises a free
 * handwritten card, so charging for it here would be a surprise.
 */

export const RIBBONS = [
  { value: "blush", key: "ribbon.blush", swatch: "var(--blush-300)" },
  { value: "ivory", key: "ribbon.ivory", swatch: "#f2ece3" },
  { value: "sage", key: "ribbon.sage", swatch: "var(--sage-300)" },
  { value: "gold", key: "ribbon.gold", swatch: "#c9a227" },
  { value: "burgundy", key: "ribbon.burgundy", swatch: "#7b2135" },
] as const

export const NOTE_MAX = 200

export default function Personalisation({
  note,
  ribbon,
  onNoteChange,
  onRibbonChange,
  disabled,
}: {
  note: string
  ribbon: string
  onNoteChange: (value: string) => void
  onRibbonChange: (value: string) => void
  disabled?: boolean
}) {
  const { t } = useTranslations()

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-ink-200/70 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink-900">
          {t("personalise.heading")}
        </h2>
        <span className="text-xs text-ink-500">
          {t("personalise.optional")}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="gift-note"
          className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500"
        >
          {t("personalise.note")}
        </label>
        <textarea
          id="gift-note"
          rows={3}
          maxLength={NOTE_MAX}
          value={note}
          disabled={disabled}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder={t("personalise.notePlaceholder")}
          className="w-full rounded-xl border border-ink-200 px-3.5 py-3 text-base text-ink-900 placeholder:text-ink-500 focus:border-blush-500 focus:outline-none focus:ring-2 focus:ring-blush-200"
        />
        {/* aria-live so the remaining count is announced as it changes, but
            politely — it should not interrupt what is being typed. */}
        <p className="text-xs text-ink-500" aria-live="polite">
          {t("personalise.noteRemaining", { count: NOTE_MAX - note.length })}
        </p>
      </div>

      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">
          {t("personalise.ribbon")}
        </legend>
        <div className="flex flex-wrap gap-2">
          {/* "No ribbon" is a real choice rather than an empty default, so the
              control reads as answered either way. */}
          <button
            type="button"
            disabled={disabled}
            aria-pressed={ribbon === ""}
            onClick={() => onRibbonChange("")}
            className={clx(
              "inline-flex min-h-[2.75rem] items-center rounded-full border px-4 text-sm transition-colors",
              ribbon === ""
                ? "border-blush-600 bg-blush-50 font-medium text-blush-800"
                : "border-ink-200 text-ink-700 hover:border-blush-300 hover:bg-blush-50"
            )}
          >
            {t("personalise.ribbonNone")}
          </button>

          {RIBBONS.map((r) => {
            const active = ribbon === r.value
            return (
              <button
                key={r.value}
                type="button"
                disabled={disabled}
                aria-pressed={active}
                onClick={() => onRibbonChange(r.value)}
                className={clx(
                  "inline-flex min-h-[2.75rem] items-center gap-2 rounded-full border px-3.5 text-sm transition-colors",
                  active
                    ? "border-blush-600 bg-blush-50 font-medium text-blush-800"
                    : "border-ink-200 text-ink-700 hover:border-blush-300 hover:bg-blush-50"
                )}
              >
                <span
                  aria-hidden="true"
                  className="h-3.5 w-3.5 flex-none rounded-full ring-1 ring-inset ring-ink-900/15"
                  style={{ background: r.swatch }}
                />
                {t(r.key)}
              </button>
            )
          })}
        </div>
      </fieldset>
    </section>
  )
}
