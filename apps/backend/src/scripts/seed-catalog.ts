import { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createCollectionsWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  deleteProductCategoriesWorkflow,
  deleteProductsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows"

/**
 * Seeds the flower catalogue.
 *
 * Shaped after mayfairqatar.com — the same lineup, the same place-name naming
 * convention, the same QAR 230–1,220 price bands — but every description is
 * written for this shop and imagery is on-brand placeholder art. Their
 * photography and copy are theirs; the product *lineup* is ordinary
 * competitive positioning.
 *
 * Flowers only. No chocolates, cakes, or other gift categories yet.
 *
 * Idempotent — safe to re-run. Existing products are left untouched.
 *
 * Run with:
 *   npx medusa exec ./src/scripts/seed-catalog.ts
 */

/** Calya's size ladder. Multipliers apply to the product's base price. */
const SIZES = [
  { name: "Petite", factor: 0.75, stems: "medium" },
  { name: "Classic", factor: 1, stems: "generous" },
  { name: "Grandeur", factor: 1.45, stems: "abundant" },
  { name: "Majestic", factor: 2.1, stems: "showpiece" },
] as const

type Seed = {
  name: string
  /** Classic-size price in QAR. Stored as-is — Medusa never uses cents. */
  price: number
  category: string
  collections: string[]
  blurb: string
  sizes?: number
}

const CATEGORIES = [
  { name: "Hand-Tied Bouquets", handle: "bouquets" },
  { name: "Flowers in Vases", handle: "vases" },
  { name: "Signature Roses", handle: "roses" },
  { name: "Luxury Arrangements", handle: "luxury" },
  { name: "Everyday Blooms", handle: "everyday" },
]

/**
 * Occasion categories.
 *
 * Kept separate from the type categories above because they answer a
 * different question — "what is it for" rather than "what is it" — and a
 * product belongs to both. Categories allow many per product, unlike
 * collections, which is why occasions are modelled here and not as
 * collections.
 *
 * Occasion-led browsing is how most flower gifting actually starts, and its
 * absence was the biggest structural gap against the reference site.
 */
const OCCASIONS = [
  {
    name: "Birthday",
    handle: "birthday",
    match: (s: Seed) => s.category === "bouquets" || s.price <= 500,
  },
  {
    name: "Anniversary",
    handle: "anniversary",
    match: (s: Seed) => /rose|love|cherish|coraline/i.test(s.name),
  },
  {
    name: "Congratulations",
    handle: "congratulations",
    match: (s: Seed) => s.category === "vases" || s.category === "luxury",
  },
  {
    name: "Get Well Soon",
    handle: "get-well-soon",
    match: (s: Seed) => s.category === "everyday" || s.price <= 400,
  },
  {
    name: "New Baby",
    handle: "new-baby",
    match: (s: Seed) => /pink|white|baby|elara|muse/i.test(s.name),
  },
  {
    name: "Thank You",
    handle: "thank-you",
    match: (s: Seed) => s.price <= 550,
  },
]

const COLLECTIONS = [
  { title: "Best Sellers", handle: "best-sellers" },
  { title: "New This Week", handle: "new-this-week" },
  { title: "Roses, Always", handle: "roses-always" },
  { title: "The Luxury Edit", handle: "luxury-edit" },
  { title: "Under 400 QAR", handle: "under-400" },
]

/*
 * The prices-in-major-units rule flags any four-digit price as a suspected
 * cents value. Here they are genuine: a 200-rose arrangement really is
 * QAR 1,240, not 12.40. Medusa stores prices as-is, so these are correct.
 */
/* eslint-disable @medusajs/prices-in-major-units */
const PRODUCTS: Seed[] = [
  // --- Signature roses -------------------------------------------------
  { name: "50 Red Rose Vase", price: 260, category: "roses", collections: ["best-sellers", "roses-always", "under-400"], blurb: "Fifty long-stem red roses, hand-spiralled into a clear glass vase. The one people order when the message matters more than the wording." },
  { name: "50 White Rose Vase", price: 280, category: "roses", collections: ["roses-always", "under-400"], blurb: "Fifty ivory roses arranged tight and low, so the bloom heads form an unbroken dome. Quietly formal." },
  { name: "50 Pink Rose Vase", price: 310, category: "roses", collections: ["roses-always", "under-400"], blurb: "Blush roses in graduated tones, palest at the centre and deepening outward. Softer than red, warmer than white." },
  { name: "50 Red Rose Wrap", price: 260, category: "bouquets", collections: ["best-sellers", "roses-always", "under-400"], blurb: "The same fifty red roses, hand-tied and wrapped in matte paper rather than vased. For handing over in person." },
  { name: "100 Red Rose Black Vase", price: 570, category: "luxury", collections: ["roses-always", "luxury-edit"], blurb: "One hundred red roses in a matte black ceramic vase. Substantial enough to change the room it stands in." },
  { name: "200 White Roses", price: 1240, category: "luxury", collections: ["luxury-edit"], blurb: "Two hundred white roses built into a single dense sphere. Made to order, and it takes our team most of a morning." },

  // --- Hand-tied bouquets ----------------------------------------------
  { name: "Piccadilly Charm", price: 450, category: "bouquets", collections: ["best-sellers", "new-this-week"], blurb: "Garden roses, lisianthus and trailing eucalyptus, tied loose so it keeps its just-picked shape." },
  { name: "Westfield Charm", price: 450, category: "bouquets", collections: ["new-this-week"], blurb: "A cooler counterpart to the Piccadilly — white ranunculus and silver-grey foliage, tied the same way." },
  { name: "Bloomsbury", price: 700, category: "bouquets", collections: ["best-sellers"], blurb: "Peonies when they are in season, garden roses when they are not, with sweet pea threaded through." },
  { name: "Chadstone Lisle", price: 300, category: "bouquets", collections: ["under-400"], blurb: "Spray roses and waxflower in a compact hand-tie. Small enough for a desk, generous enough to notice." },
  { name: "Devonshire Treat", price: 450, category: "bouquets", collections: [], blurb: "Ruffled tulips and narcissi, bound with raffia. Seasonal, so the palette shifts through the year." },
  { name: "Calshot Treat", price: 500, category: "bouquets", collections: [], blurb: "Deep burgundy dahlias against pale antique carnation. A darker bouquet than most people expect to like." },
  { name: "Lucerne Treat", price: 450, category: "bouquets", collections: ["under-400"], blurb: "Alstroemeria, statice and soft grasses — an unfussy bouquet built to last well past the first week." },
  { name: "Goulburn Treat", price: 500, category: "bouquets", collections: [], blurb: "Sunflowers and craspedia with olive branch. The one to send when the occasion calls for cheer, not romance." },
  { name: "La Vie en Rose", price: 460, category: "bouquets", collections: ["best-sellers"], blurb: "Antique-toned roses in dusty pink and toffee, with purple lisianthus for depth. Warm and cool at once." },
  { name: "Coraline", price: 730, category: "bouquets", collections: ["luxury-edit"], blurb: "Coral charm peonies, ranunculus and jasmine vine. Fragrant enough that you smell it before you see it." },
  { name: "Endless Love", price: 1150, category: "luxury", collections: ["luxury-edit"], blurb: "Our largest hand-tie: roses, hydrangea and orchid in a single armful. Requires two hands to carry." },
  { name: "Cherish", price: 520, category: "bouquets", collections: [], blurb: "White hydrangea framed by blush roses, with a collar of eucalyptus. Structured but not stiff." },
  { name: "Daphne", price: 510, category: "bouquets", collections: [], blurb: "Lilac stock and sweet pea, chosen for scent first and colour second." },
  { name: "Aveline", price: 510, category: "bouquets", collections: [], blurb: "Cream roses and pistache foliage, tied high so the stems show. Understated on purpose." },
  { name: "Ashford", price: 510, category: "bouquets", collections: [], blurb: "Butterfly ranunculus and anemone — delicate flowers that reward looking closely." },
  { name: "Muse", price: 410, category: "bouquets", collections: ["under-400"], blurb: "A single-variety bouquet of whatever is best at market that morning. You are trusting the florist, and that is the point." },
  { name: "James", price: 370, category: "bouquets", collections: ["under-400"], blurb: "Structural and green-led: monstera leaf, anthurium and berzelia. Reads as modern rather than romantic." },

  // --- Flowers in vases -------------------------------------------------
  { name: "Astoria Vase", price: 320, category: "vases", collections: ["under-400"], blurb: "Mixed seasonal stems in a fluted glass vase, arranged to be viewed from every side." },
  { name: "Maison Black Vase", price: 600, category: "vases", collections: ["luxury-edit"], blurb: "White phalaenopsis orchid and monstera in matte black ceramic. Lasts weeks rather than days." },
  { name: "Adliswil Black Vase", price: 320, category: "vases", collections: ["under-400"], blurb: "A compact black vase of deep red roses and dark foliage. Small footprint, strong presence." },
  { name: "Long Acre Black Vase", price: 455, category: "vases", collections: [], blurb: "Tall branching stems — delphinium and stock — in black stoneware. Built for a hallway console." },
  { name: "9 Pink Hydrangea Black Vase", price: 330, category: "vases", collections: ["under-400"], blurb: "Nine hydrangea heads packed tight enough to look like a single cloud of colour." },
  { name: "9 White Hydrangea Black Vase", price: 330, category: "vases", collections: ["under-400"], blurb: "The white counterpart — nine hydrangea heads, no filler, nothing else needed." },
  { name: "48 Piccadilly Black Vase", price: 530, category: "vases", collections: [], blurb: "Forty-eight roses in graduated pinks, arranged in a low black bowl." },
  { name: "Springvale Vase", price: 330, category: "vases", collections: ["under-400"], blurb: "Lisianthus and spray rose in a clear cylinder. Our most-reordered everyday vase." },
  { name: "Wellington Vase", price: 240, category: "everyday", collections: ["under-400"], blurb: "A modest weekly vase — seasonal stems, no ceremony. Sized for a kitchen counter." },
  { name: "Chadstone Vase", price: 340, category: "vases", collections: ["under-400"], blurb: "Soft pinks and creams with trailing amaranthus spilling over the rim." },

  // --- Luxury / crystal --------------------------------------------------
  { name: "Montreux Crystal Sphere", price: 920, category: "luxury", collections: ["luxury-edit"], blurb: "Roses arranged into a perfect dome inside cut crystal. The geometry is the whole idea." },
  { name: "Victoria Crystal Sphere", price: 1220, category: "luxury", collections: ["luxury-edit"], blurb: "Our largest crystal piece. Two hundred blooms, one continuous curve, no visible mechanics." },
  { name: "Hearts Crystal Sphere", price: 790, category: "luxury", collections: ["luxury-edit"], blurb: "A red rose dome with a recessed heart worked into the surface. Subtle until you are close." },
  { name: "Chadstone Crystal Sphere", price: 850, category: "luxury", collections: ["luxury-edit"], blurb: "Blush and ivory roses graded from centre to edge, so the colour appears to glow outward." },
  { name: "Bridge Crystal Sphere", price: 1150, category: "luxury", collections: ["luxury-edit"], blurb: "Two colourways meeting along a clean diagonal seam. Difficult to build, easy to look at." },
  { name: "Royal Peal Crystal Sphere", price: 850, category: "luxury", collections: ["luxury-edit"], blurb: "Ivory roses with pearl detailing pressed between the heads. Reserved for weddings, mostly." },
  { name: "Primrose Crystal", price: 820, category: "luxury", collections: ["luxury-edit"], blurb: "Pale yellow and cream roses in faceted crystal — the lightest piece in the luxury range." },
  { name: "Mornington Crystal", price: 600, category: "luxury", collections: [], blurb: "A smaller crystal arrangement in mixed pinks. The entry point to the range." },

  // --- Parkhome / gifting ------------------------------------------------
  { name: "Hearts Parkhome", price: 720, category: "luxury", collections: [], blurb: "A heart-shaped box lined and filled edge to edge with red roses. No gaps, no foam showing." },
  { name: "White Parkhome", price: 720, category: "luxury", collections: [], blurb: "The same construction in ivory, which shows the workmanship more plainly." },
  { name: "Pink Parkhome", price: 720, category: "luxury", collections: [], blurb: "Blush roses in a hatbox, packed dense. Travels well, which matters for same-day delivery." },

  // --- Everyday ----------------------------------------------------------
  { name: "Gladstone", price: 360, category: "everyday", collections: ["under-400"], blurb: "A weekday bouquet at a weekday price — seasonal, simple, refreshed every Monday." },
  { name: "Leukerbad", price: 320, category: "everyday", collections: ["under-400", "new-this-week"], blurb: "Greenery-forward with just enough bloom to read as flowers. For people who find bouquets too much." },
  { name: "Vere", price: 345, category: "everyday", collections: ["under-400"], blurb: "Carnation and waxflower in warm tones. Long-lasting and deliberately unpretentious." },
  { name: "Elara", price: 380, category: "everyday", collections: ["under-400", "new-this-week"], blurb: "Soft pastels with a loose, airy shape. Sits well in a bedroom or a small hallway." },
  { name: "Woburn", price: 380, category: "everyday", collections: ["under-400"], blurb: "Chrysanthemum and solidago — the workhorse stems, arranged with more care than they usually get." },
  { name: "Zofingen", price: 490, category: "everyday", collections: [], blurb: "A fuller everyday bouquet, roughly twice the stem count of the Gladstone." },
]
/* eslint-enable @medusajs/prices-in-major-units */

/** Deterministic on-brand placeholder art. Real photography replaces these. */
const PLACEHOLDERS = [
  "/placeholders/bloom-01.svg",
  "/placeholders/bloom-02.svg",
  "/placeholders/bloom-03.svg",
  "/placeholders/bloom-04.svg",
]

const handleize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

export default async function seedCatalog({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  // --- Prerequisites from seed-qatar ------------------------------------
  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id"],
  })
  const { data: stockLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  })
  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  })

  if (!salesChannels.length || !stockLocations.length) {
    // eslint-disable-next-line @medusajs/use-medusa-error-not-generic-error
    throw new Error(
      "Run seed-qatar.ts first — it creates the sales channel and Doha warehouse this depends on."
    )
  }
  const salesChannelId = salesChannels[0].id
  const stockLocationId = stockLocations[0].id
  const shippingProfileId = shippingProfiles[0]?.id

  // --- Categories --------------------------------------------------------
  const { data: existingCats } = await query.graph({
    entity: "product_category",
    fields: ["id", "handle"],
  })
  const catByHandle = new Map(existingCats.map((c) => [c.handle, c.id]))

  const allCategories = [
    ...CATEGORIES,
    ...OCCASIONS.map((o) => ({ name: o.name, handle: o.handle })),
  ]
  const missingCats = allCategories.filter((c) => !catByHandle.has(c.handle))
  if (missingCats.length) {
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: missingCats.map((c) => ({
          name: c.name,
          handle: c.handle,
          is_active: true,
        })),
      },
    })
    result.forEach((c) => catByHandle.set(c.handle, c.id))
    logger.info(`Created ${missingCats.length} categories.`)
  }

  // --- Collections (drive the homepage carousels) ------------------------
  const { data: existingCols } = await query.graph({
    entity: "product_collection",
    fields: ["id", "handle"],
  })
  const colByHandle = new Map(existingCols.map((c) => [c.handle, c.id]))

  const missingCols = COLLECTIONS.filter((c) => !colByHandle.has(c.handle))
  if (missingCols.length) {
    const { result } = await createCollectionsWorkflow(container).run({
      input: { collections: missingCols.map((c) => ({ ...c })) },
    })
    result.forEach((c) => colByHandle.set(c.handle, c.id))
    logger.info(`Created ${missingCols.length} collections.`)
  }

  // --- Products ----------------------------------------------------------
  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
  })
  const existingHandles = new Set(existingProducts.map((p) => p.handle))

  const toCreate = PRODUCTS.filter(
    (p) => !existingHandles.has(handleize(p.name))
  )

  // Note: creation is skipped when everything already exists, but the cleanup
  // and rebalance passes at the end always run — they are what fix a database
  // seeded by an earlier version of this script.
  if (toCreate.length) {
    await createProducts(container, logger, toCreate, {
      catByHandle,
      colByHandle,
      salesChannelId,
      stockLocationId,
      shippingProfileId,
    })
  } else {
    logger.info("Catalogue already seeded, skipping product creation.")
  }

  await removeStarterDemoProducts(container, logger)
  await rebalanceCollections(container, logger)
  await assignOccasions(container, logger, catByHandle)

  logger.info("Catalogue seed complete.")
}

