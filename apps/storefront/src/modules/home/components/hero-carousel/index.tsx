"use client"

import Image from "next/image"
import { useCallback, useEffect, useRef, useState } from "react"

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
            <div className="relative h-[26rem] w-full small:h-[34rem]">
              <Image
                src={slide.image}
                alt={slide.alt}
                fill
                // Only the first slide is above the fold on load.
                priority={i === 0}
                loading={i === 0 ? undefined : "lazy"}
                sizes="100vw"
                className="object-cover object-center"
              />

              {/* Scrim: the type has to stay readable over any photograph. */}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/5"
              />

              <div className="content-container absolute inset-x-0 bottom-0 pb-10 small:pb-16">
                <div className="flex max-w-[32ch] flex-col gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/85">
                    {slide.eyebrow}
                  </span>
                  <h2 className="text-balance font-display text-4xl leading-[1.05] text-white small:text-6xl">
                    {slide.title}
                  </h2>
                  <p className="max-w-[40ch] text-sm leading-relaxed text-white/90 small:text-base">
                    {slide.body}
                  </p>
                  <LocalizedClientLink
                    href={slide.href}
                    className="mt-2 inline-flex min-h-[3rem] w-fit items-center rounded-full bg-white px-7 text-base font-semibold text-ink-900 transition-colors hover:bg-blush-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    {slide.ctaLabel}
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
              className="group flex h-11 w-8 items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <span
                className={clx(
                  "block h-1.5 rounded-full transition-all duration-300",
                  i === active
                    ? "w-6 bg-white"
                    : "w-1.5 bg-white/55 group-hover:bg-white/80"
                )}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
