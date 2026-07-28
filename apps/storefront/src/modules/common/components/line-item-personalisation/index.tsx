"use client"

import { TranslationKey } from "@lib/i18n/dictionary"
import { useTranslations } from "@lib/i18n/use-translations"

/**
 * The gift message and ribbon carried on a line item.
 *
 * Renders nothing when neither was chosen, so a plain order stays plain.
 */
export default function LineItemPersonalisation({
  metadata,
}: {
  metadata?: Record<string, unknown> | null
}) {
  const { t } = useTranslations()

  const note = typeof metadata?.gift_note === "string" ? metadata.gift_note : ""
  const ribbon = typeof metadata?.ribbon === "string" ? metadata.ribbon : ""

  if (!note && !ribbon) return null

  return (
    <div className="mt-1 flex flex-col gap-0.5 text-sm text-ink-600">
      {ribbon && (
        <p>
          <span className="text-ink-500">{t("personalise.ribbon")}: </span>
          {t(`ribbon.${ribbon}` as TranslationKey)}
        </p>
      )}
      {note && (
        <p className="italic">
          <span className="not-italic text-ink-500">
            {t("personalise.note")}:{" "}
          </span>
          “{note}”
        </p>
      )}
    </div>
  )
}
