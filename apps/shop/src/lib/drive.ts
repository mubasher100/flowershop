/**
 * Photos from a shared Google Drive folder, matched to flowers by name.
 *
 * The sheet carries one folder link (or it is pasted on the Spreadsheet
 * screen); each photo in the folder is named after its flower. The backend
 * does the reading (apps/backend/src/lib/drive-folder.ts), because Google's
 * pages cannot be read from a browser on another site.
 */
import { sdk } from "./sdk"

export type DriveFile = { id: string; name: string }
export type DriveFolder = {
  photos: DriveFile[]
  /** Current versions of photos already imported, by id, where known. */
  versions?: Record<string, string>
}

/** What a flower's metadata remembers about the photo it took from Drive. */
export type DrivePhotoNote = { id: string; version: string }

export const driveNoteOf = (metadata: Record<string, unknown> | null | undefined): DrivePhotoNote | null => {
  const note = metadata?.drive_photo as Partial<DrivePhotoNote> | undefined
  return note?.id ? { id: String(note.id), version: String(note.version ?? "") } : null
}

const EXTENSION = /\.(jpe?g|png|webp|heic|heif|gif|avif|bmp|tiff?)$/i

/**
 * One name, however it was typed: "Two-Hundred Roses & Lilies.JPG" and
 * "two hundred roses and lilies" are the same photo. Arabic is kept.
 */
export const photoKey = (name: string) =>
  name
    .trim()
    .replace(EXTENSION, "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/&/g, " and ")
    .replace(/['’`]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()

/** The folder's photos by name. Two photos can share one. */
export function photosByName(folder: DriveFolder | undefined): Map<string, DriveFile[]> {
  const out = new Map<string, DriveFile[]>()
  for (const p of folder?.photos ?? []) {
    const key = photoKey(p.name)
    if (!key) continue
    out.set(key, [...(out.get(key) ?? []), p])
  }
  return out
}

/** A link to one photo in Drive (not a folder): its id. */
export const driveFileIdOf = (url: string): string | null =>
  /drive\.google\.com\/file\/(?:u\/\d+\/)?d\/([\w-]{15,100})/i.exec(url)?.[1] ??
  /drive\.google\.com\/(?:open|uc|thumbnail)\?(?:[^\s#]*&)?id=([\w-]{15,100})/i.exec(url)?.[1] ??
  null

export async function readFolder(link: string): Promise<DriveFolder> {
  return sdk.client.fetch<DriveFolder>("/admin/drive-folder", { query: { link } })
}

/** Current versions of these photos, 50 at a time. */
export async function readVersions(ids: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  for (let i = 0; i < ids.length; i += 50) {
    const { versions } = await sdk.client.fetch<{ versions: Record<string, string> }>("/admin/drive-folder/versions", {
      query: { ids: ids.slice(i, i + 50).join(",") },
    })
    Object.assign(out, versions)
  }
  return out
}

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" }

/** One photo as a File, ready for the app's shrink-and-upload. */
export async function fetchDrivePhoto(id: string, name: string): Promise<File> {
  const res = await sdk.client.fetch<Response>(`/admin/drive-folder/photos/${id}`, { headers: { accept: "image/*" } })
  const blob = await res.blob()
  const base = photoKey(name).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "photo"
  return new File([blob], `${base}.${EXT[blob.type] ?? "jpg"}`, { type: blob.type })
}
