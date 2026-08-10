import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DocumentText, Tag } from "@medusajs/icons"
import { Button, Container, Heading, Text, toast } from "@medusajs/ui"

import { printOrderDocument, type PrintableOrder } from "../lib/print"

/**
 * Paperwork for an order: the label that goes on the box, and the receipt
 * that goes to the person who paid.
 *
 * Both open in their own window with the print dialog already up, so it is
 * one click from the order to a printed page.
 */
const OrderPrint = ({ data }: { data: PrintableOrder }) => {
  const print = (kind: "label" | "receipt") => {
    const opened = printOrderDocument(data, kind)
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
