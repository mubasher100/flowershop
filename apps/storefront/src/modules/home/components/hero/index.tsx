import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * Homepage hero.
 *
 * Built mobile-first: the copy stack and CTAs sit within thumb reach on a
 * phone, and the decorative art is CSS rather than an image so there is no
 * hero-sized download on mobile data. Swap in campaign photography when it
 * exists — the layout already reserves the space.
 */
const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-blush-50">
      {/* Decorative wash — carries no meaning, so hidden from assistive tech. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 85% 0%, var(--blush-200) 0%, transparent 55%), radial-gradient(90% 70% at 0% 100%, var(--sage-100) 0%, transparent 60%)",
        }}
      />

      <div className="content-container relative flex flex-col gap-5 py-14 small:min-h-[30rem] small:justify-center small:gap-7 small:py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blush-700">
          Doha · Same-day delivery
        </p>

        <h1 className="max-w-[16ch] text-balance text-4xl font-normal leading-[1.08] text-ink-900 small:text-6xl">
          Flowers worth the journey
        </h1>

        <p className="max-w-[46ch] text-base leading-relaxed text-ink-600 small:text-lg">
          Arranged the morning they&apos;re delivered, from a Doha studio.
          Order before 6pm and it arrives today.
        </p>

        <div className="flex flex-col gap-3 pt-1 xsmall:flex-row">
          <LocalizedClientLink
            href="/store"
            className="inline-flex min-h-[3rem] items-center justify-center rounded-full bg-blush-600 px-7 text-base font-semibold text-white transition-colors hover:bg-blush-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blush-700"
          >
            Shop all flowers
          </LocalizedClientLink>
          <LocalizedClientLink
            href="/collections/best-sellers"
            className="inline-flex min-h-[3rem] items-center justify-center rounded-full border border-blush-300 px-7 text-base font-semibold text-blush-700 transition-colors hover:bg-blush-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blush-700"
          >
            Best sellers
          </LocalizedClientLink>
        </div>
      </div>
    </section>
  )
}

export default Hero
