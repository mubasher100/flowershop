/**
 * Printing: the logo on the delivery label and gift card, a sample label, and
 * a sample gift card with any message — the full admin's Shop → Delivery
 * label logo and Gift card panels. Printing goes through the same code as the
 * admin's (@admin-lib), so the two can never print different paperwork.
 */
import { DEFAULT_LOGO, LOGO_METADATA_KEY } from "@admin-lib/brand-mark"
import { printSampleCard } from "@admin-lib/gift-card"
import { SHOP_NAME, printOrderDocument } from "@admin-lib/print"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useRef, useState } from "react"

import { Card, SubPage } from "../components/page"
import { Button, cx, inputClass, toast } from "../components/ui"
import { messageOf } from "../lib/bulk"
import { sdk } from "../lib/sdk"

const SAMPLE_MESSAGE =
  "Happy birthday, Noor! Wishing you a year as bright and beautiful as these flowers. With all our love."

const SAMPLE_ORDER = {
  display_id: 0,
  created_at: new Date().toISOString(),
  currency_code: "qar",
  metadata: {
    recipient_name: "Noor Al-Thani",
    recipient_phone: "+974 3000 0000",
    delivery_date: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Qatar" }),
    delivery_window: "6pm - 9pm",
    delivery_notes: "Villa gate is on the side street. Please call on arrival.",
    gift_note: "Happy birthday, Noor. See you tonight.",
  },
  shipping_address: { address_1: "Building 64, Al Abhariya Street", city: "Doha" },
}

const BLOCKED = "The print window was blocked. Allow pop-ups for this site and try again."

export default function Printing() {
  const qc = useQueryClient()
  const store = useQuery({ queryKey: ["store"], queryFn: () => sdk.admin.store.list(), staleTime: 5 * 60_000 })
  const shop = store.data?.stores?.[0]
  const uploaded = shop?.metadata?.[LOGO_METADATA_KEY]
  const custom = typeof uploaded === "string" && uploaded ? uploaded : null
  const logo = custom ?? DEFAULT_LOGO
  const file = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(SAMPLE_MESSAGE)

  async function saveLogo(url: string | null) {
    if (!shop) throw new Error("No store to save the logo against.")
    // An update replaces the whole metadata object, so send the rest back too.
    await sdk.admin.store.update(shop.id, { metadata: { ...(shop.metadata ?? {}), [LOGO_METADATA_KEY]: url } })
    await qc.invalidateQueries({ queryKey: ["store"] })
  }

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ""
    if (!f) return
    if (!/^image\/(png|jpeg|svg\+xml|webp)$/.test(f.type)) return toast("Use a PNG, JPG, SVG or WebP image.", "error")
    if (f.size > 2 * 1024 * 1024) return toast("That file is over 2 MB. A logo doesn't need to be that big.", "error")
    setSaving(true)
    try {
      const { files } = await sdk.admin.upload.create({ files: [f] })
      if (!files?.[0]?.url) throw new Error("The upload returned no link.")
      await saveLogo(files[0].url)
      toast("Logo saved. It prints on every label and card from now on.")
    } catch (err) {
      toast(messageOf(err), "error")
    } finally {
      setSaving(false)
    }
  }

  async function reset() {
    setSaving(true)
    try {
      await saveLogo(null)
      toast("Back to the Tulips and Truffles mark.")
    } catch (err) {
      toast(messageOf(err), "error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <SubPage title="Printing">
      <Card>
        <h2 className="font-semibold">Sample gift card</h2>
        <p className="text-[15px] text-ink-600">
          L size card (89 × 127 mm): the logo on one side, the message on the other, sized to fill it. In the print
          window choose paper size L, margins None, and two-sided if your printer has it.
        </p>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-700">Message</span>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} dir="auto" className={cx(inputClass, "py-2")} />
          <span className="text-sm text-ink-600">
            {message.trim().length} characters. Customers can write up to 200 on a flower and 300 at checkout.
          </span>
        </label>
        <Button
          onClick={() => {
            const r = printSampleCard(message, logo)
            if (r === "none") toast("Write a message to print first.", "error")
            if (r === "blocked") toast(BLOCKED, "error")
          }}
        >
          Print sample card
        </Button>
      </Card>

      <Card>
        <h2 className="font-semibold">Logo on labels and cards</h2>
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-24 flex-none items-center justify-center rounded-xl border border-ink-200 bg-white">
            <img src={logo} alt="The logo as it prints" className="max-h-14 max-w-20 object-contain" />
          </div>
          <p className="text-[15px] text-ink-600">
            {custom ? "Your uploaded logo." : "The Tulips and Truffles mark."} PNG, JPG, SVG or WebP, under 2 MB. A square mark
            prints best.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" busy={saving} onClick={() => file.current?.click()}>
            {custom ? "Replace logo" : "Upload a logo"}
          </Button>
          {custom && (
            <Button variant="ghost" disabled={saving} onClick={reset}>
              Use the default mark
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() => {
              if (!printOrderDocument(SAMPLE_ORDER, "label", SHOP_NAME, logo)) toast(BLOCKED, "error")
            }}
          >
            Print sample label
          </Button>
        </div>
        <input ref={file} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={pick} />
      </Card>
    </SubPage>
  )
}
