import { getTranslations, TranslationKey } from "@lib/i18n/dictionary"

/**
 * Delivery reassurance strip.
 *
 * Sits directly under the hero because in flower gifting the blocking question
 * is almost never "is it pretty" — it is "will it arrive in time". Answering
 * that before the product rails is the single highest-value thing above the
 * fold.
 */

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
}

/** Line icons drawn to the same weight as the bottom nav's, in brand wine. */
const ICONS: Record<string, React.ReactNode> = {
  truck: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7">
      <path {...stroke} d="M3 7h10v9H3zM13 10h4l3 3v3h-7z" />
      <circle {...stroke} cx="7" cy="17.5" r="1.6" />
      <circle {...stroke} cx="17" cy="17.5" r="1.6" />
    </svg>
  ),
  flower: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7">
      <path {...stroke} d="M12 13c-2.5 0-4.5-2-4.5-4.5C7.5 6 9 4 12 3c3 1 4.5 3 4.5 5.5C16.5 11 14.5 13 12 13z" />
      <path {...stroke} d="M12 13v8M12 17c-2 0-4-1-5-3M12 17c2 0 4-1 5-3" />
    </svg>
  ),
  gift: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7">
      <path {...stroke} d="M4 11h16v9H4zM3 7h18v4H3zM12 7v13" />
      <path {...stroke} d="M12 7c-1.5-3-5-3-5-1s3 1 5 1zM12 7c1.5-3 5-3 5-1s-3 1-5 1z" />
    </svg>
  ),
  heart: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7">
      <path {...stroke} d="M12 20c-4.5-3-8-6-8-9.8A4 4 0 0 1 12 8a4 4 0 0 1 8 2.2C20 14 16.5 17 12 20z" />
    </svg>
  ),
}

const PROMISES: { title: TranslationKey; detail: TranslationKey; icon: string }[] = [
  { title: "strip.sameDay", detail: "strip.sameDayDetail", icon: "truck" },
  { title: "strip.hour", detail: "strip.hourDetail", icon: "flower" },
  { title: "strip.arranged", detail: "strip.arrangedDetail", icon: "gift" },
  { title: "strip.note", detail: "strip.noteDetail", icon: "heart" },
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
          // role="list", not "group": a role on a <ul> replaces its implicit
          // one, so "group" left every <li> inside it orphaned — an <li> with
          // no list parent, which is its own WCAG failure. This keeps the list
          // semantics while still naming the region.
          role="list"
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
              <div className="flex items-start gap-3">
                <span className="flex-none text-blush-600">{ICONS[promise.icon]}</span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-900">
                    {t(promise.title)}
                  </p>
                  <p className="mt-0.5 text-sm leading-snug text-ink-600">
                    {t(promise.detail)}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default DeliveryStrip
