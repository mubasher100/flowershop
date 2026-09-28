import { ArrowUpTray, Tag } from "@medusajs/icons"
import { Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { useRef } from "react"

import { printOrderDocument, SHOP_NAME } from "../lib/print"
import { useLabelLogo } from "../lib/use-label-logo"

/** Roughly what a logo needs to print at 11mm without being a photograph. */
const MAX_BYTES = 2 * 1024 * 1024

/**
 * A sample order, so the logo can be checked on real paper before a real
 * delivery depends on it. A long recipient name and a full set of delivery
 * instructions, because a label that fits a short address and pushes a long
 * one off the page is the failure worth catching here.
 */
const SAMPLE = {
  display_id: 0,
  created_at: new Date().toISOString(),
  currency_code: "qar",
  metadata: {
    recipient_name: "Noor Al-Thani",
    recipient_phone: "+974 5151 4161",
    delivery_date: new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Qatar",
    }),
    delivery_window: "6pm - 9pm",
    delivery_notes: "Villa gate is on the side street. Please call on arrival.",
    gift_note: "Happy birthday, Noor. See you tonight.",
  },
  shipping_address: {
    address_1: "Building 10, Al Abhariya Street",
    city: "Doha",
  },
}

/**
 * The logo printed at the top of the delivery label.
 *
 * Kept small on the label itself: that sheet is read by a courier at arm's
 * length looking for a name and a phone number, and branding that competes
 * with those makes the label worse at its job.
 */
export default function LabelLogoSettings() {
  const { logo, isCustom, upload, reset, isSaving } = useLabelLogo()
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
      toast.success("Logo saved. It will print on every delivery label from now on.")
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
    const opened = printOrderDocument(SAMPLE, "label", SHOP_NAME, logo)
    if (!opened) {
      toast.error(
        "Your browser blocked the print window. Allow pop-ups for this site and try again."
      )
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Delivery label logo</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Printed at the top of the label that goes on the box.
        </Text>
      </div>

      <div className="flex flex-col gap-4 px-6 py-4 md:flex-row md:items-center">
        <div className="flex h-24 w-32 flex-none items-center justify-center rounded-lg border border-ui-border-base bg-white">
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
            prints about 11mm across, beside the shop name.
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
              <Tag />
              Print a sample label
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
