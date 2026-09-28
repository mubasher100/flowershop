"use client"

import { addToCart } from "@lib/data/cart"
import { useIntersection } from "@lib/hooks/use-in-view"
import { useTranslations } from "@lib/i18n/use-translations"
import { bumpCartCount, refreshCartCount } from "@lib/util/cart-events"
import { enqueueCartMutation } from "@lib/util/cart-queue"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@modules/common/components/ui"
import Divider from "@modules/common/components/divider"
import OptionSelect from "@modules/products/components/product-actions/option-select"
import Personalisation from "@modules/products/components/personalisation"
import { isEqual } from "lodash"
import { useParams, usePathname, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import ProductPrice from "../product-price"
import MobileActions from "./mobile-actions"
import { track } from "@modules/common/components/analytics"
import { useRouter } from "next/navigation"

type ProductActionsProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  disabled?: boolean
}

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
) => {
  return variantOptions?.reduce((acc: Record<string, string>, varopt) => {
    if (varopt.option_id) acc[varopt.option_id] = varopt.value
    return acc
  }, {})
}

export default function ProductActions({
  product,
  disabled,
}: ProductActionsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [options, setOptions] = useState<Record<string, string | undefined>>({})
  const [justAdded, setJustAdded] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [giftNote, setGiftNote] = useState("")
  const countryCode = useParams().countryCode as string
  const { t } = useTranslations()

  // If there is only 1 variant, preselect the options
  useEffect(() => {
    if (product.variants?.length === 1) {
      const variantOptions = optionsAsKeymap(product.variants[0].options)
      setOptions(variantOptions ?? {})
    }
  }, [product.variants])

  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return
    }

    return product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  // update the options when a variant is selected
  const setOptionValue = (optionId: string, value: string) => {
    setOptions((prev) => ({
      ...prev,
      [optionId]: value,
    }))
  }

  //check if the selected options produce a valid variant
  const isValidVariant = useMemo(() => {
    return product.variants?.some((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const value = isValidVariant ? selectedVariant?.id : null

    if (params.get("v_id") === value) {
      return
    }

    if (value) {
      params.set("v_id", value)
    } else {
      params.delete("v_id")
    }

    router.replace(pathname + "?" + params.toString())
  }, [selectedVariant, isValidVariant])

  // check if the selected variant is in stock
  const inStock = useMemo(() => {
    // If we don't manage inventory, we can always add to cart
    if (selectedVariant && !selectedVariant.manage_inventory) {
      return true
    }

    // If we allow back orders on the variant, we can add to cart
    if (selectedVariant?.allow_backorder) {
      return true
    }

    // If there is inventory available, we can add to cart
    if (
      selectedVariant?.manage_inventory &&
      (selectedVariant?.inventory_quantity || 0) > 0
    ) {
      return true
    }

    // Otherwise, we can't add to cart
    return false
  }, [selectedVariant])

  const actionsRef = useRef<HTMLDivElement>(null)

  const inView = useIntersection(actionsRef, "0px")

  /**
   * Adding to the bag is optimistic.
   *
   * The Store API's add-to-cart takes around 2.8s — it is a workflow that
   * validates the variant, checks inventory, reprices and refreshes the cart.
   * Blocking the button on that meant three seconds of dead spinner after
   * every tap, which reads as broken rather than slow.
   *
   * The badge moves and the button confirms immediately; the request settles
   * behind it, and reconciles the badge against the server when it lands. A
   * failure rolls the badge back and shows the error here.
   */
  const handleAddToCart = () => {
    if (!selectedVariant?.id) return

    const metadata = {
      ...(giftNote.trim() ? { gift_note: giftNote.trim() } : {}),
    }

    // Confirm before the request, not after. The button is deliberately not
    // disabled while it runs: blocking it for the 2.8s the Store API takes
    // is what made a working button feel broken, and adding twice is a
    // legitimate thing to want.
    setAddError(null)
    bumpCartCount(1)
    setJustAdded(true)
    track("add_to_cart", {
      currency: "QAR",
      value: selectedVariant.calculated_price?.calculated_amount ?? 0,
      items: [
        {
          item_id: product.handle,
          item_name: product.title,
          item_variant: selectedVariant.title,
          quantity: 1,
        },
      ],
    })
    window.setTimeout(() => setJustAdded(false), 2500)

    // Cleared straight away — leaving it filled in implies it still applies
    // to the page, and the next bouquet is usually for someone else.
    setGiftNote("")

    // Queued, not fired directly: concurrent adds each create their own cart
    // when none has the cookie yet. See lib/util/cart-queue.ts.
    enqueueCartMutation(() =>
      addToCart({
        variantId: selectedVariant.id,
        quantity: 1,
        countryCode,
        metadata,
      })
    )
      // Reconcile against the server once this add has actually landed,
      // rather than on a timer that could race a later one.
      .then(() => refreshCartCount())
      .catch((error) => {
        bumpCartCount(-1)
        setJustAdded(false)
        setAddError(
          error instanceof Error ? error.message : t("product.addFailed")
        )
      })
  }

  return (
    <>
      <div className="flex flex-col gap-y-2" ref={actionsRef}>
        <div>
          {(product.variants?.length ?? 0) > 1 && (
            <div className="flex flex-col gap-y-4">
              {(product.options || []).map((option) => {
                return (
                  <div key={option.id}>
                    <OptionSelect
                      option={option}
                      current={options[option.id]}
                      updateOption={setOptionValue}
                      title={option.title ?? ""}
                      data-testid="product-options"
                      disabled={!!disabled}
                    />
                  </div>
                )
              })}
              <Divider />
            </div>
          )}
        </div>

        <ProductPrice product={product} variant={selectedVariant} />

        {/* Live stock, straight from the variant's inventory_quantity — so a
            stock change in the admin shows here as soon as the cache is
            revalidated. Scarcity is only stated when it is true; inventing
            urgency on a well-stocked item is a dark pattern. */}
        {selectedVariant &&
          selectedVariant.manage_inventory &&
          !selectedVariant.allow_backorder && (
            <p
              className="text-sm"
              aria-live="polite"
              data-testid="stock-counter"
            >
              {(selectedVariant.inventory_quantity ?? 0) <= 0 ? (
                <span className="font-medium text-ink-600">
                  {t("product.soldOutSize")}
                </span>
              ) : (selectedVariant.inventory_quantity ?? 0) <= 5 ? (
                <span className="font-medium text-blush-700">
                  {t("product.onlyLeft", {
                    count: selectedVariant.inventory_quantity ?? 0,
                  })}
                </span>
              ) : (
                <span className="text-sage-700">
                  {t("product.inStock", {
                    count: selectedVariant.inventory_quantity ?? 0,
                  })}
                </span>
              )}
            </p>
          )}

        {/* Sits above the buy button: it is part of deciding what to send,
            not an afterthought once the order is placed. */}
        <Personalisation
          note={giftNote}
          onNoteChange={setGiftNote}
          disabled={!!disabled}
        />

        {addError && (
          <p
            role="alert"
            className="rounded-xl border border-blush-300 bg-blush-50 px-4 py-3 text-sm text-blush-800"
          >
            {addError}
          </p>
        )}

        <Button
          onClick={handleAddToCart}
          disabled={
            !inStock ||
            !selectedVariant ||
            !!disabled ||

            !isValidVariant
          }
          variant="primary"
          className="w-full"
          // Deliberately not isLoading: the add is optimistic, so a spinner
          // would be showing work the shopper does not have to wait for.
          data-testid="add-product-button"
        >
          {/* Order matters. The original checked `!selectedVariant && !options`
              first — but `options` is a truthy object whenever the product has
              any, so nothing-selected fell through to "Out of stock". Every
              product here has a size ladder, so every product read as sold out
              until a size was picked, with 100 in stock. */}
          {!selectedVariant
            ? t("product.selectSize")
            : !inStock || !isValidVariant
            ? t("product.outOfStock")
            : justAdded
            ? t("product.added")
            : t("product.addToBag")}
        </Button>
        <MobileActions
          product={product}
          variant={selectedVariant}
          options={options}
          updateOptions={setOptionValue}
          inStock={inStock}
          handleAddToCart={handleAddToCart}
          isAdding={false}
          show={!inView}
          optionsDisabled={!!disabled}
        />
      </div>
    </>
  )
}
