import Image from "next/image"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { clx } from "@modules/common/components/ui"

/**
 * The store name, as a string. Page titles, the sr-only h1, the footer line.
 *
 * Still overridable from the environment so a future rename is a variable,
 * not a code change — but the default is now the real brand.
 */
export const BRAND_NAME =
  process.env.NEXT_PUBLIC_BRAND_NAME?.trim() || "Tulips and Truffles"

/** The tagline from the brand reference. Used under the wordmark and in metadata. */
export const BRAND_TAGLINE = "Beautiful blooms. Thoughtful gifts. Happier moments."

/**
 * The wordmark.
 *
 * Renders the supplied logotype — copper serif with a rose script "and"
 * flourish between the words — rather
 * than setting the name in a webfont, because the mark's metallic lettering is
 * the identity and no font reproduces it. It ships as a transparent WebP with a
 * PNG fallback, at two sizes so the header does not download the hero's copy.
 *
 * The name is the image's alt text and the link's accessible name, so screen
 * readers and search engines still get the words, not "logo".
 */
export default function Brand({
  className,
  href = "/",
  size = "header",
}: {
  className?: string
  href?: string
  /** header: ~140px wide on a phone. hero: the full-width mark. */
  size?: "header" | "hero"
}) {
  const hero = size === "hero"

  return (
    <LocalizedClientLink
      href={href}
      className={clx(
        "inline-flex min-h-[2.75rem] items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blush-700",
        className
      )}
      data-testid="nav-store-link"
      aria-label={BRAND_NAME}
    >
      <Image
        src={hero ? "/brand/logo.webp" : "/brand/logo-sm.webp"}
        alt={BRAND_NAME}
        // Intrinsic ratio of the trimmed mark is 5.83:1. Height drives the
        // header size; width follows so nothing squashes.
        width={hero ? 1600 : 480}
        height={hero ? 274 : 82}
        priority={hero}
        className={clx(
          "h-auto w-auto",
          hero
            ? "max-h-[3.25rem] xsmall:max-h-[4.5rem] small:max-h-[6rem]"
            : "max-h-[1.55rem] small:max-h-[1.75rem]"
        )}
      />
    </LocalizedClientLink>
  )
}
