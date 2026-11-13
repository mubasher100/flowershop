/**
 * Adds the photo sizes the shop app made to the storefront's image manifest.
 *
 * The shop app makes 320/640/960/1280px copies of every flower photo it
 * uploads and records them on the product (metadata.image_variants, see
 * apps/shop/src/lib/variants.ts). This reads them through the public Store
 * API — the same publishable key the storefront build already has, no admin
 * password — and merges them into src/lib/util/image-variants.json before the
 * build, so a flower added from a phone is served small after the next deploy
 * instead of waiting for someone to run build-image-variants.mjs by hand.
 *
 *   BACKEND_URL=… PUBLISHABLE_KEY=… node scripts/merge-image-variants.mjs
 *
 * Only adds: an image already in the manifest keeps its entry. Run in the
 * deploy workflow and allowed to fail — without it, a new photo is served at
 * its uploaded size, as before, never broken.
 */
import fs from "fs"
import path from "path"

const BACKEND = (process.env.BACKEND_URL ?? "").replace(/\/$/, "")
const KEY = process.env.PUBLISHABLE_KEY
if (!BACKEND || !KEY) {
  console.log("No BACKEND_URL / PUBLISHABLE_KEY: nothing to merge.")
  process.exit(0)
}

const MANIFEST = path.resolve(import.meta.dirname, "../apps/storefront/src/lib/util/image-variants.json")
const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"))

const isUrl = (v) => typeof v === "string" && /^https:\/\//.test(v)

let added = 0
for (let offset = 0; ; offset += 100) {
  const res = await fetch(`${BACKEND}/store/products?limit=100&offset=${offset}&fields=id,metadata`, {
    headers: { "x-publishable-api-key": KEY },
  })
  if (!res.ok) throw new Error(`Store API answered ${res.status}`)
  const { products, count } = await res.json()
  for (const p of products ?? []) {
    const ladders = p.metadata?.image_variants
    if (!ladders || typeof ladders !== "object") continue
    for (const [url, ladder] of Object.entries(ladders)) {
      if (!isUrl(url) || manifest[url] || !ladder || typeof ladder !== "object") continue
      const clean = Object.fromEntries(Object.entries(ladder).filter(([w, u]) => /^\d+$/.test(w) && isUrl(u)))
      if (Object.keys(clean).length < 2) continue
      manifest[url] = clean
      added++
    }
  }
  if (offset + 100 >= (count ?? 0)) break
}

fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n")
console.log(`${added} photo${added === 1 ? "" : "s"} from the shop app added; ${Object.keys(manifest).length} in the manifest.`)
