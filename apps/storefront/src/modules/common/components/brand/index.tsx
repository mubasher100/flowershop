import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { clx } from "@modules/common/components/ui"

/**
 * The wordmark.
 *
 * Deliberately the only place the store name is written, so replacing
 * "Flowershop" with the real brand — or swapping in a logo — is a one-file
 * change. See roadmap phase 6; the name is still undecided.
 */
export const BRAND_NAME = "Flowershop"

export default function Brand({
  className,
  href = "/",
}: {
  className?: string
  href?: string
}) {
  return (
    <LocalizedClientLink
      href={href}
      className={clx(
        "inline-flex min-h-[2.75rem] items-center font-display text-2xl tracking-tight text-ink-900 transition-colors hover:text-blush-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blush-700 small:text-2xl",
        className
      )}
      data-testid="nav-store-link"
    >
      {BRAND_NAME}
    </LocalizedClientLink>
  )
}
