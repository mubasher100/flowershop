import { getTranslations, TranslationKey } from "@lib/i18n/dictionary"

/**
 * Delivery reassurance strip.
 *
 * Sits directly under the hero because in flower gifting the blocking question
 * is almost never "is it pretty" — it is "will it arrive in time". Answering
 * that before the product rails is the single highest-value thing above the
 * fold.
 */

const PROMISES: { title: TranslationKey; detail: TranslationKey }[] = [
  { title: "strip.sameDay", detail: "strip.sameDayDetail" },
  { title: "strip.hour", detail: "strip.hourDetail" },
  { title: "strip.arranged", detail: "strip.arrangedDetail" },
  { title: "strip.note", detail: "strip.noteDetail" },
]

const DeliveryStrip = ({ segment }: { segment?: string }) => {
  const { t } = getTranslations(segment)

  return (
    <section className="border-y border-ink-200/70 bg-white">
      <div className="content-container py-6 small:py-8">
        {/* Scrolls sideways on a phone and contains no links, so without a
            tabindex a keyboard user could reach the first promise and no
            further — the rest was unreachable. Focusable, named, and it keeps
            a visible ring like everything else. */}
        <ul
          tabIndex={0}
          role="group"
          aria-label={t("promise.title")}
          className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blush-700 small:mx-0 small:grid small:grid-cols-4 small:gap-6 small:overflow-visible small:px-0"
        >
          {PROMISES.map((promise) => (
            <li
              key={promise.title}
              // Key is the translation key, not the rendered text, so a
              // language switch reuses the nodes instead of remounting them.
              className="w-[13rem] flex-none snap-start rounded-xl bg-blush-50 p-4 small:w-auto small:bg-transparent small:p-0"
            >
              <p className="text-sm font-semibold text-ink-900">
                {t(promise.title)}
              </p>
              <p className="mt-1 text-sm leading-snug text-ink-600">
                {t(promise.detail)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default DeliveryStrip
