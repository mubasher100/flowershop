import { defineCloudflareConfig } from "@opennextjs/cloudflare"
import { purgeCache } from "@opennextjs/cloudflare/overrides/cache-purge/index"
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache"
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache"
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue"
import doShardedTagCache from "@opennextjs/cloudflare/overrides/tag-cache/do-sharded-tag-cache"

/**
 * Incremental cache backed by R2, with a per-datacentre layer in front.
 *
 * Without a persistent store, every Worker isolate renders pages from scratch
 * and re-fetches the Store API — which is why a cold homepage was taking
 * seconds even after the backend moved next to the database.
 *
 * The bucket (`flowershop-cache`) is in APAC, alongside the backend and
 * database, so a cache miss doesn't cross regions to repopulate. The binding
 * name is fixed by the adapter: NEXT_INC_CACHE_R2_BUCKET, set in
 * wrangler.jsonc.
 *
 * `withRegionalCache` puts the Cloudflare Cache API in front of R2, so an
 * entry already read in this datacentre is not fetched across the network
 * again. The homepage makes six cached calls to build its rails and the
 * catalogue three; at an R2 round trip each, that was most of the response
 * time on a page that renders no per-visitor content at all.
 *
 */
const regionalCache = withRegionalCache(r2IncrementalCache, {
  mode: "long-lived",

  /**
   * Tuned for the Worker's CPU allowance, which is the binding constraint
   * here — not for freshness.
   *
   * Two things cost CPU: rendering a page, and calling the tag-cache
   * Durable Object. Both of the earlier settings made one of them happen
   * constantly and took the site down with Cloudflare 1102, "Worker
   * exceeded resource limits":
   *
   *   - a 60-second entry lifetime meant the homepage fell out of cache
   *     continuously, and a full render of it does not fit in the budget;
   *   - consulting the tag cache on every hit put a Durable Object round
   *     trip on every request.
   *
   * So: long-lived entries, and no tag check on a hit. Renders stay rare
   * and a cache hit is close to free.
   *
   * Freshness comes from `cachePurge` below instead: an edit removes the
   * affected entries from every datacentre, so nothing has to be checked on
   * a hit.
   */
  bypassTagCacheOnCacheHit: true,
  // Off: it re-reads R2 and rewrites the entry on every single hit, which
  // costs CPU and, without a tag check, renews an out-of-date copy's 30
  // minutes for as long as anyone keeps visiting.
  shouldLazilyUpdateOnCacheHit: false,
})

/**
 * Fetched data always checks its tags; only pages skip the check on a hit.
 *
 * Next 15 hands a fetch's tags to the cache separately, so the entry is stored
 * without them and a tag purge cannot find it. A page was then rebuilt from
 * the old data the moment it was purged, and kept as fresh: a saved change
 * never appeared (found on staging, 23 Nov 2026). Data is only read while a
 * page renders, which is rare, so the check costs little.
 */
const regionalGet = regionalCache.get.bind(regionalCache)
regionalCache.get = async (key, cacheType) => {
  const entry = await regionalGet(key, cacheType)
  return entry && cacheType === "fetch"
    ? { ...entry, shouldBypassTagCache: false }
    : entry
}

export default defineCloudflareConfig({
  incrementalCache: regionalCache,

  /**
   * Clears Cloudflare's copies by tag when the shop changes something, so an
   * edit shows in seconds rather than half an hour. Tag purge has been on
   * every plan since April 2025; it needs the zone, which the shop's own
   * domain gives it. Uses CACHE_PURGE_ZONE_ID and CACHE_PURGE_API_TOKEN, and
   * without them it logs and does nothing (entries then expire on their own).
   *
   * The free plan allows 5 purges a minute for the whole account: the backend
   * groups changes into one call (apps/backend/src/lib/website-refresh.ts).
   * Staging shares the zone and the tag names, so a purge there also clears
   * the live copies. That is harmless: live then re-reads R2, and nothing on
   * live has been marked as changed.
   */
  cachePurge: purgeCache({ type: "direct" }),

  /**
   * Tag cache — this is what makes `revalidateTag` do anything at all.
   *
   * It defaults to "dummy", which silently discards every tag. The backend
   * subscriber had been posting to /api/revalidate on every product, price and
   * inventory change since it was written, and none of it invalidated
   * anything: pages refreshed only when their own `revalidate` window expired,
   * and `force-cache` fetches with no `revalidate` never expired at all.
   *
   * Sharded Durable Objects rather than D1 or KV. D1 would put a query on the
   * path of every cache read, which is exactly what the regional cache above
   * exists to avoid; KV is documented as experimental and can take a minute to
   * reflect a write, which defeats the point. The DO uses SQLite storage and
   * creates its own schema on first use, so there is no migration to run.
   *
   * No `regionalCache` for the tag lookups. Tags are only consulted when the
   * regional entry is missing, and after a purge that answer must be current:
   * a datacentre holding a 30-second-old "not changed" would put the stale
   * R2 copy straight back for another half hour.
   */
  tagCache: doShardedTagCache({
    baseShardSize: 4,
    regionalCache: false,
  }),

  /**
   * Serves a prerendered page straight from the cache without booting the
   * full Next.js server. Safe here because the site does not use PPR.
   */
  /**
   * Background revalidation.
   *
   * Without a queue, OpenNext falls back to a "dummy" one that throws
   * `Dummy queue is not implemented` the moment a page goes stale — and
   * because that happens inside the cache interceptor, the request 500s
   * instead of serving the stale copy while it refreshes. It took the
   * homepage down 24 hours after a deploy, that page being the only one
   * with a `revalidate` window; everything else was either permanently
   * static or fully dynamic, so nothing else ever went stale.
   *
   * A Durable Object queue, matching the tag cache, so a stale page is
   * served immediately and rebuilt behind the request.
   */
  queue: doQueue,

  enableCacheInterception: true,
})
