import { createHmac, randomUUID, timingSafeEqual } from "node:crypto"

import {
  AbstractPaymentProvider,
  MedusaError,
  PaymentActions,
  PaymentSessionStatus,
} from "@medusajs/framework/utils"
import type {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"

/**
 * SkipCash — card payment for QAR, licensed by the Qatar Central Bank.
 *
 * The flow is a redirect: initiatePayment creates a SkipCash payment and
 * returns its payUrl; the storefront sends the customer there; SkipCash
 * returns them to the storefront, which completes the cart. Completing the
 * cart calls authorizePayment, which asks SkipCash for the payment's status
 * rather than trusting anything in the return URL. SkipCash also posts a
 * signed webhook, which completes the order on its own if the customer
 * closes the browser after paying.
 *
 * Built against dev.skipcash.app (read 2 Nov 2026): signatures are an
 * HMAC-SHA256 of "Key=value" pairs, comma-joined in a fixed order, base64.
 * Payment creation signs with the key secret; the webhook with the webhook
 * key; a payment lookup only needs the client ID.
 *
 * Money is captured the moment the customer pays — there is no separate
 * authorise-then-capture step — so a paid payment reports "captured".
 */

type Options = {
  baseUrl: string
  clientId: string
  keyId: string
  keySecret: string
  webhookKey: string
  /** Where SkipCash posts payment results: {backend}/hooks/payment/skipcash_skipcash */
  webhookUrl?: string
}

type SkipCashPayment = {
  id: string
  statusId: number
  status?: string
  payUrl?: string
  amount?: string
  transactionId?: string
  visaId?: string
  cardType?: string
}

/** statusId → Medusa: 0 new, 1 pending, 2 paid, 3 canceled, 4 failed, 5 rejected, 6 refunded, 7 pending refund, 8 refund failed, 12 in progress. */
const toSessionStatus = (statusId: number): PaymentSessionStatus => {
  switch (statusId) {
    case 2:
    case 6:
    case 7:
    case 8:
      return PaymentSessionStatus.CAPTURED
    case 3:
      return PaymentSessionStatus.CANCELED
    case 4:
    case 5:
      return PaymentSessionStatus.ERROR
    default:
      return PaymentSessionStatus.PENDING
  }
}

const sign = (fields: [string, unknown][], key: string) =>
  createHmac("sha256", key)
    .update(
      fields
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => `${k}=${v}`)
        .join(",")
    )
    .digest("base64")

