/**
 * Photos in a shared Google Drive folder, for import-products.mjs.
 *
 * The same reading as apps/backend/src/lib/drive-folder.ts and the same name
 * matching as apps/shop/src/lib/drive.ts: change them together. The folder
 * only has to be shared with "Anyone with the link"; no Google key is needed.
 */
export const folderIdOf = (link) =>
  /drive\.google\.com\/(?:[^\s?#]*\/)?folders\/([\w-]{15,100})/i.exec(link)?.[1] ??
  /drive\.google\.com\/(?:open|folderview)\?(?:[^\s#]*&)?id=([\w-]{15,100})/i.exec(link)?.[1] ??
  null

export const photoKey = (name) =>
  name
    .trim()
    .replace(/\.(jpe?g|png|webp|heic|heif|gif|avif|bmp|tiff?)$/i, "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/&/g, " and ")
    .replace(/['’`]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()

const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " }
const decode = (s) =>
  s.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (all, code) =>
    code[0] !== "#"
      ? NAMED[code.toLowerCase()] ?? all
      : String.fromCodePoint(
          /^#x/i.test(code) ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
        )
  )

const get = (url) =>
  fetch(url, { headers: { "user-agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(30_000) })

/** Every photo in the folder and the folders inside it, by photoKey. */
export async function listPhotos(link) {
  const root = folderIdOf(link)
  if (!root) throw new Error("that is not a Google Drive folder link")
  const byName = new Map()
  const queue = [root]
  for (let i = 0; i < queue.length && i < 30; i++) {
    const res = await get(`https://drive.google.com/embeddedfolderview?id=${queue[i]}&hl=en`)
    const html = res.ok ? await res.text() : ""
    if (!html.includes("flip-entries")) {
      throw new Error("the folder can't be opened: share it with Anyone with the link")
    }
    for (const entry of html.split('<div class="flip-entry" id="entry-').slice(1)) {
      const id = /^([\w-]{15,100})"/.exec(entry)?.[1]
      if (!id) continue
      const href = /<a href="([^"]+)"/.exec(entry)?.[1] ?? ""
      const type = /\/type\/([\w.+-]+\/[\w.+-]+)"/.exec(entry)?.[1] ?? ""
      const name = decode(/flip-entry-title">([^<]*)</.exec(entry)?.[1] ?? "").trim()
      if (/\/folders\//.test(href)) {
        if (!queue.includes(id)) queue.push(id)
      } else if (name && type.startsWith("image/") && !byName.has(photoKey(name))) {
        byName.set(photoKey(name), { id, name })
      }
    }
  }
  return byName
}

export async function downloadPhoto(id) {
  for (const url of [
    `https://lh3.googleusercontent.com/d/${id}=w2000`,
    `https://drive.usercontent.google.com/download?id=${id}&export=download`,
  ]) {
    const res = await get(url).catch(() => null)
    if (res?.ok && /^image\//.test(res.headers.get("content-type") ?? "")) {
      return Buffer.from(await res.arrayBuffer())
    }
  }
  throw new Error("the photo could not be downloaded from Google Drive")
}
