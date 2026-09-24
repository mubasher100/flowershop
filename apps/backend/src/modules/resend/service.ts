import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils"
import type { Logger } from "@medusajs/framework/types"
import type {
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
} from "@medusajs/types"

type Options = {
  api_key: string
  from: string
  reply_to?: string
}

type InjectedDependencies = { logger: Logger }

/**
 * Sends email through Resend.
 *
 * Written rather than using the SendGrid provider that ships with Medusa
 * because that one renders its bodies from templates stored in SendGrid's
 * dashboard — the shop would have to build the email there, and the content
 * would live outside this repository. Here the subject and HTML arrive with
 * the notification, so an order confirmation is reviewable in code and
 * translatable alongside the rest of the copy.
 *
 * The transport is a single fetch; Resend's REST API needs no SDK.
 */
class ResendNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "resend"

  protected logger_: Logger
  protected options_: Options

  constructor({ logger }: InjectedDependencies, options: Options) {
    super()
    this.logger_ = logger
    this.options_ = options
  }

  static validateOptions(options: Record<string, unknown>) {
    if (!options.api_key) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Resend needs an api_key."
      )
    }
    if (!options.from) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Resend needs a verified `from` address."
      )
    }
  }

  async send(
    notification: ProviderSendNotificationDTO
  ): Promise<ProviderSendNotificationResultsDTO> {
    const subject = notification.content?.subject
    const html = notification.content?.html

    if (!subject || !html) {
      // Nothing useful to send, and a blank email is worse than none.
      this.logger_.warn(
        `Resend: "${notification.template}" had no subject or body — not sent.`
      )
      return {}
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.options_.api_key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: this.options_.from,
        to: [notification.to],
        subject,
        html,
        ...(this.options_.reply_to ? { reply_to: this.options_.reply_to } : {}),
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      // Thrown so the caller can decide; the order subscriber deliberately
      // swallows it, because an email that fails must never lose an order.
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Resend refused the message (${res.status}): ${body.slice(0, 200)}`
      )
    }

    const { id } = (await res.json()) as { id?: string }
    return { id }
  }
}

export default ResendNotificationProviderService
