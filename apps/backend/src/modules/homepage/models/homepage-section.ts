import { model } from "@medusajs/framework/utils"

/**
 * A block on the storefront homepage.
 *
 * The homepage used to be a hardcoded list: which collections got a rail, in
 * what order, under what heading, all living in the storefront source. Adding
 * a seasonal section or renaming "Best Sellers" meant a code change and a
 * deploy, which is not something a florist should have to ask for.
 *
 * A section says what to render and where — the products themselves still come
 * from the collection or category it points at, so there is one catalogue, not
 * a copy of it here.
 */
const HomepageSection = model.define("homepage_section", {
  id: model.id().primaryKey(),

  /**
   * What the block renders.
   *
   * - product_rail: a horizontal row of products from `resource_handle`
   * - category_tiles: the occasion/category tile grid
   * - banner: a promotional image with a heading and a link
   *
   * Stored as text rather than a database enum so adding a type later is a
   * storefront change, not a migration.
   */
  type: model.text(),

  /** Heading shown above the block. Empty renders the block without one. */
  title: model.text(),

  /**
   * Arabic heading. Nullable because the shopkeeper may add a section before
   * anyone has translated it; the storefront falls back to `title` rather
   * than showing a blank heading on /ar-qa.
   */
  title_ar: model.text().nullable(),

  /**
   * What the block draws from — a collection handle for a rail, a category
   * handle for tiles. Null for a banner, which carries its own content.
   */
  resource_handle: model.text().nullable(),

  /** Banner fields. Unused by the other types. */
  subtitle: model.text().nullable(),
  image_url: model.text().nullable(),
  cta_label: model.text().nullable(),
  cta_href: model.text().nullable(),

  /** Ascending. Gaps are fine — only the relative order is meaningful. */
  rank: model.number().default(0),

  /**
   * Lets a seasonal block be switched off and kept, rather than deleted and
   * rebuilt next year.
   */
  enabled: model.boolean().default(true),
})

export default HomepageSection
