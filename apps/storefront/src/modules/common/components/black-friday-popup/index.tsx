"use client"

import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import { useTranslations } from "@lib/i18n/use-translations"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * "Can't wait for Black Friday?" — shown once to each visitor until Black
 * Friday week is over (the shop's request, 13 Nov 2026): shop the Black
 * Friday prices now and reserve a delivery day after it. Checkout offers four
 * weeks of days so that reservation is actually possible.
 *
 * A native <dialog>, so focus is trapped and Escape closes it for free.
 * Dismissal is remembered in localStorage; where storage is blocked it simply
 * shows again on the next page load rather than breaking anything. It renders
 * nothing on the server, so it cannot affect prerendering.
 */
const SHOW_UNTIL = Date.parse("2026-11-30T00:00:00+03:00")
const STORAGE_KEY = "tt_bf_popup_2026"
const DEAL_PATH = "/categories/hot-deals"

function dismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

function remember() {
  try {
    localStorage.setItem(STORAGE_KEY, "1")
  } catch {
    /* storage blocked: it will show once more, which is harmless */
  }
}

export default function BlackFridayPopup() {
  const { t } = useTranslations()
  const pathname = usePathname()
  const ref = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)

  // Not on the deals page itself (they are already there), and not before
  // the visitor has had a moment to see what site they are on.
  const onDealPage = pathname?.endsWith(DEAL_PATH) ?? false

  useEffect(() => {
    if (onDealPage || Date.now() >= SHOW_UNTIL || dismissed()) return
    const timer = setTimeout(() => setOpen(true), 1500)
    return () => clearTimeout(timer)
  }, [onDealPage])

  useEffect(() => {
    const d = ref.current
    if (open && d && !d.open) d.showModal()
  }, [open])

  const close = () => {
    remember()
    ref.current?.close()
    setOpen(false)
  }

  if (!open) return null

  return (
    <dialog
      ref={ref}
      aria-labelledby="bf-title"
      onClose={close}
      onClick={(e) => e.target === ref.current && close()}
      className="m-auto w-[calc(100%-2rem)] max-w-sm overflow-hidden rounded-3xl bg-ink-900 p-0 text-white shadow-2xl backdrop:bg-ink-900/60"
    >
      <div className="relative flex flex-col items-center gap-4 px-6 pb-7 pt-10 text-center">
        <button
          type="button"
          onClick={close}
          aria-label={t("bf.close")}
          className="absolute end-2 top-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-xl text-white/80 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          <span aria-hidden>✕</span>
        </button>

        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blush-200 rtl:tracking-normal">
          {t("bf.eyebrow")}
        </p>
        <h2 id="bf-title" className="font-display text-3xl leading-tight text-blush-100">
          {t("bf.title")}
        </h2>
        <p className="text-base leading-relaxed text-white/90">{t("bf.body")}</p>

        <LocalizedClientLink
          href={DEAL_PATH}
          onClick={close}
          className="mt-2 inline-flex min-h-[2.75rem] items-center justify-center rounded-full bg-white px-8 text-sm font-semibold uppercase tracking-[0.12em] text-ink-900 rtl:tracking-normal hover:bg-blush-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {t("bf.cta")}
        </LocalizedClientLink>
      </div>
    </dialog>
  )
}