/**
 * Tags each product with the occasions it suits, on top of its type category.
 *
 * Every product keeps exactly one type category (Bouquets, Vases, …) and
 * gains one or more occasion categories, so /categories/birthday and
 * /categories/bouquets both return sensible results.
 */
async function assignOccasions(
  container: MedusaContainer,
  logger: { info: (m: string) => void },
  catByHandle: Map<string | undefined, string>
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "categories.id", "categories.handle"],
  })

  const seedByHandle = new Map(PRODUCTS.map((p) => [handleize(p.name), p]))
  const occasionHandles = new Set(OCCASIONS.map((o) => o.handle))

  let tagged = 0

  for (const product of products) {
    const seed = seedByHandle.get(product.handle ?? "")
    if (!seed) continue

    const current = ((product.categories ?? []) as { handle?: string }[])
      .map((c) => c?.handle)
      .filter(Boolean) as string[]

    // Cap at three so a product does not show up under every occasion —
    // "suits any occasion" is the same as suiting none.
    const wanted = OCCASIONS.filter((o) => o.match(seed))
      .slice(0, 3)
      .map((o) => o.handle)

    const alreadyTagged = current.filter((h) => occasionHandles.has(h))
    if (wanted.every((w) => alreadyTagged.includes(w)) && alreadyTagged.length) {
      continue
    }

    const typeCategories = current.filter((h) => !occasionHandles.has(h))
    const finalHandles = [...new Set([...typeCategories, ...wanted])]
    const ids = finalHandles
      .map((h) => catByHandle.get(h))
      .filter(Boolean) as string[]

    if (!ids.length) continue

    await updateProductsWorkflow(container).run({
      input: {
        selector: { id: product.id },
        update: { category_ids: ids },
      },
    })
    tagged++
  }

  if (tagged) {
    logger.info(`Tagged ${tagged} products with occasion categories.`)
  }
}

