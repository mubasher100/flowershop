/**
 * Asks the storefront to refresh, once per burst of changes.
 *
 * One save can raise several events and an Excel import raises hundreds. Each
 * refresh clears Cloudflare's copies by tag, which the free plan limits to 5
 * a minute (bursts of 25) for the whole account, and makes the homepage
 * render again, which costs the Worker's CPU allowance. So changes are
 * collected until they have been quiet for QUIET_MS, or MAX_WAIT_MS has
 * passed, and sent as one.
 *
 * Fire-and-forget by design: a storefront that is down, redeploying or
 * misconfigured must never block or fail an admin save.
 */
type Logger = { warn: (message: string) => void }

const QUIET_MS = 4_000
const MAX_WAIT_MS = 20_000
/** A missed refresh is a stale price, so a failed call is tried again. */
const RETRY_MS = [5_000, 20_000]

/**
 * The pages most visitors open first. The first request after a refresh
 * rebuilds a page, which takes 3 to 5 seconds, so the shop's own server makes
 * that request. One at a time: each is a render on the Worker's free CPU.
 */
const BUSY_PAGES = ["", "/store", "/categories/hot-deals"]
const SEGMENTS = ["en-qa", "ar-qa"]

const pending = new Set<string>()
let timer: NodeJS.Timeout | null = null
let firstAt = 0

export function requestWebsiteRefresh(tags: string[], logger: Logger) {
  // Local dev usually has neither; saying so on every save is noise.
  if (!process.env.STOREFRONT_URL || !process.env.REVALIDATE_SECRET) return

  tags.forEach((t) => pending.add(t))
  const now = Date.now()
  if (!timer) firstAt = now
  else clearTimeout(timer)
  const wait = Math.max(0, Math.min(QUIET_MS, firstAt + MAX_WAIT_MS - now))
  timer = setTimeout(() => {
    timer = null
    const batch = [...pending]
    pending.clear()
    void send(batch, logger)
  }, wait)
  // Never keep the process alive just for this.
  timer.unref?.()
}

async function warm() {
  const site = process.env.STOREFRONT_URL!.replace(/\/$/, "")
  for (const segment of SEGMENTS) {
    for (const page of BUSY_PAGES) {
      // A new refresh will warm them again: do not render a page twice.
      if (timer) return
      try {
        const res = await fetch(`${site}/${segment}${page}`, {
          headers: { "user-agent": "Mozilla/5.0 (tulips-and-truffles warm-up)" },
          signal: AbortSignal.timeout(20_000),
        })
        await res.arrayBuffer()
      } catch {
        /* a visitor's request rebuilds it instead */
      }
    }
  }
}

async function send(tags: string[], logger: Logger) {
  const url = `${process.env.STOREFRONT_URL!.replace(/\/$/, "")}/api/revalidate`
  for (let attempt = 0; ; attempt++) {
    let problem: string
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-revalidate-secret": process.env.REVALIDATE_SECRET!,
        },
        body: JSON.stringify({ tags }),
        signal: AbortSignal.timeout(10_000),
      })
      if (res.ok) return warm()
      problem = `returned ${res.status}`
    } catch (e) {
      problem = `failed: ${e instanceof Error ? e.message : String(e)}`
    }
    if (attempt >= RETRY_MS.length) {
      logger.warn(`Storefront refresh ${problem} (${tags.join(", ")})`)
      return
    }
    await new Promise((r) => setTimeout(r, RETRY_MS[attempt]))
  }
}
