import { defineCloudflareConfig } from "@opennextjs/cloudflare"
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache"
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache"
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
export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(r2IncrementalCache, {
    mode: "long-lived",
  }),

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
   * `regionalCache` keeps tag lookups in the Cache API local to each
   * datacentre. Without it every request would pay a round trip to the DO to
   * ask whether the catalogue had changed — undoing the latency work. The
   * five-second TTL is the delay between the shopkeeper saving an edit and it
   * being visible, which is well inside what "immediately" means here.
   */
  tagCache: doShardedTagCache({
    baseShardSize: 4,
    regionalCache: true,
    regionalCacheTtlSec: 5,
  }),

  /**
   * Serves a prerendered page straight from the cache without booting the
   * full Next.js server. Safe here because the site does not use PPR.
   */
  enableCacheInterception: true,
})
