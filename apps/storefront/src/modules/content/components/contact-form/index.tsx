"use client"

import { useState } from "react"

import { useTranslations } from "@lib/i18n/use-translations"

const labelClass = "text-sm font-medium text-ink-800"
const fieldClass =
  "min-h-[3rem] w-full rounded-xl border border-ink-200 bg-white px-4 text-base text-ink-900 placeholder:text-ink-500 focus:border-blush-500 focus:outline-none focus:ring-2 focus:ring-blush-200"

/**
 * Asking the shop a question.
 *
 * There was no way to send the shop anything except an order — /contact
 * offered a bare WhatsApp link, which leaves the customer staring at an empty
 * chat wondering what to write, and the florist receiving "hi" with no
 * context.
 *
 * The form composes the message instead of posting it somewhere. That is not
 * a shortcut: this shop takes and confirms every order on WhatsApp, so it is
 * the inbox that is actually read. An email form would land in a mailbox
 * nobody has open, and would need a provider configured before it worked at
 * all — this works today, keeps the customer's own copy of the conversation,
 * and lets them reply from their phone.
 */
export default function ContactForm({ whatsapp }: { whatsapp: string }) {
  const { t } = useTranslations()
  const [name, setName] = useState("")
  const [message, setMessage] = useState("")

  const composed = [
    name ? `${t("contact.fromLabel")}: ${name}` : "",
    message,
  ]
    .filter(Boolean)
    .join("\n\n")

  const href = `https://wa.me/${whatsapp}?text=${encodeURIComponent(composed || t("contact.fallbackMessage"))}`

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        // The link below does the work; this only stops a stray Enter key
        // from reloading the page with the message lost.
        e.preventDefault()
        window.open(href, "_blank", "noopener")
      }}
    >
      <div className="flex flex-col gap-1.5">
        <label className={labelClass} htmlFor="contact-name">
          {t("contact.name")}{" "}
          <span className="font-normal text-ink-500">{t("checkout.optional")}</span>
        </label>
        <input
          id="contact-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          autoComplete="name"
          className={fieldClass}
          placeholder={t("checkout.namePlaceholder")}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass} htmlFor="contact-message">
          {t("contact.message")}
        </label>
        <textarea
          id="contact-message"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={900}
          className={`${fieldClass} py-3`}
          placeholder={t("contact.messagePlaceholder")}
        />
      </div>

      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-[3.25rem] w-fit items-center justify-center rounded-full bg-blush-600 px-8 text-base font-semibold text-white transition-colors hover:bg-blush-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blush-700"
      >
        {t("contact.send")}
      </a>

      <p className="text-sm text-ink-600">{t("contact.sendHint")}</p>
    </form>
  )
}
