/**
 * Photos in a shared Google Drive folder, for the product spreadsheet.
 *
 * The shop pastes one folder link into the sheet and names each photo after
 * its flower. The folder is read through Drive's public pages, so nobody has
 * to make a Google API key: it only has to be shared with "Anyone with the
 * link". Reading goes through this server because Google sends no CORS header
 * on the folder page. Every address fetched here is a fixed Google host with
 * an id that has been checked, never an address from the request.
 *
 * scripts/lib/drive-folder.mjs is the same thing for the Node importer.
 */
export type DriveFile = { id: string; name: string }

const ID = /^[\w-]{15,100}$/
const MAX_FOLDERS = 30
const MAX_BYTES = 25 * 1024 * 1024
const TIMEOUT_MS = 30_000

export const isDriveId = (id: string) => ID.test(id)

/** The folder in a Drive link, however it was copied (/u/2/folders/, open?id=). */
export const folderIdOf = (link: string): string | null =>
  /drive\.google\.com\/(?:[^\s?#]*\/)?folders\/([\w-]{15,100})/i.exec(
    link
  )?.[1] ??
  /drive\.google\.com\/(?:open|folderview)\?(?:[^\s#]*&)?id=([\w-]{15,100})/i.exec(
    link
  )?.[1] ??
  null

const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
}

const decode = (s: string) =>
  s.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (all, code: string) => {
    if (code[0] !== "#") return NAMED[code.toLowerCase()] ?? all
    const n = /^#x/i.test(code)
      ? parseInt(code.slice(2), 16)
      : parseInt(code.slice(1), 10)
    return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : all
  })

/** The photos and the folders on one folder page. */
export function parseFolderPage(html: string): {
  photos: DriveFile[]
  folders: string[]
} {
  const photos: DriveFile[] = []
  const folders: string[] = []
  const entries = html.split('<div class="flip-entry" id="entry-').slice(1)
  for (const entry of entries) {
    const id = /^([\w-]+)"/.exec(entry)?.[1]
    if (!id || !isDriveId(id)) continue
    const href = /<a href="([^"]+)"/.exec(entry)?.[1] ?? ""
    // The icon's address carries the file type in every language.
    const type = /\/type\/([\w.+-]+\/[\w.+-]+)"/.exec(entry)?.[1] ?? ""
    const name = decode(
      /flip-entry-title">([^<]*)</.exec(entry)?.[1] ?? ""
    ).trim()
    if (/\/folders\//.test(href)) folders.push(id)
    else if (name && type.startsWith("image/")) photos.push({ id, name })
  }
  return { photos, folders }
}

export class DriveError extends Error {}

const get = (url: string, method: "GET" | "HEAD" = "GET") =>
  fetch(url, {
    method,
    headers: { "user-agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })

const PRIVATE =
  "That Google Drive folder can't be opened. In Drive, choose Share, then General access: Anyone with the link, and try again."

async function folderPage(id: string) {
  const res = await get(
    `https://drive.google.com/embeddedfolderview?id=${id}&hl=en`
  ).catch(() => {
    throw new DriveError("Google Drive did not answer. Try again in a minute.")
  })
  // A folder that is not shared redirects to Google's sign-in page.
  if (
    [401, 403, 404].includes(res.status) ||
    res.url.includes("accounts.google.com")
  ) {
    throw new DriveError(PRIVATE)
  }
  if (!res.ok) {
    throw new DriveError(
      `Google Drive answered ${res.status}. Try again in a minute.`
    )
  }
  const html = await res.text()
  if (!html.includes("flip-entries")) throw new DriveError(PRIVATE)
  return parseFolderPage(html)
}

/** Every photo in a folder and the folders inside it. */
export async function listPhotos(folderId: string): Promise<DriveFile[]> {
  const photos: DriveFile[] = []
  const seen = new Set([folderId])
  const queue = [folderId]
  for (let i = 0; i < queue.length; i++) {
    const page = await folderPage(queue[i])
    photos.push(...page.photos)
    for (const f of page.folders) {
      if (seen.has(f)) continue
      if (seen.size >= MAX_FOLDERS) {
        throw new DriveError(
          `There are more than ${MAX_FOLDERS} folders inside that folder. Put the photos in one folder.`
        )
      }
      seen.add(f)
      queue.push(f)
    }
  }
  return photos
}

/**
 * What a photo looks like now, as text to compare with later. Replacing a
 * file in Drive keeps its id, so the id alone cannot show a new photo. Empty
 * when Google does not say.
 */
export async function photoVersion(id: string): Promise<string> {
  try {
    const res = await get(
      `https://drive.usercontent.google.com/download?id=${id}&export=download`,
      "HEAD"
    )
    const at = Date.parse(res.headers.get("last-modified") ?? "")
    if (!res.ok || Number.isNaN(at)) return ""
    return `${at}-${res.headers.get("content-length") ?? ""}`
  } catch {
    return ""
  }
}

/** Run `work` over `items`, at most `limit` at a time, keeping their order. */
export async function mapLimited<T, R>(
  items: T[],
  limit: number,
  work: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await work(items[i])
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  )
  return out
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

const TOO_BIG = "That photo is larger than 25 MB."

/**
 * A photo's bytes. Google's image server comes first: it turns an iPhone's
 * HEIC into something a browser can read. The plain download is the fallback.
 */
export async function downloadPhoto(
  id: string
): Promise<{ data: Buffer; type: string }> {
  const sources = [
    `https://lh3.googleusercontent.com/d/${id}=w2000`,
    `https://drive.usercontent.google.com/download?id=${id}&export=download`,
  ]
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt) await wait(1500)
    for (const url of sources) {
      const res = await get(url).catch(() => null)
      const type = res?.headers.get("content-type")?.split(";")[0] ?? ""
      if (!res?.ok || !type.startsWith("image/") || type.includes("svg")) {
        await res?.body?.cancel().catch(() => {})
        continue
      }
      if (Number(res.headers.get("content-length") ?? 0) > MAX_BYTES) {
        await res.body?.cancel().catch(() => {})
        throw new DriveError(TOO_BIG)
      }
      const data = await res
        .arrayBuffer()
        .then((b) => Buffer.from(b))
        .catch(() => null)
      if (!data) continue
      if (data.length > MAX_BYTES) throw new DriveError(TOO_BIG)
      return { data, type }
    }
  }
  throw new DriveError("The photo could not be downloaded from Google Drive.")
}
