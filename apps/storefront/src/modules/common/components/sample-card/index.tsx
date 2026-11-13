"use client"

import Image from "next/image"
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

import { useTranslations } from "@lib/i18n/use-translations"
import { BRAND_NAME } from "@modules/common/components/brand"

/**
 * "Show a sample card" — the gift card as the shop prints it, beside the
 * field where the message is written.
 *
 * It copies the printing code in apps/backend/src/admin/lib/gift-card.ts so
 * the preview is honest about what arrives: an L-size card read landscape
 * (127 × 89 mm), 9 × 11 mm of margin, the logo on the front at up to 80 mm
 * wide, and the message on the back in Cormorant Garamond italic (Noto Naskh
 * Arabic for Arabic), centred, at the largest size from 6pt to 30pt that still
 * fits. Each side is laid out at its real size in millimetres and then scaled
 * down to the screen, so the line breaks and the fitted size are the printed
 * ones. Change one of the two files and the other has to follow.
 *
 * Nothing is fetched and nothing is saved. The dialog renders only once the
 * button is tapped, and into document.body: checkout's button sits inside the
 * order form, and a dialog there would put its buttons in the form too.
 */

/** The card as it is read: landscape. */
const CARD_W_MM = 127
const CARD_H_MM = 89
const PX_PER_MM = 96 / 25.4
const CARD_W_PX = CARD_W_MM * PX_PER_MM

/** First strong character decides, as dir="auto" does on the printed card. */
function directionOf(text: string): "rtl" | "ltr" {
  const m = text.match(/[A-Za-z\u00C0-\u024F]|[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/)
  return m && !/[A-Za-z\u00C0-\u024F]/.test(m[0]) ? "rtl" : "ltr"
}

/** The printed card's fit: the largest size, 6–30pt, at which it still fits. */
function fit(el: HTMLElement) {
  const box = el.parentElement
  if (!box) return
  const cs = getComputedStyle(box)
  const maxH =
    box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 1
  let lo = 6
  let hi = 30
  while (hi - lo > 0.25) {
    const mid = (lo + hi) / 2
    el.style.fontSize = `${mid}pt`
    if (el.scrollHeight <= maxH && el.scrollWidth <= el.clientWidth) lo = mid
    else hi = mid
  }
  el.style.fontSize = `${lo}pt`
}

/** One side at its real size, scaled to the width it is given. */
function CardSide({ children }: { children: React.ReactNode }) {
  const outer = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)

  useLayoutEffect(() => {
    const el = outer.current
    if (!el) return
    const measure = () => setScale(el.clientWidth / CARD_W_PX)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div
      ref={outer}
      // The card is drawn with physical positioning, the same in either
      // language; only the message inside it has a direction.
      dir="ltr"
      className="relative w-full overflow-hidden rounded-md bg-white shadow-[0_1px_3px_rgba(43,29,34,0.12),0_8px_24px_-12px_rgba(43,29,34,0.25)] border border-ink-200/70"
      style={{ height: scale ? `${CARD_H_MM * PX_PER_MM * scale}px` : undefined, aspectRatio: scale ? undefined : `${CARD_W_MM} / ${CARD_H_MM}` }}
    >
      <div
        className="absolute left-0 top-0 flex items-center justify-center"
        style={{
          width: `${CARD_W_MM}mm`,
          height: `${CARD_H_MM}mm`,
          padding: "9mm 11mm",
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          visibility: scale ? "visible" : "hidden",
        }}
      >
        {children}
      </div>
    </div>
  )
}

function CardMessage({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const dir = directionOf(text)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    fit(el)
    // Fit again once the card's own faces arrive: the stand-in measures
    // differently and would leave the real one overflowing, or too small.
    const fonts = document.fonts
    if (!fonts) return
    const refit = () => ref.current && fit(ref.current)
    fonts.ready.then(refit)
    fonts.addEventListener?.("loadingdone", refit)
    return () => fonts.removeEventListener?.("loadingdone", refit)
  }, [text])

  return (
    <p
      ref={ref}
      dir={dir}
      className="w-full overflow-hidden text-center"
      style={{
        maxHeight: "100%",
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
        lineHeight: 1.25,
        color: "#2b1d22",
        fontFamily:
          "var(--font-card-latin), var(--font-card-arabic), Georgia, serif",
        fontStyle: dir === "rtl" ? "normal" : "italic",
        fontWeight: 500,
      }}
    >
      {text}
    </p>
  )
}

