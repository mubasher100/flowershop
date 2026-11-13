/**
 * When a change reaches the website.
 *
 * The storefront serves each datacentre's cached copy for up to 30 minutes
 * without checking whether it changed (bypassTagCacheOnCacheHit, see CLAUDE.md
 * "Caching & performance"). That copy is what keeps the site fast and inside
 * Cloudflare's CPU limit, so it stays; the app tells the florist the honest
 * time instead, and offers "Make it live now" (a fresh deploy) when it cannot
 * wait.
 */
export const LIVE_DELAY_MINUTES = 30

export const liveBy = (changedAt: Date | number | string) =>
  new Date(new Date(changedAt).getTime() + LIVE_DELAY_MINUTES * 60_000)

/** "3:42 pm", in Qatar time wherever the phone thinks it is. */
export const clock = (d: Date) =>
  d
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Qatar" })
    .replace(" AM", " am")
    .replace(" PM", " pm")

/** "26:10" until `target`, or null once it has passed. */
export function countdown(target: Date, now = new Date()): string | null {
  const ms = target.getTime() - now.getTime()
  if (ms <= 0) return null
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

/* ------------------------------------------------------------ change log */

export type Change = { what: string; at: string }

const KEY = "tt_shop_changes"

/**
 * What has changed recently, kept on this phone. Moves to the backend once
 * there is one record shared by every device (Website tab, next step).
 */
export function readChanges(): Change[] {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || "[]") as Change[]
    const cutoff = Date.now() - 24 * 3600_000
    return all.filter((c) => new Date(c.at).getTime() > cutoff)
  } catch {
    return []
  }
}

export function recordChange(what: string): Change {
  const change = { what, at: new Date().toISOString() }
  try {
    localStorage.setItem(KEY, JSON.stringify([change, ...readChanges()].slice(0, 50)))
  } catch {
    /* storage refused: the toast still shows the time */
  }
  window.dispatchEvent(new Event("tt-changes"))
  return change
}

/** Changes not yet live, newest first, and when the last of them will be. */
export function pending(now = new Date()) {
  const waiting = readChanges().filter((c) => liveBy(c.at) > now)
  const last = waiting.reduce<Date | null>((d, c) => {
    const t = liveBy(c.at)
    return !d || t > d ? t : d
  }, null)
  return { waiting, liveAt: last }
}
