import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DocumentText, Gift, Tag } from "@medusajs/icons"
import { Button, Container, Heading, Text, toast } from "@medusajs/ui"

import { cardMessages, printGiftCards } from "../lib/gift-card"
import { printOrderDocument, type PrintableOrder } from "../lib/print"
import { useLabelLogo } from "../lib/use-label-logo"

/**
 * Paperwork for an order: the label that goes on the box, and the receipt
 * that goes to the person who paid.
 *
 * Both open in their own window with the print dialog already up, so it is
 * one click from the order to a printed page.
 */
const OrderPrint = ({ data }: { data: PrintableOrder }) => {
  // The shop's logo, printed at the top of the label. Always resolves to
  // something — the bundled mark until a logo is uploaded.
  const { logo } = useLabelLogo()

  const print = (kind: "label" | "receipt") => {
    const opened = printOrderDocument(data, kind, undefined, logo)
    if (!opened) {
      // A blocked popup fails silently otherwise, and the florist is left
      // pressing a button that looks broken.
      toast.error(
        "Your browser blocked the print window. Allow pop-ups for this site and try again."
      )
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Print</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          The label goes on the box, the receipt to the customer, and the 8 × 12 cm gift card in with the flowers.
        </Text>
      </div>

      <div className="flex flex-col gap-2 px-6 py-4">
        <Button size="small" variant="secondary" onClick={() => print("label")}>
          <Tag />
          Delivery label
        </Button>
        <Button
          size="small"
          variant="secondary"
          onClick={() => print("receipt")}
        >
          <DocumentText />
          Receipt
        </Button>
        {cardMessages(data).length > 0 && (
          <Button
            size="small"
            variant="secondary"
            onClick={() => {
              if (printGiftCards(data, logo) === "blocked") {
                toast.error(
                  "Your browser blocked the print window. Allow pop-ups for this site and try again."
                )
              }
            }}
          >
            <Gift />
            Gift card
          </Button>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.side.after",
})

export default OrderPrint
