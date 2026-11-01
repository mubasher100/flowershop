"use client"

import { useTranslations } from "@lib/i18n/use-translations"
import { setBagLine } from "@lib/util/cart-api"
import { refreshCartCount } from "@lib/util/cart-events"
import { Spinner, Trash } from "@medusajs/icons"
import { clx } from "@modules/common/components/ui"
import { useRouter } from "next/navigation"
import { useState } from "react"

const DeleteButton = ({
  id,
  children,
  className,
  label,
}: {
  id: string
  children?: React.ReactNode
  className?: string
  /** Read by a screen reader, since the control is usually just a bin icon. */
  label?: string
}) => {
  const [isDeleting, setIsDeleting] = useState(false)
  const { t } = useTranslations()
  const router = useRouter()
  const name = label ?? t("cart.remove")

  const handleDelete = async (id: string) => {
    setIsDeleting(true)
    // A route, not a Server Action, so a bag opened before a deploy still
    // works after it (lib/util/cart-api.ts). That also means refreshing the
    // page here, which a Server Action used to do as a side effect.
    await setBagLine(id, 0)
      .then(() => router.refresh())
      .catch((_err) => {
        setIsDeleting(false)
      })
    // The badges only refetch on navigation or a cart event, and removing
    // an item is neither — the header kept saying "Bag (1)" over an empty bag.
    refreshCartCount()
  }

  return (
    <div
      className={clx(
        "flex items-center justify-between text-small-regular",
        className
      )}
    >
      <button
        type="button"
        aria-label={name}
        title={name}
        className="flex min-h-[2.75rem] items-center gap-x-1 text-ui-fg-subtle hover:text-ui-fg-base cursor-pointer"
        onClick={() => handleDelete(id)}
      >
        {isDeleting ? <Spinner className="animate-spin" /> : <Trash />}
        <span>{children}</span>
      </button>
    </div>
  )
}

export default DeleteButton
