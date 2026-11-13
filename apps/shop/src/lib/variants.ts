/**
 * Photo sizes for the website, made on the phone.
 *
 * The storefront serves each photo from a ladder of widths (320/640/960/1280)
 * listed in apps/storefront/src/lib/util/image-variants.json, because Next's
 * image optimiser does not run on Cloudflare Workers. That ladder used to be
 * made only by scripts/build-image-variants.mjs, run by hand with the admin
 * password — so a flower added from the phone was served full size until
 * someone remembered.
 *
 * Now the app makes the ladder itself when it uploads a flower's photo, and
 * records it on the product (metadata.image_variants: { [url]: { width: url } }).
 * The storefront deploy reads those through the Store API
 * (scripts/merge-image-variants.mjs) — no password involved — so the next
 * deploy, including Make it live now, serves the small sizes.
 */
import { sdk } from "./sdk"

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

export const WIDTHS = [320, 640, 960, 1280]
const QUALITY = 0.74

/** Ladders made in this session, by the uploaded photo's URL. */
const ladders = new Map<string, Record<string, string>>()

async function upload(file: File) {
  const { files } = await sdk.admin.upload.create({ files: [file] })
  const url = files?.[0]?.url
  if (!url) throw new Error("The upload did not return a link.")
  return url
}

async function resized(source: File, width: number, name: string): Promise<File | null> {
  const bitmap = await createImageBitmap(source)
  const scale = width / bitmap.width
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", QUALITY))
  return blob ? new File([blob], `${name}-${width}.webp`, { type: "image/webp" }) : null
}

/**
 * Shrink a photo to 1600px, upload it, then make and upload its smaller
 * sizes. The sizes are a bonus: if any of them fails the photo is still
 * uploaded and simply served full size, as before.
 */
export async function uploadPhoto(file: File): Promise<string> {
  const small = await shrink(file).catch(() => file)
  const url = await upload(small)
  try {
    const bitmap = await createImageBitmap(small)
    const full = bitmap.width
    bitmap.close()
    const name = small.name.replace(/\.[^.]+$/, "") || "photo"
    const ladder: Record<string, string> = {}
    for (const w of WIDTHS) {
      if (w >= full) continue
      const f = await resized(small, w, name)
      if (f) ladder[w] = await upload(f)
    }
    if (Object.keys(ladder).length) {
      ladder[full] = url
      ladders.set(url, ladder)
    }
  } catch {
    /* sizes are optional */
  }
  return url
}

/**
 * Record a photo's sizes on the product it now belongs to. Never throws: a
 * missing ladder only means the website serves that photo full size.
 */
export async function recordVariants(productId: string, url: string | null | undefined) {
  const ladder = url ? ladders.get(url) : undefined
  if (!url || !ladder) return
  try {
    const { product } = await sdk.admin.product.retrieve(productId, { fields: "id,metadata" })
    const meta = (product.metadata ?? {}) as Record<string, unknown>
    // Keep only the current photo's ladder: an old photo's sizes are no use.
    await sdk.admin.product.update(productId, { metadata: { ...meta, image_variants: { [url]: ladder } } })
  } catch {
    /* sizes are optional */
  }
}
