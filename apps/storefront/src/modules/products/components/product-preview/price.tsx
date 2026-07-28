import { clx } from "@modules/common/components/ui"
import { VariantPrice } from "types/global"

export default async function PreviewPrice({ price }: { price: VariantPrice }) {
  if (!price) {
    return null
  }

  return (
    <>
      {price.price_type === "sale" && (
        <span className="text-ink-500 line-through" data-testid="original-price">
          {price.original_price}
        </span>
      )}
      {/* tabular-nums so prices align down a rail instead of jittering. */}
      <span
        className={clx("font-semibold tabular-nums text-ink-900", {
          "text-blush-700": price.price_type === "sale",
        })}
        data-testid="price"
      >
        {price.calculated_price}
      </span>
    </>
  )
}
