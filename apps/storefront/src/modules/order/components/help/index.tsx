import { getTranslations } from "@lib/i18n/dictionary"
import { Heading } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import React from "react"

// 44px tall: these are the links someone with a problem reaches for on a phone.
const linkClass =
  "inline-flex min-h-[2.75rem] items-center text-blush-700 underline-offset-4 hover:underline"

const Help = ({ segment }: { segment?: string }) => {
  const { t } = getTranslations(segment)

  return (
    <div className="mt-6">
      <Heading className="text-base-semi">{t("order.needHelp")}</Heading>
      <div className="text-base-regular my-2">
        <ul className="flex flex-col">
          <li>
            <LocalizedClientLink href="/contact" className={linkClass}>
              {t("order.helpContact")}
            </LocalizedClientLink>
          </li>
          <li>
            <LocalizedClientLink href="/returns" className={linkClass}>
              {t("order.helpReturns")}
            </LocalizedClientLink>
          </li>
        </ul>
      </div>
    </div>
  )
}

export default Help
