import { useRef, useState } from "react"

import { messageOf } from "../lib/bulk"
import { sdk } from "../lib/sdk"
import { Spinner, toast } from "./ui"

const MAX_EDGE = 1600

/**
 * Shrink a phone photo (3–8 MB, ~4000px) to 1600px WebP before uploading, as
 * the admin's photo picker does. createImageBitmap honours the camera's
 * orientation, so a portrait does not arrive on its side.
 */
export async function shrink(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.82))
  if (!blob) return file
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "photo"}.webp`, { type: "image/webp" })
}

export function PhotoField({
  value,
  onChange,
  onBusy,
}: {
  value: string | null
  onChange: (url: string | null) => void
  onBusy?: (busy: boolean) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast("That is not a photo. Choose a picture.", "error")
      return
    }
    setBusy(true)
    onBusy?.(true)
    try {
      const small = await shrink(file).catch(() => file)
      const { files } = await sdk.admin.upload.create({ files: [small] })
      const url = files?.[0]?.url
      if (!url) throw new Error("The upload did not return a link.")
      onChange(url)
    } catch (err) {
      toast(`The photo did not upload: ${messageOf(err)}`, "error")
    } finally {
      setBusy(false)
      onBusy?.(false)
    }
  }

  // With a photo already chosen, keep it small: the price and stock below
  // are what an edit is usually for, and should not be pushed off screen.
  if (value) {
    return (
      <div className="flex items-center gap-3">
        <span className="relative h-24 w-24 flex-none overflow-hidden rounded-2xl bg-ink-50">
          <img src={value} alt="Current photo" className="h-full w-full object-cover" />
          {busy && (
            <span className="absolute inset-0 flex items-center justify-center bg-white/80">
              <Spinner />
            </span>
          )}
        </span>
        <button type="button" disabled={busy} onClick={() => input.current?.click()} className="min-h-[44px] rounded-xl border border-ink-200 bg-white px-4 font-medium disabled:opacity-50">
          {busy ? "Uploading…" : "Change photo"}
        </button>
        <input ref={input} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={pick} aria-label="Photo" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink-700">Photo</span>
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="relative flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-ink-200 bg-ink-50 text-ink-600"
      >
        <span className="flex flex-col items-center gap-1">
          <span className="text-3xl" aria-hidden>
            +
          </span>
          Take or choose a photo
        </span>
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center gap-2 bg-white/80 font-medium">
            <Spinner /> Uploading…
          </span>
        )}
      </button>
      <input ref={input} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={pick} aria-label="Photo" />
    </div>
  )
}
