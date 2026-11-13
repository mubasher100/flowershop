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
  // Shown as Black Friday since 13 Nov 2026 (it was Offers). "White Friday"
  // is the Gulf's own name for it.
  "hot-deals": "الجمعة البيضاء",
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
  segment?: string | null,
  metadata?: Record<string, unknown> | null
): string {
  if (localeOf(segment) === "ar") {
    // Typed in the shop app beside the English name (metadata.name_ar) wins
    // over the table, so a category added there arrives already translated.
    const own = metadata?.name_ar
    if (typeof own === "string" && own.trim()) return own.trim()
    if (handle && ARABIC_NAMES[handle]) return ARABIC_NAMES[handle]
  }
  return name ?? ""
}

type CategoryLike = {
  handle?: string | null
  rank?: number | null
  parent_category_id?: string | null
  metadata?: Record<string, unknown> | null
}

const isOccasion = (c: CategoryLike) =>
  OCCASION_HANDLES.includes(c.handle ?? "") || c.metadata?.kind === "occasion"

/**
 * The categories to present, in order.
 *
 * Until 13 Nov 2026 only the handles listed above ever appeared, so a
 * category created in the shop app existed in Medusa but never reached the
 * nav, the side menu or the catalogue filter. Now every top-level category
 * the Store API returns (it never returns a hidden one) is shown, ordered by
 * `metadata.position` — which the shop app writes when the florist reorders —
 * then by the lists above, then by Medusa's rank. The shop app sorts with the
 * same rule (apps/shop/src/lib/categories.ts), so its order is the site's.
 */
function present<T extends CategoryLike>(
  all: T[] | null | undefined,
  known: string[],
  want: (c: T) => boolean
): T[] {
  const key = (c: T) => {
    const pos = c.metadata?.position
    if (typeof pos === "number") return pos
    const i = known.indexOf(c.handle ?? "")
    return i >= 0 ? 1000 + i : 2000 + (c.rank ?? 0)
  }
  return (all ?? [])
    .filter((c) => !c.parent_category_id && want(c))
    .sort((a, b) => key(a) - key(b))
}

/** What it is: bouquets, vases, roses by the count. */
export const typeCategories = <T extends CategoryLike>(all: T[] | null | undefined) =>
  present(all, TYPE_HANDLES, (c) => !isOccasion(c))

/** What it is for: birthday, anniversary and the rest. */
export const occasionCategories = <T extends CategoryLike>(all: T[] | null | undefined) =>
  present(all, OCCASION_HANDLES, isOccasion)

/**
 * Arabic for the one-line category descriptions, each paired with the English
 * it translates. The Arabic is used only while Medusa's description still
 * reads exactly that: a description rewritten in the admin shows its new
 * English on /ar-qa rather than an Arabic sentence that no longer matches.
 */
const ARABIC_DESCRIPTIONS: Record<string, [string, string]> = {
  "hot-deals": [
    "Black Friday prices, now. Order today and choose a delivery day after Black Friday.",
    "أسعار الجمعة البيضاء الآن. اطلب اليوم واختر يوم التوصيل بعد الجمعة البيضاء.",
  ],
  "big-bouquets": [
    "50 to 300 roses, built as a single armful.",
    "من ٥٠ إلى ٣٠٠ وردة في باقة واحدة تملأ الذراعين.",
  ],
  "50-roses": ["Fifty roses, in any of our colours.", "خمسون وردة، بأي لون من ألواننا."],
  "100-roses": ["One hundred roses.", "مئة وردة."],
  "200-roses": ["Two hundred roses and up.", "مئتا وردة فأكثر."],
  "baby-roses": ["Spray roses in red, white and pink.", "ورود صغيرة متفرعة بالأحمر والأبيض والوردي."],
  "table-arrangements": [
    "Boxes, pots and vased arrangements, made to sit on a table.",
    "صناديق وأصص وتنسيقات في مزهريات، مصمّمة لتزيّن الطاولة.",
  ],
}

/** A category's description in the visitor's language. */
export function localizedCategoryDescription(
  handle: string | null | undefined,
  description: string | null | undefined,
  segment?: string | null,
  metadata?: Record<string, unknown> | null
): string {
  const pair = handle ? ARABIC_DESCRIPTIONS[handle] : undefined
  if (localeOf(segment) === "ar") {
    const own = metadata?.description_ar
    if (typeof own === "string" && own.trim()) return own.trim()
    if (pair && description?.trim() === pair[0]) return pair[1]
  }
  return description ?? ""
}
