import type { SubscriberConfig, SubscriberArgs } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { requestWebsiteRefresh } from "../lib/website-refresh"

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

  // Homepage layout. Emitted by the workflows in
  // src/workflows/manage-homepage-sections.ts — a custom module does not emit
  // CRUD events on its own, so they are raised explicitly.
  "homepage-section.changed": ["homepage"],
}

export default async function revalidateStorefront({
  event,
  container,
}: SubscriberArgs<unknown>) {
  requestWebsiteRefresh(
    TAGS_BY_EVENT[event.name] ?? ["products"],
    container.resolve(ContainerRegistrationKeys.LOGGER)
  )
}

export const config: SubscriberConfig = {
  event: Object.keys(TAGS_BY_EVENT),
}
