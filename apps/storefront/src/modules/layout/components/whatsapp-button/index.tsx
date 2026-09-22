"use client"

import { usePathname } from "next/navigation"

import { useTranslations } from "@lib/i18n/use-translations"
import { clx } from "@modules/common/components/ui"

/**
 * Reach the shop on WhatsApp from anywhere.
 *
 * This shop already runs on WhatsApp — orders are confirmed there — so a
 * question about a bouquet should not have to go looking for the contact
 * page. The message arrives with the page the customer was looking at, which
 * saves the florist asking "which one?" as the first reply.
 *
 * Renders nothing when NEXT_PUBLIC_WHATSAPP is unset, so a half-configured
 * deploy never shows a button that opens an empty chat.
 */
const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP?.replace(/\D/g, "") || null

export default function WhatsAppButton() {
  const { t } = useTranslations()
  const pathname = usePathname()

  if (!WHATSAPP) return null

  /**
   * Product pages carry a second fixed bar — the sticky add-to-bag — on top
   * of the bottom navigation, so the button has to sit higher there or it
   * covers the buy button, which is the one thing it must never do.
   */
  const onProductPage = pathname?.includes("/products/")

  const message = t("whatsapp.message", {
    page: typeof window === "undefined" ? "" : window.location.href,
  })

  return (
    <a
      href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("whatsapp.label")}
      title={t("whatsapp.label")}
      className={clx(
        // `end-4` rather than `right-4`: in Arabic the whole layout mirrors,
        // and a button pinned to the right would sit under the thumb that is
        // reaching for the menu.
        "fixed end-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full",
        "bg-[#128c7e] text-white shadow-lg shadow-ink-900/20 transition-transform",
        "hover:scale-105 hover:bg-[#0f7a6e] focus-visible:outline focus-visible:outline-2",
        "focus-visible:outline-offset-2 focus-visible:outline-blush-700 motion-reduce:transition-none",
        // Clear of the fixed bars on a phone; ordinary corner placement once
        // there are none.
        onProductPage
          ? "bottom-[11.5rem] small:bottom-6"
          : "bottom-[5.25rem] small:bottom-6"
      )}
      data-testid="whatsapp-button"
    >
      {/* The WhatsApp glyph. aria-hidden because the link is already named. */}
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        className="h-7 w-7"
      >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 0 1 6.988 2.896 9.83 9.83 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.8 11.8 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.9 11.9 0 0 0 5.688 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.8 11.8 0 0 0-3.48-8.413Z" />
      </svg>
    </a>
  )
}