/** Letters and spaces only: SkipCash refuses names with special characters. */
const cleanName = (value: unknown, fallback: string) => {
  const name = String(value ?? "")
    .normalize("NFKD")
    .replace(/[^A-Za-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60)
  return name || fallback
}

/** Qatari numbers may go bare (8 digits); anything else needs +country. */
const cleanPhone = (value: unknown) => {
  const digits = String(value ?? "").replace(/\D/g, "").replace(/^00/, "")
  if (digits.length === 8) return digits
  return `+${digits}`.slice(0, 15)
}

class SkipCashProviderService extends AbstractPaymentProvider<Options> {
  static identifier = "skipcash"

  protected options_: Options

  static validateOptions(options: Record<string, unknown>) {
    for (const key of ["baseUrl", "clientId", "keyId", "keySecret", "webhookKey"]) {
      if (!options[key]) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `SkipCash: the ${key} option is required.`
        )
      }
    }
  }

  constructor(container: Record<string, unknown>, options: Options) {
    super(container, options)
    this.options_ = { ...options, baseUrl: options.baseUrl.replace(/\/+$/, "") }
  }

  private async lookup(id: string): Promise<SkipCashPayment> {
    const res = await fetch(`${this.options_.baseUrl}/api/v1/payments/${id}`, {
      headers: { Authorization: this.options_.clientId },
    })
    const json = (await res.json().catch(() => ({}))) as {
      resultObj?: SkipCashPayment
      errorMessage?: string
    }
    if (!res.ok || !json.resultObj) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `SkipCash: could not load payment ${id} (${res.status} ${json.errorMessage ?? ""})`
      )
    }
    return json.resultObj
  }

  /**
   * Creates the SkipCash payment. The storefront passes the customer's name,
   * phone, email and where to come back to in `data`.
   */
  private async create(input: InitiatePaymentInput | UpdatePaymentInput) {
    const data = (input.data ?? {}) as Record<string, unknown>
    const sessionId = String(data.session_id ?? "")
    const amount = Number(input.amount)
    if (!(amount > 0)) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "SkipCash: the amount must be above zero.")
    }

    const phone = cleanPhone(data.phone)
    const email =
      typeof data.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email) &&
      !data.email.endsWith("@guest.flowershop.qa")
        ? data.email
        : // SkipCash's own suggestion when a shop does not collect email.
          `${phone.replace(/\D/g, "")}@tulipsandtruffle.com`

    const body: Record<string, string> = {
      Uid: randomUUID(),
      KeyId: this.options_.keyId,
      Amount: amount.toFixed(2),
      FirstName: cleanName(data.first_name, "Customer"),
      LastName: cleanName(data.last_name, "Customer"),
      Phone: phone,
      Email: email.slice(0, 255),
      // The payment session id without its prefix: letters and digits only,
      // which SkipCash requires, and the webhook turns it back into the session.
      TransactionId: sessionId.replace(/^payses_/, ""),
    }
    const signature = sign(
      ["Uid", "KeyId", "Amount", "FirstName", "LastName", "Phone", "Email", "TransactionId"].map(
        (k) => [k, body[k]] as [string, string]
      ),
      this.options_.keySecret
    )

    const res = await fetch(`${this.options_.baseUrl}/api/v1/payments`, {
      method: "POST",
      headers: { Authorization: signature, "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        Subject: "Tulips and Truffles",
        Description: "Flowers from Tulips and Truffles",
        ...(typeof data.return_url === "string" ? { ReturnUrl: data.return_url } : {}),
        ...(this.options_.webhookUrl ? { WebhookUrl: this.options_.webhookUrl } : {}),
      }),
    })
    const json = (await res.json().catch(() => ({}))) as {
      resultObj?: SkipCashPayment
      errorMessage?: string
      validationErrors?: unknown
    }
    if (!res.ok || !json.resultObj?.payUrl) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `SkipCash refused the payment (${res.status}): ${json.errorMessage ?? JSON.stringify(json.validationErrors ?? "")}`
      )
    }
    return {
      id: json.resultObj.id,
      status: PaymentSessionStatus.PENDING,
      data: {
        ...data,
        id: json.resultObj.id,
        payUrl: json.resultObj.payUrl,
        transactionId: body.TransactionId,
        statusId: json.resultObj.statusId,
      },
    }
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    return this.create(input)
  }

  /** A changed amount needs a new SkipCash payment; its link carries the amount. */
  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    return this.create(input)
  }

  /**
   * Asked when the cart is completed. The answer comes from SkipCash itself,
   * never from the return URL a customer could edit.
   */
  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const id = String(input.data?.id ?? "")
    const payment = await this.lookup(id)
    return {
      status: toSessionStatus(payment.statusId),
      data: {
        ...input.data,
        statusId: payment.statusId,
        visaId: payment.visaId,
        cardType: payment.cardType,
      },
    }
  }

  /** Already captured when the customer paid. */
  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    return { data: input.data }
  }

  /** An unpaid SkipCash payment cancels itself within the hour. */
  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    return { data: input.data }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: input.data }
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const payment = await this.lookup(String(input.data?.id ?? ""))
    return { status: toSessionStatus(payment.statusId), data: { ...input.data, statusId: payment.statusId } }
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    const payment = await this.lookup(String(input.data?.id ?? ""))
    return { data: { ...input.data, ...payment } }
  }

  /**
   * Refunds through SkipCash. Signed over Id and KeyId only; Amount rides in
   * the body, so a partial refund is possible. SkipCash settles it within a
   * day.
   */
  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const id = String(input.data?.id ?? "")
    const body = { Id: id, KeyId: this.options_.keyId, Amount: Number(input.amount).toFixed(2) }
    const signature = sign(
      [
        ["Id", body.Id],
        ["KeyId", body.KeyId],
      ],
      this.options_.keySecret
    )
    const res = await fetch(`${this.options_.baseUrl}/api/v1/payments/refund`, {
      method: "POST",
      headers: { Authorization: signature, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const json = (await res.json().catch(() => ({}))) as {
      resultObj?: { id?: string } | string
      errorMessage?: string
    }
    if (!res.ok || json.errorMessage) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `SkipCash refused the refund (${res.status}): ${json.errorMessage ?? ""}`
      )
    }
    const refundId = typeof json.resultObj === "string" ? json.resultObj : json.resultObj?.id
    return { data: { ...input.data, refundId } }
  }

  /**
   * SkipCash's result call. Trusted only if its signature checks out: an
   * HMAC of PaymentId, Amount, StatusId, TransactionId, Custom1, VisaId (the
   * ones present, in that order) with the webhook key.
   */
  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const body = (payload.data ?? {}) as Record<string, unknown>
    const header = String(
      (payload.headers?.authorization ?? payload.headers?.Authorization ?? "") as string
    )
    const expected = sign(
      ["PaymentId", "Amount", "StatusId", "TransactionId", "Custom1", "VisaId"].map(
        (k) => [k, body[k]] as [string, unknown]
      ),
      this.options_.webhookKey
    )
    const valid =
      header.length === expected.length &&
      timingSafeEqual(Buffer.from(header), Buffer.from(expected))
    if (!valid || !body.TransactionId) {
      return { action: PaymentActions.NOT_SUPPORTED }
    }

    const data = {
      session_id: `payses_${body.TransactionId}`,
      amount: Number(body.Amount ?? 0),
    }
    switch (Number(body.StatusId)) {
      case 2:
        return { action: PaymentActions.SUCCESSFUL, data }
      case 3:
        return { action: PaymentActions.CANCELED, data }
      case 4:
      case 5:
        return { action: PaymentActions.FAILED, data }
      default:
        return { action: PaymentActions.NOT_SUPPORTED }
    }
  }
}

export default SkipCashProviderService
