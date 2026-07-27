import { defineCloudflareConfig } from "@opennextjs/cloudflare"
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache"
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache"

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
 * > Known gap: `tagCache` is left at its default, which is a no-op that
 * > discards every tag. The backend posts to /api/revalidate on product,
 * > price and inventory changes, and none of it invalidates anything today —
 * > pages refresh only when their own `revalidate` window expires. Fixing it
 * > needs a real tag store (Durable Objects or D1) provisioned on Cloudflare.
 */
export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(r2IncrementalCache, {
    mode: "long-lived",
  }),

  /**
   * Serves a prerendered page straight from the cache without booting the
   * full Next.js server. Safe here because the site does not use PPR.
   */
  enableCacheInterception: true,
})
