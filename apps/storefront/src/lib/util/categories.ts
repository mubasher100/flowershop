import { localeOf } from "@lib/util/locale"

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
  "table-arrangements",
  "50-roses",
  "100-roses",
  "200-roses",
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

/**
 * Arabic names for the categories and collections above, keyed by handle.
 *
 * Category and collection names come from Medusa in English, and the catalogue
 * is otherwise left for a human translator — but these are navigation, not
 * florist copy, and an Arabic visitor otherwise steered through the shop by
 * English labels. A handle missing here (one added in the admin since) falls
 * back to its Medusa name, so nothing ever renders blank.
 */
const ARABIC_NAMES: Record<string, string> = {
  // Types
  "hot-deals": "العروض",
  bouquets: "باقات منسقة يدوياً",
  "big-bouquets": "باقات كبيرة",
  vases: "ورود في مزهريات",
  "table-arrangements": "تنسيقات الطاولة",
  "50-roses": "٥٠ وردة",
  "100-roses": "١٠٠ وردة",
  "200-roses": "٢٠٠ وردة",
  "baby-roses": "ورود صغيرة",

  // Occasions
  birthday: "عيد ميلاد",
  anniversary: "ذكرى سنوية",
  congratulations: "تهانينا",
  "get-well-soon": "تمنيات بالشفاء",
  "new-baby": "مولود جديد",
  "thank-you": "شكراً لك",

  // Collections. Under 400 matches the homepage rail's Arabic heading in
  // apps/backend/src/scripts/seed-homepage.ts.
  "best-sellers": "الأكثر مبيعاً",
  "new-this-week": "جديد هذا الأسبوع",
  "roses-always": "الورود دائماً",
  "luxury-edit": "تشكيلة الفخامة",
  "under-400": "أقل من ٤٠٠ ريال",
}

/**
 * The name to show for a category or collection in the visitor's language.
 *
 * English shows Medusa's own name, so a rename in the admin still follows
 * automatically there; Arabic uses the table above where it knows the handle.
 */
export function localizedCategoryName(
  handle: string | null | undefined,
  name: string | null | undefined,
  segment?: string | null
): string {
  if (localeOf(segment) === "ar" && handle && ARABIC_NAMES[handle]) {
    return ARABIC_NAMES[handle]
  }
  return name ?? ""
}
