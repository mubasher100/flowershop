import { ArrowUpTray, Photo } from "@medusajs/icons"
import { Button, Text, toast } from "@medusajs/ui"
import { useRef, useState } from "react"

import { sdk } from "../../lib/sdk"

/** Big enough for the largest place a product photo appears. */
const MAX_EDGE = 1600

/**
 * Shrinks a photo in the browser before it is uploaded.
 *
 * A phone photo is 3–8 MB and 4000px wide. Uploaded as-is, the storefront
 * serves it into a 170px card on a customer's phone — the storefront's own
 * image ladder only covers photos that existed when it was last built, so
 * anything added from here would be the heaviest thing on the page until
 * someone re-ran the script. 1600px WebP is a few hundred KB.
 *
 * createImageBitmap honours the camera's orientation, so a portrait taken on
 * a phone does not arrive on its side.
 */
async function shrink(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.82)
  )
  if (!blob) return file // a browser without WebP encoding: send the original
  const name = file.name.replace(/\.[^.]+$/, "") || "photo"
  return new File([blob], `${name}.webp`, { type: "image/webp" })
}

/**
 * Pick a photo, see it, and have it uploaded — in one tap.
 *
 * The old form asked for "a link to the picture", which assumed the florist
 * had somewhere to host a photo and knew what a URL was. This takes the file
 * straight off the phone or computer.
 */
export default function PhotoPicker({
  value,
  onChange,
  onBusyChange,
}: {
  value: string | null
  onChange: (url: string | null) => void
  onBusyChange?: (busy: boolean) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  // The URL whose image failed to load, so a missing photo shows the empty
  // tile rather than a broken-image icon — and a new upload clears it.
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  const setBusyBoth = (b: boolean) => {
    setBusy(b)
    onBusyChange?.(b)
  }

  const pick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Cleared at once, or choosing the same photo again after a failure
    // fires no change event and the button appears to do nothing.
    event.target.value = ""
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("That is not a photo. Choose a picture file.")
      return
    }

    setBusyBoth(true)
    try {
      // A format this browser cannot draw (HEIC on Chrome for Windows, say)
      // goes up as it is rather than not at all — heavier, but on the shop.
      const small = await shrink(file).catch(() => file)
      const { files } = await sdk.admin.upload.create({ files: [small] })
      const url = files?.[0]?.url
      if (!url) throw new Error("The upload did not return a link.")
      onChange(url)
    } catch (err) {
      toast.error(
        err instanceof Error
          ? `The photo did not upload: ${err.message}`
          : "The photo did not upload."
      )
    } finally {
      setBusyBoth(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="bg-ui-bg-component flex size-24 flex-none items-center justify-center overflow-hidden rounded-lg border border-ui-border-base">
        {value && failedUrl !== value ? (
          <img
            src={value}
            alt=""
            onError={() => setFailedUrl(value)}
            className="size-full object-cover"
          />
        ) : (
          <Photo className="text-ui-fg-muted" />
        )}
      </div>
      <div className="flex flex-col items-start gap-2">
        <Button
          type="button"
          size="small"
          variant="secondary"
          isLoading={busy}
          onClick={() => input.current?.click()}
        >
          <ArrowUpTray />
          {value ? "Change photo" : "Choose a photo"}
        </Button>
        <Text size="xsmall" className="text-ui-fg-muted">
          Straight from your phone is fine. It is resized for you.
        </Text>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={pick}
      />
    </div>
  )
}
