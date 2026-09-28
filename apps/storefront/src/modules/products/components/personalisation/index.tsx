"use client"

import { useTranslations } from "@lib/i18n/use-translations"

/**
 * The gift message, written on the product page.
 *
 * The reference sites ask for it here rather than at checkout, and they are
 * right to: two bouquets in one order can go to two different people, so the
 * message belongs to the item, not the order. The checkout still has an
 * order-level note for delivery instructions.
 *
 * It is optional and it is free — the homepage already promises a free
 * handwritten card, so charging for it here would be a surprise.
 *
 * A ribbon-colour picker used to sit below this. It was removed on the
 * shop's instruction: the florist ties whatever suits the arrangement, so
 * offering five named colours promised a choice nobody was tracking.
 */

export const NOTE_MAX = 200

export default function Personalisation({
  note,
  onNoteChange,
  disabled,
}: {
  note: string
  onNoteChange: (value: string) => void
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

        {/* What the florist will hand-write onto the card. Shown only once
            something has been typed, so an empty product page stays quiet —
            and it catches the line breaks and typos that are otherwise only
            discovered by the person receiving the flowers. */}
        {note.trim() && (
          <figure className="mt-1 rounded-xl border border-blush-200 bg-blush-50 px-4 py-3">
            <figcaption className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-blush-700">
              {t("personalise.preview")}
            </figcaption>
            <p className="mt-1.5 whitespace-pre-wrap font-display text-base leading-relaxed text-ink-900">
              {note}
            </p>
          </figure>
        )}
      </div>
    </section>
  )
}
