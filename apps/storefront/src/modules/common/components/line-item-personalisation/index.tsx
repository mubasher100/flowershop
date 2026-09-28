"use client"

import { useTranslations } from "@lib/i18n/use-translations"

/**
 * The gift message carried on a line item.
 *
 * Renders nothing when there is none, so a plain order stays plain.
 */
export default function LineItemPersonalisation({
  metadata,
}: {
  metadata?: Record<string, unknown> | null
}) {
  const { t } = useTranslations()

  const note = typeof metadata?.gift_note === "string" ? metadata.gift_note : ""

  if (!note) return null

  return (
    <div className="mt-1 flex flex-col gap-0.5 text-sm text-ink-600">
      <p className="italic">
        <span className="not-italic text-ink-500">
          {t("personalise.note")}:{" "}
        </span>
        “{note}”
      </p>
    </div>
  )
}
