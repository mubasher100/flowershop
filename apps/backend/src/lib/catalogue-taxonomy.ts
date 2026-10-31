/**
 * The shop's category tree, and the flower varieties it actually stocks.
 *
 * One source of truth, because this is read in three places that must agree:
 * the catalogue seed, the spreadsheet importer's validation, and the
 * spreadsheet template's dropdown lists. A category the florist can pick in
 * the sheet but that does not exist in Medusa imports to nowhere.
 *
 * Replaced the starter's Bouquets / Vases / Roses / Luxury / Everyday set on
 * 28 Sep 2026, on the shop's own taxonomy.
 */

/**
 * What a product *is*. Distinct from OCCASIONS below, which is what it is
 * *for* — a product belongs to one of each, which is why both are categories
 * rather than collections (a product may only have one collection).
 *
 * `match` places the existing placeholder catalogue. Products imported from
 * the florist's spreadsheet name their categories outright, so the rules only
 * matter until the real catalogue lands.
 *
 * A product may land in several: "50 Red Rose Vase" is both 50 Roses and
 * Flowers in Vases, and a shopper reasonably looks for it under either.
 */
export type TypeCategory = {
  name: string
  handle: string
  description: string
  match: (p: { name: string; price: number; group?: string }) => boolean
}

/** Order here is the order they appear in the nav and the catalogue filter. */
export const TYPE_CATEGORIES: TypeCategory[] = [
  {
    // Shown as "Offers" since 31 Oct 2026; the handle keeps its old name so
    // links to /categories/hot-deals still work.
    name: "Offers",
    handle: "hot-deals",
    description: "Every flower on offer, at its reduced price.",
    // Deliberately rule-free: what is on offer is a decision the shop makes
    // week to week, so it is curated in the admin, not derived from a price.
    match: () => false,
  },
  {
    name: "Hand-Tied Bouquets",
    handle: "bouquets",
    description: "Hand-tied and wrapped, from 3 to 100 roses.",
    match: (p) =>
      (p.group === "bouquets" || p.group === "everyday") &&
      !/vase/i.test(p.name),
  },
  {
    name: "Big Bouquets",
    handle: "big-bouquets",
    description: "50 to 300 roses, built as a single armful.",
    match: (p) =>
      /^(1\d\d|2\d\d|300)\b/.test(p.name) ||
      p.group === "luxury" ||
      p.price >= 700,
  },
  {
    name: "Flowers in Vases",
    handle: "vases",
    description: "Arranged in glass, ceramic or crystal, ready to stand.",
    match: (p) => p.group === "vases" || /vase|crystal|sphere/i.test(p.name),
  },
  {
    name: "50 Roses",
    handle: "50-roses",
    description: "Fifty roses, in any of our colours.",
    match: (p) => /\b(4[5-9]|5[0-9])\b/.test(p.name) && /rose|piccadilly/i.test(p.name),
  },
  {
    name: "100 Roses",
    handle: "100-roses",
    description: "One hundred roses.",
    match: (p) => /\b1[0-4]\d\b/.test(p.name),
  },
  {
    name: "200 Roses",
    handle: "200-roses",
    description: "Two hundred roses and up.",
    match: (p) => /\b2\d\d\b/.test(p.name),
  },
  {
    name: "Mix Flowers",
    handle: "mix-flowers",
    description: "More than one variety, arranged together.",
    match: (p) => p.group === "everyday" || /mix|seasonal/i.test(p.name),
  },
  {
    name: "Big Flowers",
    handle: "big-flowers",
    description: "Hydrangea, gerbera and hot eskimo — large-headed blooms.",
    match: (p) => /hydrangea|gerbera|eskimo/i.test(p.name),
  },
  {
    name: "Baby Roses",
    handle: "baby-roses",
    description: "Spray roses in red, white and pink.",
    match: (p) => /\b(bb|baby|spray)\b/i.test(p.name),
  },
]

/**
 * Every product needs at least one category or it is unreachable by browsing.
 * Anything no rule claims lands here.
 */
export const FALLBACK_CATEGORY = "bouquets"

/** What a product is *for*. Unchanged — the homepage occasion tiles use these. */
export const OCCASION_HANDLES = [
  "birthday",
  "anniversary",
  "congratulations",
  "get-well-soon",
  "new-baby",
  "thank-you",
] as const

/**
 * The varieties the shop actually buys, as the florist names them.
 *
 * This is stock knowledge, not marketing copy, and it exists here so the
 * spreadsheet can offer it as a dropdown — a free-text variety column comes
 * back with "Vendala", "vendela" and "white rose" meaning one flower, and
 * nothing can group them afterwards.
 *
 * Add to this list rather than correcting sheets one at a time.
 */
export const VARIETIES = {
  "Roses": [
    "Red (assorted)",
    "Sweet Unique Pink",
    "Freedom",
    "Vendala (white)",
    "RP Moab",
    "Dark Expression",
    "Jessika",
    "Purple Crown",
    "Candlelight",
    "Cool Water",
    "Heart Red",
    "Deep Purple",
    "Full Monty",
    "Shimmer",
    "Quicksand",
  ],
  "Baby roses": ["BB Red", "BB White", "BB Pink"],
  "Hydrangea": [
    "Hydrangea Pink",
    "Hydrangea White",
    "Hydrangea Light Purple",
    "Hydrangea Green",
  ],
  "Gerbera": [
    "Gerbera Pink",
    "Gerbera White",
    "Gerbera Peach",
    "Gerbera Red",
  ],
  "Other large blooms": ["Hot Eskimo"],
  "Carnation": [
    "Carnation Pink",
    "Carnation Light Pink",
    "Carnation Peach",
    "Carnation Fuchsia",
    "Carnation White",
    "Carnation Red",
  ],
} as const

/** Flat list, for a spreadsheet dropdown. */
export const ALL_VARIETIES: string[] = Object.values(VARIETIES).flat()

/** Colour tags the catalogue filter is built from. See seed-attributes.ts. */
export const COLOURS = [
  "red",
  "pink",
  "white",
  "purple",
  "peach",
  "yellow",
  "green",
  "orange",
  "mixed",
] as const