type CreateDeps = {
  catByHandle: Map<string | undefined, string>
  colByHandle: Map<string | undefined, string>
  salesChannelId: string
  stockLocationId: string
  shippingProfileId?: string
}

async function createProducts(
  container: MedusaContainer,
  logger: { info: (m: string) => void },
  toCreate: Seed[],
  deps: CreateDeps
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { catByHandle, colByHandle, salesChannelId, stockLocationId, shippingProfileId } =
    deps

  const productsInput = toCreate.map((seed, i) => {
    const sizes = SIZES.slice(0, seed.sizes ?? 3)
    const image = PLACEHOLDERS[i % PLACEHOLDERS.length]

    return {
      title: seed.name,
      handle: handleize(seed.name),
      description: seed.blurb,
      status: ProductStatus.PUBLISHED,
      category_ids: catByHandle.has(seed.category)
        ? [catByHandle.get(seed.category)!]
        : [],
      // A product belongs to at most one collection in Medusa; the first
      // listed wins and the rest are expressed through categories.
      collection_id: seed.collections.length
        ? colByHandle.get(seed.collections[0])
        : undefined,
      shipping_profile_id: shippingProfileId,
      thumbnail: image,
      images: [{ url: image }],
      options: [{ title: "Size", values: sizes.map((s) => s.name) }],
      sales_channels: [{ id: salesChannelId }],
      variants: sizes.map((s) => ({
        title: s.name,
        sku: `${handleize(seed.name)}-${s.name.toLowerCase()}`,
        manage_inventory: true,
        options: { Size: s.name },
        // Prices are stored as-is. 260 means 260.00 QAR, never 26000.
        prices: [
          { currency_code: "qar", amount: Math.round(seed.price * s.factor) },
        ],
      })),
    }
  })

  const { result: created } = await createProductsWorkflow(container).run({
    input: { products: productsInput },
  })
  logger.info(`Created ${created.length} products.`)

  // --- Inventory ---------------------------------------------------------
  // Without a level at Doha, every variant reads as out of stock and cannot
  // be added to a cart.
  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id", "location_levels.id"],
  })

  const needLevels = inventoryItems.filter(
    (i) => !(i as { location_levels?: unknown[] }).location_levels?.length
  )

  if (needLevels.length) {
    await createInventoryLevelsWorkflow(container).run({
      input: {
        inventory_levels: needLevels.map((i) => ({
          inventory_item_id: i.id,
          location_id: stockLocationId,
          stocked_quantity: 100,
        })),
      },
    })
    logger.info(`Stocked ${needLevels.length} inventory items at Doha.`)
  }
}

