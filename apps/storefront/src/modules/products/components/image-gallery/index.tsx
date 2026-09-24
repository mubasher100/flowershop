"use client"

import { HttpTypes } from "@medusajs/types"
import Image from "next/image"
import { useCallback, useEffect, useState } from "react"

import { useTranslations } from "@lib/i18n/use-translations"
import { Container } from "@modules/common/components/ui"

type ImageGalleryProps = {
  images: HttpTypes.StoreProductImage[]
  /** Used for alt text, so it describes the bouquet rather than "image 1". */
  title?: string
}

/**
 * Product photography, with a way to look closer.
 *
 * A bouquet here runs to several hundred riyal and the page showed one
 * photograph at card size with no way to enlarge it — you could not see
 * whether the roses were the shade you wanted. Tapping an image now opens it
 * full-screen; arrow keys and swipe move between shots when there is more
 * than one.
 *
 * Built as a plain dialog rather than pulling in a lightbox library: this is
 * an overlay, an image and two buttons, and the page already ships no
 * third-party JavaScript at all.
 */
const ImageGallery = ({ images, title }: ImageGalleryProps) => {
  const { t } = useTranslations()
  const [openAt, setOpenAt] = useState<number | null>(null)
  const isOpen = openAt !== null

  const close = useCallback(() => setOpenAt(null), [])
  const step = useCallback(
    (by: number) =>
      setOpenAt((current) =>
        current === null ? null : (current + by + images.length) % images.length
      ),
    [images.length]
  )

  useEffect(() => {
    if (!isOpen) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
      if (e.key === "ArrowRight") step(1)
      if (e.key === "ArrowLeft") step(-1)
    }
    document.addEventListener("keydown", onKey)
    // The page behind must not scroll while the overlay is up.
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = previous
    }
  }, [isOpen, close, step])

  const altFor = (index: number) =>
    title
      ? images.length > 1
        ? `${title} — view ${index + 1} of ${images.length}`
        : title
      : `Product image ${index + 1}`

  return (
    <div className="relative flex items-start">
      <div className="flex flex-1 flex-col gap-y-4 small:mx-16">
        {images.map((image, index) => (
          <Container
            key={image.id}
            className="relative aspect-[29/34] w-full overflow-hidden bg-ui-bg-subtle"
            id={image.id}
          >
            {!!image.url && (
              <button
                type="button"
                onClick={() => setOpenAt(index)}
                aria-label={t("product.enlarge")}
                className="group absolute inset-0 cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blush-700"
              >
                <Image
                  src={image.url}
                  priority={index <= 2}
                  className="absolute inset-0 rounded-rounded"
                  alt={altFor(index)}
                  fill
                  sizes="(max-width: 576px) 92vw, (max-width: 992px) 50vw, 600px"
                  style={{ objectFit: "cover" }}
                />
                <span
                  aria-hidden="true"
                  className="absolute bottom-3 end-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink-800 shadow-sm transition-opacity group-hover:bg-white"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M20 20l-3.5-3.5M11 8v6M8 11h6" strokeLinecap="round" />
                  </svg>
                </span>
              </button>
            )}
          </Container>
        ))}
      </div>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("product.enlarge")}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-ink-900/90 p-4"
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            aria-label={t("common.close")}
            className="absolute end-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); step(-1) }}
                aria-label={t("product.previousImage")}
                className="absolute start-2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 rtl:rotate-180">
                  <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); step(1) }}
                aria-label={t("product.nextImage")}
                className="absolute end-2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 rtl:rotate-180">
                  <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </>
          )}

          {/* Stops a tap on the photograph itself from closing the overlay. */}
          <div
            className="relative h-full max-h-[86vh] w-full max-w-[86vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[openAt]?.url ?? ""}
              alt={altFor(openAt)}
              fill
              sizes="90vw"
              style={{ objectFit: "contain" }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default ImageGallery
