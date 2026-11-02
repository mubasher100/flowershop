import { Gift } from "@medusajs/icons"
import { Button, Container, Heading, Label, Text, Textarea, toast } from "@medusajs/ui"
import { useState } from "react"

import { printSampleCard } from "../lib/gift-card"
import { useLabelLogo } from "../lib/use-label-logo"

/**
 * A test card with any message, for checking the printer, the L-size card
 * stock and how much text fits. The message fits itself to the card — a short
 * one prints large, a long one shrinks (down to 6pt) — so the only way to see
 * where the limit is, is to print one. Nothing is saved.
 */
const SAMPLE =
  "Happy birthday, Noor! Wishing you a year as bright and beautiful as these flowers. With all our love."

const GiftCardSample = () => {
  const { logo } = useLabelLogo()
  const [message, setMessage] = useState(SAMPLE)

  const print = () => {
    const result = printSampleCard(message, logo)
    if (result === "none") toast.error("Write a message to print first.")
    if (result === "blocked") {
      toast.error("Your browser blocked the print window. Allow pop-ups for this site and try again.")
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Gift card</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Cards print on L size (89 × 127 mm), fed upright: your label logo on one side, the
          message on the other, sized to fill the card. Print a sample to check the printer —
          in the print window choose paper size L, margins None, and two-sided printing if your
          printer has it.
        </Text>
      </div>

      <div className="flex flex-col gap-3 px-6 py-4">
        <div className="flex flex-col gap-2">
          <Label size="small" weight="plus" htmlFor="sample-card-message">
            Message
          </Label>
          <Textarea
            id="sample-card-message"
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {message.trim().length} characters. Customers can write up to 200 on a flower and 300
            at checkout; anything longer simply prints smaller.
          </Text>
        </div>
        <div>
          <Button size="small" variant="secondary" onClick={print}>
            <Gift />
            Print sample card
          </Button>
        </div>
      </div>
    </Container>
  )
}

export default GiftCardSample