/**
 * Spreads products across the homepage collections.
 *
 * A Medusa product belongs to at most ONE collection, so taking the first
 * entry from each seed's `collections` list piled everything into Best
 * Sellers and left New This Week with a single product — a rail with one
 * card reads as broken.
 *
 * Assignment runs in priority order with a cap per collection, so each rail
 * gets a usable number of cards and no product is claimed twice.
 */
async function rebalanceCollections(
  container: MedusaContainer,
  logger: { info: (m: string) => void }
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: collections } = await query.graph({
    entity: "product_collection",
    fields: ["id", "handle"],
  })
  const colId = new Map(collections.map((c) => [c.handle, c.id]))

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle", "collection_id", "variants.id"],
  })

  const seedByHandle = new Map(PRODUCTS.map((p) => [handleize(p.name), p]))

  // Rules are evaluated top to bottom; first match wins, up to the cap.
  // Order matters: the hand-picked collections must claim their products
  // before the broad rules (price bands, name matches) absorb them. Running
  // luxury-edit first left best-sellers with a single card.
  const RULES: { handle: string; cap: number; match: (s: Seed) => boolean }[] = [
    {
      handle: "best-sellers",
      cap: 8,
      match: (s) => s.collections.includes("best-sellers"),
    },
    {
      handle: "roses-always",
      cap: 8,
      match: (s) => /rose/i.test(s.name),
    },
    {
      handle: "luxury-edit",
      cap: 10,
      match: (s) => s.price >= 700,
    },
    {
      handle: "new-this-week",
      cap: 8,
      match: (s) => s.category === "bouquets" || s.category === "everyday",
    },
    {
      handle: "under-400",
      cap: 10,
      match: (s) => s.price <= 400,
    },
  ]

  const counts = new Map(RULES.map((r) => [r.handle, 0]))
  const assignment = new Map<string, string | null>()

  for (const product of products) {
    const seed = seedByHandle.get(product.handle ?? "")
    if (!seed) continue

    let target: string | null = null
    for (const rule of RULES) {
      if (counts.get(rule.handle)! >= rule.cap) continue
      if (!rule.match(seed)) continue
      target = colId.get(rule.handle) ?? null
      counts.set(rule.handle, counts.get(rule.handle)! + 1)
      break
    }

    if (product.collection_id !== target) {
      assignment.set(product.id, target)
    }
  }

  if (!assignment.size) {
    return
  }

  for (const [productId, collection_id] of assignment) {
    await updateProductsWorkflow(container).run({
      input: { selector: { id: productId }, update: { collection_id } },
    })
  }

  const summary = [...counts.entries()]
    .map(([h, n]) => `${h}=${n}`)
    .join(", ")
  logger.info(`Rebalanced collections (${summary}).`)
}

