import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DocumentText, Envelope, Tag } from "@medusajs/icons"
import { Button, Container, Heading, Text, toast } from "@medusajs/ui"

import {
  printOrderDocument,
  type DocKind,
  type PrintableOrder,
} from "../lib/print"
import { useCardLogo } from "../lib/use-card-logo"

/**
 * Paperwork for an order: the label that goes on the box, the gift card that
 * goes in with the flowers, and the receipt for the person who paid.
 *
 * All three open in their own window with the print dialog already up, so it is
 * one click from the order to a printed page.
 */
const OrderPrint = ({ data }: { data: PrintableOrder }) => {
  const { logo } = useCardLogo()

  // Nothing to print a card from if the customer did not write a message. The
  // note lives on the line items (each bouquet in an order can carry its own),
  // and on the order for a single-item order placed through checkout.
  const noteOnOrder =
    typeof data.metadata?.gift_note === "string" && data.metadata.gift_note
  const noteOnItem = (data.items ?? []).some(
    (item) => typeof item.metadata?.gift_note === "string" && item.metadata.gift_note
  )
  const hasNote = !!noteOnOrder || noteOnItem

  const print = (kind: DocKind) => {
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
          The label goes on the box. The receipt goes to the customer.
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
          disabled={!hasNote}
          onClick={() => print("gift-card")}
        >
          <Envelope />
          Gift card
        </Button>
        {!hasNote && (
          <Text size="xsmall" className="text-ui-fg-muted">
            No gift message on this order.
          </Text>
        )}

        <Button
          size="small"
          variant="secondary"
          onClick={() => print("receipt")}
        >
          <DocumentText />
          Receipt
        </Button>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.side.after",
})

export default OrderPrint
