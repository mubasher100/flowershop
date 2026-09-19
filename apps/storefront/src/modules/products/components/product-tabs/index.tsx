"use client"

import { TranslationKey } from "@lib/i18n/dictionary"
import { useTranslations } from "@lib/i18n/use-translations"
import Accordion from "./accordion"

/**
 * Product accordions.
 *
 * Replaces the starter's "Product Information / Shipping & Returns" pair,
 * which listed weight, dimensions and country of origin — specs that mean
 * nothing for a bouquet — alongside generic returns copy.
 *
 * These three answer what people actually hesitate over before buying
 * flowers: will they last, when will they arrive, and how do I pay.
 */

const listClass = "flex flex-col gap-2 text-sm leading-relaxed text-ink-600"

const CARE_POINTS: TranslationKey[] = [
  "care.trim",
  "care.water",
  "care.sun",
  "care.fruit",
  "care.leaves",
]

const DELIVERY_POINTS: TranslationKey[] = [
  "delivery.midnight",
  "delivery.window",
  "delivery.fresh",
  "delivery.confirm",
]

const PAYMENT_POINTS: TranslationKey[] = [
  "payment.nothingCharged",
  "payment.confirm",
  "payment.cardSoon",
]

const ProductTabs = () => {
  const { t } = useTranslations()

  const Points = ({ keys }: { keys: TranslationKey[] }) => (
    <ul className={listClass}>
      {keys.map((key) => (
        <li key={key}>{t(key)}</li>
      ))}
    </ul>
  )

  const tabs: { key: string; label: string; component: React.ReactNode }[] = [
    {
      key: "care",
      label: t("product.flowerCare"),
      component: (
        <div className="py-3">
          <Points keys={CARE_POINTS} />
        </div>
      ),
    },
    {
      key: "delivery",
      label: t("product.delivery"),
      component: (
        <div className="py-3">
          <ul className={listClass}>
            {/* The same-day promise leads, with the headline half emphasised —
                it is the one line most people open this accordion to find. */}
            <li>
              <span className="font-medium text-ink-800">
                {t("delivery.sameDayLabel")}
              </span>{" "}
              — {t("delivery.sameDayBody")}
            </li>
            {DELIVERY_POINTS.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
        </div>
      ),
    },
    {
      key: "payment",
      label: t("product.payment"),
      component: (
        <div className="py-3">
          <Points keys={PAYMENT_POINTS} />
        </div>
      ),
    },
  ]

  return (
    <div className="w-full">
      <Accordion type="multiple">
        {tabs.map((tab) => (
          // Keyed on a stable identifier rather than the label, so switching
          // language does not remount every panel and collapse what was open.
          <Accordion.Item
            key={tab.key}
            title={tab.label}
            headingSize="medium"
            value={tab.key}
          >
            {tab.component}
          </Accordion.Item>
        ))}
      </Accordion>
    </div>
  )
}

export default ProductTabs
