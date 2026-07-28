import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { clx } from "@modules/common/components/ui"

/**
 * The wordmark.
 *
 * Still the only place the store name is written, but it now comes from an
 * environment variable so the real brand can be set without touching code:
 * set the `BRAND_NAME` repo variable and redeploy.
 *
 * Not fetched from the backend, deliberately. The name appears in the header
 * and footer of every page, so reading it at runtime would put a round trip on
 * every render — and the homepage render is already up against the Worker's
 * CPU allowance. A build-time value costs nothing.
 *
 * "Flowershop" remains the placeholder until the name is decided; see roadmap
 * phase 6.
 */
export const BRAND_NAME =
  process.env.NEXT_PUBLIC_BRAND_NAME?.trim() || "Flowershop"

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
