import { HttpTypes } from "@medusajs/types"
import { Text } from "@modules/common/components/ui"

type LineItemOptionsProps = {
  variant: HttpTypes.StoreProductVariant | undefined
  "data-testid"?: string
  "data-value"?: HttpTypes.StoreProductVariant
}

/**
 * Medusa's placeholder titles for a product with no real sizes. Every flower
 * is single-size today, so the starter's "Variant: One size" line sat under
 * every item in the bag and on every order, telling the customer nothing.
 */
const PLACEHOLDER_TITLE = /^(one size|default)/i

const LineItemOptions = ({
  variant,
  "data-testid": dataTestid,
  "data-value": dataValue,
}: LineItemOptionsProps) => {
  const title = variant?.title?.trim()

  if (!title || PLACEHOLDER_TITLE.test(title)) {
    return null
  }

  // Just the size, with no "Variant:" label: the title already reads as one
  // ("Large", "50 stems"), and the label was English on the Arabic site.
  return (
    <Text
      data-testid={dataTestid}
      data-value={dataValue}
      className="inline-block txt-medium text-ui-fg-subtle w-full overflow-hidden text-ellipsis"
    >
      {title}
    </Text>
  )
}

export default LineItemOptions
