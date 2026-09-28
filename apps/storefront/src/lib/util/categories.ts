/**
 * The category handles the nav, side menu and catalogue filter present, in
 * order.
 *
 * These were duplicated verbatim in three components, which is how the nav and
 * the catalogue filter came to be edited separately. Mirrors
 * apps/backend/src/lib/catalogue-taxonomy.ts — the backend copy is the one the
 * seed and the spreadsheet importer read.
 *
 * Handles rather than names: the storefront resolves them against whatever
 * Medusa returns, so a category renamed in the admin follows automatically,
 * and one deleted there simply drops out of the nav.
 */
export const TYPE_HANDLES = [
  "hot-deals",
  "bouquets",
  "big-bouquets",
  "vases",
  "50-roses",
  "100-roses",
  "200-roses",
  "mix-flowers",
  "big-flowers",
  "baby-roses",
]

/** What a product is *for*, as opposed to what it is. */
export const OCCASION_HANDLES = [
  "birthday",
  "anniversary",
  "congratulations",
  "get-well-soon",
  "new-baby",
  "thank-you",
]