export default function SampleCardButton({
  message,
  sourceId,
  className,
}: {
  /** The message, when the caller holds it in state. */
  message?: string
  /** Or the id of the field to read it from when tapped (an uncontrolled textarea). */
  sourceId?: string
  className?: string
}) {
  const { t } = useTranslations()
  const trigger = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")

  const show = () => {
    let value = message ?? ""
    if (sourceId) {
      const field = document.getElementById(sourceId) as HTMLTextAreaElement | null
      value = field?.value ?? value
    }
    setText(value.trim())
    setOpen(true)
  }

  // A controlled field can change while the dialog is open only in theory
  // (the dialog is modal), but keep it in step anyway.
  useEffect(() => {
    if (open && message !== undefined && !sourceId) setText(message.trim())
  }, [open, message, sourceId])

  useEffect(() => {
    const d = dialog.current
    if (open && d && !d.open) {
      d.showModal()
      // Start on the heading, so a screen reader reads what this is and no
      // focus ring sits on the close button as if it had been pressed.
      heading.current?.focus()
    }
  }, [open])

  const close = useCallback(() => {
    if (dialog.current?.open) dialog.current.close()
    setOpen(false)
    trigger.current?.focus()
  }, [])

  const example = !text
  const shown = text || t("card.example")

  return (
    <>
      <button
        ref={trigger}
        // type="button": at checkout this sits inside the order form.
        type="button"
        onClick={show}
        aria-haspopup="dialog"
        className={`inline-flex min-h-[2.75rem] items-center gap-2 self-start rounded-full px-1 text-sm font-semibold text-blush-700 underline decoration-blush-300 underline-offset-4 hover:text-blush-800 hover:decoration-blush-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blush-700 ${className ?? ""}`}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2.5" y="5.5" width="19" height="13" rx="1.5" />
          <path d="M7 10.5h10M8.5 13.5h7" />
        </svg>
        {t("card.show")}
      </button>

      {open &&
        createPortal(
          <dialog
            ref={dialog}
            aria-labelledby="sample-card-title"
            onClose={close}
            onClick={(e) => e.target === dialog.current && close()}
            className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto overflow-x-hidden rounded-3xl bg-blush-50 p-0 text-ink-900 shadow-2xl backdrop:bg-ink-900/60"
          >
            <div className="relative flex flex-col gap-4 px-5 pb-5 pt-6">
              <button
                type="button"
                onClick={close}
                aria-label={t("common.close")}
                className="absolute end-2 top-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-xl text-ink-600 hover:text-ink-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blush-700"
              >
                <span aria-hidden>✕</span>
              </button>

              <div className="pe-10">
                <h2
                  id="sample-card-title"
                  ref={heading}
                  tabIndex={-1}
                  className="font-display text-2xl leading-tight focus:outline-none"
                >
                  {t("card.title")}
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-ink-600">
                  {t("card.intro")}
                </p>
              </div>

              <figure className="flex flex-col gap-2">
                <figcaption className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-600 rtl:tracking-normal">
                  {t("card.front")}
                </figcaption>
                <CardSide>
                  <Image
                    src="/brand/logo.webp"
                    alt={BRAND_NAME}
                    width={1600}
                    height={274}
                    sizes="(max-width: 480px) 80vw, 320px"
                    style={{ width: "80mm", maxWidth: "80mm", maxHeight: "56mm", height: "auto", objectFit: "contain" }}
                  />
                </CardSide>
              </figure>

              <figure className="flex flex-col gap-2">
                <figcaption className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-600 rtl:tracking-normal">
                  {t(example ? "card.backExample" : "card.back")}
                </figcaption>
                <CardSide>
                  <CardMessage text={shown} />
                </CardSide>
                {example && (
                  <p className="text-sm text-ink-600">{t("card.exampleHint")}</p>
                )}
              </figure>

              <button
                type="button"
                onClick={close}
                className="inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-full bg-ink-900 px-6 text-sm font-semibold text-white hover:bg-ink-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blush-700"
              >
                {t("card.done")}
              </button>
            </div>
          </dialog>,
          document.body
        )}
    </>
  )
}
