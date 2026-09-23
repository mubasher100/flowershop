import variants from "./image-variants.json"

/**
 * Picks the smallest pre-generated variant that still covers the slot.
 *
 * Next's own optimiser does not run on Cloudflare Workers, so without this
 * every <Image> served its full-size original — a 900px photograph for a
 * 165px card. The ladder is built ahead of time by
 * scripts/build-image-variants.mjs; an image missing from the manifest falls
 * through to its original URL, so a product added from the admin since that
 * last ran is heavier than it needs to be but never broken.
 */
export default function imageLoader({ src, width }) {
  const ladder = variants[src]
  if (!ladder) return src

  const available = Object.keys(ladder)
    .map(Number)
    .filter((w) => Number.isFinite(w))
    .sort((a, b) => a - b)

  const chosen = available.find((w) => w >= width) ?? available[available.length - 1]
  return ladder[String(chosen)] ?? src
}