/**
 * The Medusa starter ships four clothing products (t-shirt, sweatshirt,
 * sweatpants, shorts). They are hosted on Medusa's own S3 bucket and have
 * nothing to do with a flower shop — remove them so the storefront never
 * shows apparel.
 */
async function removeStarterDemoProducts(
  container: MedusaContainer,
  logger: { info: (m: string) => void }
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle"],
  })

  const demo = products.filter(
    (p) =>
      p.handle?.startsWith("t-shirt") ||
      p.handle?.startsWith("sweatshirt") ||
      p.handle?.startsWith("sweatpants") ||
      p.handle?.startsWith("shorts") ||
      p.title?.startsWith("Medusa ")
  )

  if (demo.length) {
    await deleteProductsWorkflow(container).run({
      input: { ids: demo.map((p) => p.id) },
    })
    logger.info(`Removed ${demo.length} starter demo product(s).`)
  }

  // The starter's apparel categories outlive its products, and the footer
  // renders categories live — so "Shirts / Sweatshirts / Pants" kept showing
  // on a flower shop until these were removed too.
  // Must include OCCASIONS. Omitting them meant this pass deleted the six
  // occasion categories immediately after they were created, and the tagging
  // pass then wrote against dead IDs — the seed logged success while the
  // Store API returned five categories.
  const keep = new Set([
    ...CATEGORIES.map((c) => c.handle),
    ...OCCASIONS.map((o) => o.handle),
  ])
  const { data: categories } = await query.graph({
    entity: "product_category",
    fields: ["id", "handle"],
  })
  const staleCategories = categories.filter((c) => !keep.has(c.handle ?? ""))

  if (staleCategories.length) {
    await deleteProductCategoriesWorkflow(container).run({
      input: staleCategories.map((c) => c.id),
    })
    logger.info(`Removed ${staleCategories.length} non-flower category(ies).`)
  }
}
