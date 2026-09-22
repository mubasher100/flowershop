/**
 * Re-encodes the catalogue's photography as WebP, in place.
 *
 * Next's image optimiser does not run on the Cloudflare deployment, so
 * whatever sits in the R2 bucket is exactly what a phone downloads. The
 * homepage was shipping 1.86 MB of JPEG and taking 9.4s to paint its largest
 * image on a throttled connection — most of Qatar's flower traffic.
 *
 * A maintenance script rather than a Medusa one on purpose: it needs sharp,
 * and sharp is 30 MB that the Railway container has no reason to carry.
 *
 *   MEDUSA_URL=… ADMIN_EMAIL=… ADMIN_PASSWORD=… node scripts/optimise-media.mjs
 *
 * Idempotent — an image already served as .webp is skipped — and it never
 * deletes the original, which is the only copy of the source.
 */
import sharp from "sharp"

const BE = process.env.MEDUSA_URL ?? "https://medusa-backend-sg-production.up.railway.app"
const EMAIL = process.env.ADMIN_EMAIL
const PASSWORD = process.env.ADMIN_PASSWORD
/** Wide enough for a 2× phone and the desktop grid; past that is waste. */
const MAX_EDGE = 1200
const QUALITY = 78

if (!EMAIL || !PASSWORD) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD.")
  process.exit(1)
}

const { token } = await fetch(`${BE}/auth/user/emailpass`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
}).then((r) => r.json())

const auth = { authorization: `Bearer ${token}` }
const api = async (path, init = {}) => {
  const res = await fetch(BE + path, {
    ...init,
    headers: { ...auth, "content-type": "application/json", ...(init.headers ?? {}) },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${JSON.stringify(body).slice(0, 160)}`)
  return body
}

const { products } = await api(
  "/admin/products?limit=200&fields=id,title,handle,thumbnail,*images"
)

let changed = 0
let skipped = 0
let saved = 0
const done = new Map()

const convert = async (url, handle, index) => {
  if (done.has(url)) return done.get(url)

  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`)
  const original = Buffer.from(await res.arrayBuffer())

  const webp = await sharp(original)
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toBuffer()

  // Leave it alone if the re-encode is not actually smaller.
  if (webp.length >= original.length) {
    done.set(url, url)
    return url
  }

  const form = new FormData()
  form.append(
    "files",
    new Blob([webp], { type: "image/webp" }),
    `${handle}${index ? `-${index}` : ""}.webp`
  )
  const upload = await fetch(`${BE}/admin/uploads`, {
    method: "POST",
    headers: auth,
    body: form,
  }).then((r) => r.json())

  const newUrl = upload.files?.[0]?.url ?? upload.uploads?.[0]?.url
  if (!newUrl) throw new Error(`upload failed: ${JSON.stringify(upload).slice(0, 160)}`)

  saved += original.length - webp.length
  done.set(url, newUrl)
  return newUrl
}

for (const p of products) {
  const images = p.images ?? []
  const needsWork =
    (p.thumbnail && !p.thumbnail.endsWith(".webp")) ||
    images.some((i) => !i.url.endsWith(".webp"))

  if (!needsWork) {
    skipped++
    continue
  }

  try {
    const newImages = []
    for (const [index, img] of images.entries()) {
      newImages.push({
        url: img.url.endsWith(".webp") ? img.url : await convert(img.url, p.handle, index),
      })
    }
    const thumbnail =
      p.thumbnail && !p.thumbnail.endsWith(".webp")
        ? await convert(p.thumbnail, p.handle, 0)
        : p.thumbnail

    await api(`/admin/products/${p.id}`, {
      method: "POST",
      body: JSON.stringify({ thumbnail, images: newImages }),
    })
    changed++
    console.log(`  ${p.title} -> ${thumbnail}`)
  } catch (e) {
    console.error(`  ${p.title}: ${e.message}`)
  }
}

console.log(
  `\nOptimised ${changed} product(s), skipped ${skipped} already WebP. ` +
    `Saved ${Math.round(saved / 1024)}KB.`
)
