import { getTranslations } from "@lib/i18n/dictionary"
import { Heading, Text } from "@modules/common/components/ui"

import InteractiveLink from "@modules/common/components/interactive-link"

const EmptyCartMessage = ({ segment }: { segment?: string }) => {
  const { t } = getTranslations(segment)

  return (
    // py-48 pushed the call to action most of a phone screen below the
    // heading; the whole message now fits above the fold at 375px.
    <div
      className="flex flex-col items-start justify-center px-2 py-20"
      data-testid="empty-cart-message"
    >
      <Heading
        level="h1"
        className="flex flex-row text-3xl-regular gap-x-2 items-baseline"
      >
        {t("cart.title")}
      </Heading>
      <Text className="text-base-regular mt-4 mb-6 max-w-[32rem]">
        {t("cart.emptyBody")}
      </Text>
      <div>
        <InteractiveLink href="/store">{t("cart.browse")}</InteractiveLink>
      </div>
    </div>
  )
}

export default EmptyCartMessage
