import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { clx } from "@modules/common/components/ui"

/**
 * Full-width promotional banner.
 *
 * Floward's homepage alternates these with product rails — banner, rail,
 * banner, rail — which is what stops a long page of carousels reading as one
 * undifferentiated list. Their banners are photography; ours are CSS gradients
 * until real campaign shots exist, so the layout is right and the art swaps in
 * without touching structure.
 */
export type PromoBannerProps = {
  eyebrow?: string
  title: string
  body?: string
  ctaLabel: string
  href: string
  /** Two-stop gradient drawn from brand tokens. */
  from: string
  to: string
  /** Dark art needs light type. */
  tone?: "light" | "dark"
  /** Short banners break up rails; tall ones anchor the page. */
  size?: "standard" | "tall"
}

export default function PromoBanner({
  eyebrow,
  title,
  body,
  ctaLabel,
  href,
  from,
  to,
  tone = "dark",
  size = "standard",
}: PromoBannerProps) {
  const onDark = tone === "light"

  return (
    <section className="content-container py-4 small:py-6">
      <LocalizedClientLink
        href={href}
        className="group block rounded-3xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blush-700"
      >
        <div
          className={clx(
            "relative flex flex-col justify-end overflow-hidden rounded-3xl p-6 small:p-10",
            size === "tall"
              ? "min-h-[22rem] small:min-h-[30rem]"
              : "min-h-[15rem] small:min-h-[20rem]"
          )}
          style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
        >
          {/* Scrim keeps the type legible whatever the art becomes. */}
          <div
            aria-hidden="true"
            className={clx(
              "pointer-events-none absolute inset-0",
              onDark
                ? "bg-gradient-to-t from-black/45 via-black/10 to-transparent"
                : "bg-gradient-to-t from-white/55 via-white/10 to-transparent"
            )}
          />

          <div className="relative flex max-w-[34ch] flex-col gap-2">
            {eyebrow && (
              <span
                className={clx(
                  "text-xs font-semibold uppercase tracking-[0.16em]",
                  onDark ? "text-white/80" : "text-ink-700"
                )}
              >
                {eyebrow}
              </span>
            )}

            <h2
              className={clx(
                "text-balance text-2xl leading-tight small:text-4xl",
                onDark ? "text-white" : "text-ink-900"
              )}
            >
              {title}
            </h2>

            {body && (
              <p
                className={clx(
                  "text-sm leading-relaxed small:text-base",
                  onDark ? "text-white/85" : "text-ink-700"
                )}
              >
                {body}
              </p>
            )}

            <span
              className={clx(
                "mt-3 inline-flex min-h-[2.75rem] w-fit items-center rounded-full px-6 text-sm font-semibold transition-transform group-hover:-translate-y-0.5",
                onDark ? "bg-white text-ink-900" : "bg-ink-900 text-white"
              )}
            >
              {ctaLabel}
            </span>
          </div>
        </div>
      </LocalizedClientLink>
    </section>
  )
}
