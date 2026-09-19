import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"

/**
 * Moves product images from one media host to another.
 *
 * Used when the R2 bucket changes account: the file module is already
 * configured for the NEW bucket (S3_* variables), and the OLD bucket's public
 * URL is still serving. For every product image whose URL starts with the
 * old prefix, this downloads it from the old host, stores it through the file
 * module, and rewrites the product to the URL that comes back.
 *
 *   OLD_MEDIA_URL=https://pub-xxxx.r2.dev npx medusa exec ./src/scripts/rehost-media.ts
 *
 * Idempotent: an image already on the new host is left alone, so it can be
 * re-run after a partial failure. Nothing is deleted from the old bucket.
 */
export default async function rehostMedia({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fileService = container.resolve(Modules.FILE)
  const productService = container.resolve(Modules.PRODUCT)

  const oldPrefix = (process.env.OLD_MEDIA_URL ?? "").replace(/\/$/, "")
  if (!oldPrefix) {
    throw new Error("OLD_MEDIA_URL is required, e.g. https://pub-xxxx.r2.dev")
  }
  if (!process.env.S3_FILE_URL) {
    throw new Error(
      "S3_FILE_URL is not set — the file module would store to local disk, not the new bucket."
    )
  }

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle", "thumbnail", "images.id", "images.url"],
  })

  const isOld = (url?: string | null) => !!url && url.startsWith(oldPrefix + "/")
  // Uploads are keyed by old URL so an image used as both thumbnail and
  // gallery entry moves once.
  const moved = new Map<string, string>()

  const move = async (url: string, handle: string, index: number) => {
    const cached = moved.get(url)
    if (cached) return cached

    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`${url} -> HTTP ${res.status}`)
    }
    const bytes = Buffer.from(await res.arrayBuffer())
    const ext = url.split(".").pop()?.split("?")[0] || "jpg"
    const mime = res.headers.get("content-type") || `image/${ext === "jpg" ? "jpeg" : ext}`

    const [stored] = await fileService.createFiles([
      {
        filename: `${handle}${index ? `-${index}` : ""}.${ext}`,
        mimeType: mime,
        content: bytes.toString("base64"),
        access: "public",
      },
    ])
    moved.set(url, stored.url)
    return stored.url
  }

  let changed = 0
  let untouched = 0

  for (const p of products as {
    id: string
    title: string
    handle: string
    thumbnail: string | null
    images?: { id: string; url: string }[] | null
  }[]) {
    const images = p.images ?? []
    const needsWork = isOld(p.thumbnail) || images.some((i) => isOld(i.url))
    if (!needsWork) {
      untouched++
      continue
    }

    try {
      const newImages: { id?: string; url: string }[] = []
      for (const [index, img] of images.entries()) {
        newImages.push({
          id: img.id,
          url: isOld(img.url) ? await move(img.url, p.handle, index) : img.url,
        })
      }
      const thumbnail = isOld(p.thumbnail)
        ? await move(p.thumbnail!, p.handle, 0)
        : p.thumbnail

      await productService.updateProducts(p.id, {
        thumbnail,
        images: newImages,
      })
      changed++
      logger.info(`  ${p.title} -> ${thumbnail}`)
    } catch (e) {
      logger.error(`  ${p.title}: ${(e as Error).message}`)
    }
  }

  logger.info(
    `Rehosted ${changed} product(s); ${untouched} already on the new host. ` +
      `Storefront pages pick up the new URLs on their next revalidation.`
  )
}
