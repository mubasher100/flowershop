import type { SubscriberConfig, SubscriberArgs } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * Tells the storefront to drop its cache when the catalogue changes.
 *
 * The storefront caches catalogue pages so Cloudflare can serve them from R2
 * instead of re-rendering per request. That cache has to be invalidated on an
 * admin edit, otherwise a price change or a stock update would not surface
 * until the revalidate window expired.
 *
 * Fire-and-forget by design: a storefront that is down, redeploying, or
 * misconfigured must never block or fail an admin save. Failures are logged
 * and swallowed — the cache still expires on its own as a backstop.
 */

/** Medusa event name → the storefront cache tags it should invalidate. */
const TAGS_BY_EVENT: Record<string, string[]> = {
  "product.created": ["products", "collections", "categories"],
  "product.updated": ["products", "collections", "categories"],
  "product.deleted": ["products", "collections", "categories"],
  "product-variant.created": ["products"],
  "product-variant.updated": ["products"],
  "product-variant.deleted": ["products"],
  "product-collection.created": ["collections", "products"],
  "product-collection.updated": ["collections", "products"],
  "product-collection.deleted": ["collections", "products"],
  "product-category.created": ["categories", "products"],
  "product-category.updated": ["categories", "products"],
  "product-category.deleted": ["categories", "products"],
  "inventory-level.updated": ["products"],
  "price-list.updated": ["products"],
}

export default async function revalidateStorefront({
  event,
  container,
}: SubscriberArgs<unknown>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  const storefrontUrl = process.env.STOREFRONT_URL
  const secret = process.env.REVALIDATE_SECRET

  if (!storefrontUrl || !secret) {
    // Local dev usually has neither; saying so once per event is noisy, so
    // this stays quiet rather than warning on every product save.
    return
  }

  const tags = TAGS_BY_EVENT[event.name] ?? ["products"]

  try {
    const res = await fetch(
      `${storefrontUrl.replace(/\/$/, "")}/api/revalidate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-revalidate-secret": secret,
        },
        body: JSON.stringify({ tags }),
        // The admin save should not hang on a slow storefront.
        signal: AbortSignal.timeout(5000),
      }
    )

    if (!res.ok) {
      logger.warn(
        `Storefront revalidation returned ${res.status} for ${event.name}`
      )
    }
  } catch (e) {
    logger.warn(
      `Storefront revalidation failed for ${event.name}: ${
        e instanceof Error ? e.message : String(e)
      }`
    )
  }
}

export const config: SubscriberConfig = {
  event: Object.keys(TAGS_BY_EVENT),
}
