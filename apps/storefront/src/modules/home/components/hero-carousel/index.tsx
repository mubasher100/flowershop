"use client"

import Image from "next/image"
import { useCallback, useEffect, useRef, useState } from "react"

import Brand from "@modules/common/components/brand"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { clx } from "@modules/common/components/ui"

/**
 * Hero carousel.
 *
 * The reference site opens with a rotating campaign banner, and it is what
 * carries the whole first impression — a static gradient could never do the
 * same work.
 *
 * Behaviour is native scroll-snap rather than a JS-driven transform: it gives
 * real swipe physics on a phone for free, keeps keyboard and screen-reader
 * navigation intact, and degrades to a plain scroller if JS never runs.
 * Autoplay pauses on hover, on focus, when the tab is hidden, and entirely
 * under prefers-reduced-motion.
 */

export type HeroSlide = {
  image: string
  alt: string
  eyebrow: string
  title: string
  body: string
  ctaLabel: string
  href: string
  /**
   * Render the wordmark in place of the title text. Used by the brand slide:
   * the logotype's metallic lettering is the identity, and no webfont sets it.
   * The title is still emitted for screen readers and the heading outline.
   */
  wordmark?: boolean
}

const AUTOPLAY_MS = 6000

export default function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  const goTo = useCallback((index: number) => {
    const track = trackRef.current
    if (!track) return
    track.scrollTo({
      left: track.clientWidth * index,
      behavior: "smooth",
    })
  }, [])

  // Track which slide is in view, so the dots follow a manual swipe too.
  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const index = Math.round(track.scrollLeft / track.clientWidth)
        setActive(Math.max(0, Math.min(slides.length - 1, index)))
      })
    }

    track.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      track.removeEventListener("scroll", onScroll)
      cancelAnimationFrame(frame)
    }
  }, [slides.length])

  useEffect(() => {
    if (paused || slides.length < 2) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const id = window.setInterval(() => {
      const next = (active + 1) % slides.length
      goTo(next)
    }, AUTOPLAY_MS)

    return () => window.clearInterval(id)
  }, [active, paused, slides.length, goTo])

  // Don't animate against a backgrounded tab.
  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden)
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [])

  if (!slides.length) return null

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured collections"
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        ref={trackRef}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
      >
        {slides.map((slide, i) => (
          <div
            key={slide.image}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${slides.length}`}
            className="relative w-full flex-none snap-start"
          >
            {/* Split composition, after the brand reference: dark type on
                blush with the photograph beside it, rather than white type
                over a darkened image. On a phone the photo comes first, since
                the flowers are what sell; from the small breakpoint the two
                sit side by side with the copy leading. */}
            <div className="bg-blush-50">
              <div className="content-container grid grid-cols-1 items-center gap-6 py-6 small:grid-cols-[1fr_1.15fr] small:gap-10 small:py-12">
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl small:order-2 small:aspect-[4/3]">
                  <Image
                    src={slide.image}
                    alt={slide.alt}
                    fill
                    // Only the first slide is above the fold on load.
                    priority={i === 0}
                    loading={i === 0 ? undefined : "lazy"}
                    sizes="(max-width: 1024px) 100vw, 55vw"
                    className="object-cover object-center"
                  />
                </div>

                <div className="flex flex-col items-start gap-4 small:order-1">
                  <span className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-blush-600">
                    {slide.eyebrow}
                  </span>

                  {slide.wordmark ? (
                    <>
                      <h2 className="sr-only">{slide.title}</h2>
                      <Brand size="hero" href={slide.href} />
                    </>
                  ) : (
                    <h2 className="text-balance font-display text-4xl leading-[1.05] text-ink-900 small:text-6xl">
                      {slide.title}
                    </h2>
                  )}

                  <p className="max-w-[44ch] text-sm uppercase leading-relaxed tracking-[0.16em] text-ink-700 small:text-base">
                    {slide.body}
                  </p>

                  <LocalizedClientLink
                    href={slide.href}
                    className="mt-2 inline-flex min-h-[3rem] w-fit items-center gap-3 rounded-full bg-blush-600 px-8 text-sm font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-blush-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blush-700"
                  >
                    {slide.ctaLabel}
                    <span aria-hidden="true" className="rtl:-scale-x-100">→</span>
                  </LocalizedClientLink>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Dots double as controls. 44px hit area, small visible mark. */}
      {slides.length > 1 && (
        <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1 small:bottom-4">
          {slides.map((slide, i) => (
            <button
              key={slide.image}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === active}
              className="group flex h-11 w-8 items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blush-700"
            >
              <span
                className={clx(
                  "block h-1.5 rounded-full transition-all duration-300",
                  i === active
                    ? "w-6 bg-blush-600"
                    : "w-1.5 bg-blush-300 group-hover:bg-blush-400"
                )}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
