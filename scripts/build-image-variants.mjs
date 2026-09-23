/**
 * Generates the responsive image variants the storefront serves.
 *
 * Next's image optimiser does not run on Cloudflare Workers, so
 * `images.unoptimized` is on and whatever is in the bucket is exactly what a
 * phone downloads. That meant a 900px photograph arriving for a 165px card —
 * roughly thirty times the pixels needed, and 1.5 MB on the homepage.
 *
 * Rather than pay for an image service, every image gets a fixed ladder of
 * widths up front and a custom Next loader picks the nearest one. The ladder
 * is recorded in image-variants.json; anything missing from that file falls
 * back to the original, so an image uploaded from the admin after this ran is
 * heavier than it needs to be but never broken.
 *
 *   ADMIN_EMAIL=… ADMIN_PASSWORD=… node scripts/build-image-variants.mjs
 *
 * Idempotent: an image whose variants are already in the manifest is skipped.
 */
import fs from "fs"
import path from "path"
import sharp from "sharp"

const BE = process.env.MEDUSA_URL ?? "https://medusa-backend-sg-production.up.railway.app"
const EMAIL = process.env.ADMIN_EMAIL
const PASSWORD = process.env.ADMIN_PASSWORD

/** Covers a 320px card at 1×, the same at 2×, and a full-width phone hero. */
const WIDTHS = [320, 640, 960, 1280]
const QUALITY = 74

const ROOT = path.resolve(import.meta.dirname, "..")
const PUBLIC_DIR = path.join(ROOT, "apps/storefront/public")
const MANIFEST = path.join(ROOT, "apps/storefront/src/lib/util/image-variants.json")

const manifest = fs.existsSync(MANIFEST)
  ? JSON.parse(fs.readFileSync(MANIFEST, "utf8"))
  : {}

let generated = 0
let savedBytes = 0

// ---------------------------------------------------------------- public/
/** Images shipped with the app: the wordmark and the hero photographs. */
const publicTargets = []
for (const dir of ["brand", "hero", "placeholders", "products"]) {
  const full = path.join(PUBLIC_DIR, dir)
  if (!fs.existsSync(full)) continue
  for (const file of fs.readdirSync(full)) {
    if (!/\.(jpe?g|png|webp)$/i.test(file)) continue
    if (/-\d+\.(jpe?g|png|webp)$/i.test(file)) continue // already a variant
    publicTargets.push({ dir, file })
  }
}

for (const { dir, file } of publicTargets) {
  const src = `/${dir}/${file}`
  const abs = path.join(PUBLIC_DIR, dir, file)
  const meta = await sharp(abs).metadata()
  const ladder = {}

  for (const w of WIDTHS) {
    // No point upscaling, and no point making a variant the same size as the
    // original — the original already serves that width.
    if (!meta.width || w >= meta.width) continue
    const out = `/${dir}/${file.replace(/\.(jpe?g|png|webp)$/i, "")}-${w}.webp`
    const outAbs = path.join(PUBLIC_DIR, out.replace(/^\//, ""))
    if (!fs.existsSync(outAbs)) {
      await sharp(abs).resize({ width: w, withoutEnlargement: true }).webp({ quality: QUALITY }).toFile(outAbs)
      generated++
      savedBytes += fs.statSync(abs).size - fs.statSync(outAbs).size
    }
    ladder[w] = out
  }

  /**
   * A JPEG or PNG original would otherwise sit at the top of the ladder and
   * be served at full width — so the widest rung gets a WebP of its own.
   */
  const topWidth = Math.min(meta.width ?? 0, WIDTHS[WIDTHS.length - 1])
  if (!/\.webp$/i.test(file) && topWidth) {
    const out = `/${dir}/${file.replace(/\.(jpe?g|png|webp)$/i, "")}-${topWidth}.webp`
    const outAbs = path.join(PUBLIC_DIR, out.replace(/^\//, ""))
    if (!fs.existsSync(outAbs)) {
      await sharp(abs).resize({ width: topWidth, withoutEnlargement: true }).webp({ quality: QUALITY }).toFile(outAbs)
      generated++
      savedBytes += fs.statSync(abs).size - fs.statSync(outAbs).size
    }
    ladder[topWidth] = out
  } else if (meta.width) {
    ladder[meta.width] = src
  }

  if (Object.keys(ladder).length) {
    manifest[src] = ladder
    console.log(`  ${src} -> ${Object.keys(ladder).join(", ")}`)
  }
}

// ---------------------------------------------------------------- R2
if (EMAIL && PASSWORD) {
  const { token } = await fetch(`${BE}/auth/user/emailpass`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  }).then((r) => r.json())
  const auth = { authorization: `Bearer ${token}` }

  const { products } = await fetch(
    `${BE}/admin/products?limit=200&fields=id,title,handle,thumbnail,*images`,
    { headers: auth }
  ).then((r) => r.json())

  const urls = new Map()
  for (const p of products ?? []) {
    for (const u of [p.thumbnail, ...(p.images ?? []).map((i) => i.url)]) {
      if (u && !urls.has(u)) urls.set(u, p.handle)
    }
  }

  for (const [url, handle] of urls) {
    if (manifest[url]) continue
    try {
      const original = Buffer.from(await fetch(url).then((r) => r.arrayBuffer()))
      const meta = await sharp(original).metadata()
      const ladder = {}

      for (const w of WIDTHS) {
        if (!meta.width || w >= meta.width) continue
        const buf = await sharp(original)
          .resize({ width: w, withoutEnlargement: true })
          .webp({ quality: QUALITY })
          .toBuffer()

        const form = new FormData()
        form.append("files", new Blob([buf], { type: "image/webp" }), `${handle}-${w}.webp`)
        const up = await fetch(`${BE}/admin/uploads`, { method: "POST", headers: auth, body: form })
          .then((r) => r.json())
        const variantUrl = up.files?.[0]?.url ?? up.uploads?.[0]?.url
        if (!variantUrl) throw new Error("upload returned no url")

        ladder[w] = variantUrl
        generated++
        savedBytes += original.length - buf.length
      }

      if (Object.keys(ladder).length) {
        ladder[meta.width] = url
        manifest[url] = ladder
        console.log(`  ${handle} -> ${Object.keys(ladder).join(", ")}`)
      }
    } catch (e) {
      console.error(`  ${handle}: ${e.message}`)
    }
  }
} else {
  console.log("\n(no ADMIN_EMAIL/ADMIN_PASSWORD — skipped the R2 catalogue)")
}

fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n")
console.log(
  `\n${generated} variants generated, ${Object.keys(manifest).length} images in the manifest.`
)
