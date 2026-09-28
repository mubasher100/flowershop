import { ArrowUpTray, Envelope } from "@medusajs/icons"
import { Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { useRef } from "react"

import { printOrderDocument, SHOP_NAME } from "../lib/print"
import { useCardLogo } from "../lib/use-card-logo"

/** Roughly what a logo needs to print at 16mm without being a photograph. */
const MAX_BYTES = 2 * 1024 * 1024

/**
 * A sample order, so the logo can be checked on real paper before a real
 * customer's card depends on it. The message is the longest a customer can
 * write (200 characters) — a logo that fits a two-word message and pushes a
 * full one off the card is the failure worth catching here.
 */
const SAMPLE = {
  display_id: 0,
  created_at: new Date().toISOString(),
  currency_code: "qar",
  metadata: {
    recipient_name: "Noor Al-Thani",
    contact_name: "Ahmed",
    gift_note:
      "Happy birthday, Noor.\n\nThirty years and you have not changed a bit — which everyone says, but in your case it is meant as the compliment it sounds like. See you tonight.",
  },
}

/**
 * The logo printed on gift cards.
 *
 * The card is the one piece of paperwork the customer's recipient actually
 * keeps, and it was printing unbranded — cut from the same sheet as the
 * courier label. This is where the shop puts its own mark on it.
 */
export default function CardLogoSettings() {
  const { logo, isCustom, upload, reset, isSaving } = useCardLogo()
  const fileInput = useRef<HTMLInputElement>(null)

  const onPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Reset the input straight away, or picking the same file twice after a
    // failure does nothing — the value has not changed, so no event fires.
    event.target.value = ""
    if (!file) return

    if (!/^image\/(png|jpeg|svg\+xml|webp)$/.test(file.type)) {
      toast.error("Use a PNG, JPG, SVG or WebP image.")
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error("That file is over 2 MB. A logo does not need to be that big.")
      return
    }

    try {
      await upload.mutateAsync(file)
      toast.success("Logo saved. It will print on every gift card from now on.")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "The upload did not go through."
      )
    }
  }

  const onReset = async () => {
    try {
      await reset()
      toast.success("Back to the Tulips and Truffles mark.")
    } catch {
      toast.error("Could not change it back.")
    }
  }

  const printSample = () => {
    const opened = printOrderDocument(SAMPLE, "gift-card", SHOP_NAME, logo)
    if (!opened) {
      toast.error(
        "Your browser blocked the print window. Allow pop-ups for this site and try again."
      )
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Gift card logo</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Printed at the top of the card that goes in with the flowers, above
          the customer&rsquo;s message.
        </Text>
      </div>

      <div className="flex flex-col gap-4 px-6 py-4 md:flex-row md:items-center">
        {/* A checkered-free plain surface: a logo with a transparent background
            looks fine here and prints onto the card's blush paper, so the
            preview shows it on that same colour rather than on white. */}
        <div className="flex h-24 w-32 flex-none items-center justify-center rounded-lg border border-ui-border-base bg-[#fff7f9]">
          <img
            src={logo}
            alt="The logo as it will print"
            className="max-h-16 max-w-24 object-contain"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Text size="small">
            {isCustom
              ? "Using your uploaded logo."
              : "Using the Tulips and Truffles mark."}
          </Text>
          <Text size="xsmall" className="text-ui-fg-muted">
            PNG, JPG, SVG or WebP, under 2 MB. A square mark works best — it
            prints about 16mm across. A logo on a transparent background sits
            best on the card&rsquo;s paper colour.
          </Text>

          <div className="mt-1 flex flex-wrap gap-2">
            <Button
              size="small"
              variant="secondary"
              isLoading={isSaving}
              onClick={() => fileInput.current?.click()}
            >
              <ArrowUpTray />
              {isCustom ? "Replace logo" : "Upload a logo"}
            </Button>

            {isCustom && (
              <Button
                size="small"
                variant="transparent"
                disabled={isSaving}
                onClick={onReset}
              >
                Use the default mark
              </Button>
            )}

            {/* Checking it on paper is the whole point — a mark that looks
                right on screen can print as a grey smudge. */}
            <Button size="small" variant="transparent" onClick={printSample}>
              <Envelope />
              Print a sample card
            </Button>
          </div>

          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="hidden"
            onChange={onPick}
          />
        </div>
      </div>
    </Container>
  )
}
