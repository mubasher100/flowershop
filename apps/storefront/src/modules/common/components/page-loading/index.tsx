"use client"

import { useTranslations } from "@lib/i18n/use-translations"

/**
 * The shop's loading screen: the logo breathing gently over a line of text.
 *
 * Shown the instant a page is asked for (as the route's loading.tsx) and over
 * the product page while Checkout now waits for the bag. Nothing here waits
 * on the network, so it paints on the tap itself — the point is that a tap
 * always answers at once, even when the Store API takes seconds behind it.
 *
 * `overlay` covers the page in place, on solid white (a translucent tint
 * left the form showing through, blurred, behind the text); without it the screen fills the space
 * the page is about to take.
 */
export default function PageLoading({
  message,
  overlay = false,
}: {
  message?: string
  overlay?: boolean
}) {
  const { t } = useTranslations()
  const text = message ?? t("loading.page")

  return (
    <div
      role="status"
      aria-live="polite"
      className={
        overlay
          ? "fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-white px-4"
          : "flex min-h-[60vh] flex-col items-center justify-center gap-5 px-4"
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a 5 KB mark that
          must paint with no loader or layout work in the way */}
      <img
        src="/brand/logo-sm-320.webp"
        alt=""
        width={320}
        height={55}
        className="h-auto w-56 max-w-[70vw] animate-pulse object-contain motion-reduce:animate-none"
      />
      <span className="flex items-center gap-3 text-base text-ink-700">
        <span
          aria-hidden="true"
          className="h-5 w-5 animate-spin rounded-full border-2 border-blush-200 border-t-blush-700 motion-reduce:animate-none"
        />
        {text}
      </span>
    </div>
  )
}
