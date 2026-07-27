import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createProductTagsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows"

/**
 * Tags every product with the colours it actually contains.
 *
 * Colour is the filter shoppers reach for first on a flower site, and it did
 * not exist as data — nothing in the catalogue recorded that the "50 Red Rose
 * Vase" is red. Medusa product tags carry it: they allow many per product and
 * the Store API can filter on them, unlike metadata.
 *
 * Colours are derived from each product's own title and description rather
 * than hand-listed, so a product edited in the admin keeps working: re-run
 * this and its tags follow the new copy.
 *
 * Idempotent — safe to re-run.
 *
 * Run with:
 *   npx medusa exec ./src/scripts/seed-attributes.ts
 */

/**
 * Colour → words that imply it.
 *
 * Order matters only for readability; a product can carry several. "Mixed" is
 * assigned last, and only when nothing else matched, so it means "genuinely
 * multi-coloured" rather than "we could not tell".
 */
const COLOUR_WORDS: Record<string, RegExp> = {
  red: /\bred\b|crimson|burgundy|scarlet/i,
  pink: /\bpink\b|blush|coral|rose['’]?d|dusty pink|peon/i,
  white: /\bwhite\b|ivory|cream|pale\b/i,
  purple: /purple|lilac|lavender|violet|sweet pea/i,
  yellow: /yellow|sunflower|primrose|craspedia|gold/i,
  green: /green|eucalyptus|foliage|olive|pistache|monstera|anthurium|greenery/i,
  orange: /orange|amber|toffee|marigold/i,
}

export default async function seedAttributes({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  // Tags have to exist before a product can reference them: the product
  // update DTO takes tag_ids, not inline values.
  const wantedValues = [...Object.keys(COLOUR_WORDS), "mixed"]

  const { data: existingTags } = await query.graph({
    entity: "product_tag",
    fields: ["id", "value"],
  })
  const tagIdByValue = new Map(existingTags.map((t) => [t.value, t.id]))

  const missingTags = wantedValues.filter((v) => !tagIdByValue.has(v))
  if (missingTags.length) {
    const { result } = await createProductTagsWorkflow(container).run({
      input: { product_tags: missingTags.map((value) => ({ value })) },
    })
    result.forEach((t) => tagIdByValue.set(t.value, t.id))
    logger.info(`Created ${missingTags.length} colour tag(s).`)
  }

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "description", "tags.*"],
  })

  type TagRow = { id: string; value: string }
  type Row = {
    id: string
    title?: string
    description?: string
    tags?: (TagRow | null)[] | null
  }

  let tagged = 0
  const tally: Record<string, number> = {}

  const match = (text: string) =>
    Object.entries(COLOUR_WORDS)
      .filter(([, re]) => re.test(text))
      .map(([colour]) => colour)

  for (const product of products as unknown as Row[]) {
    /**
     * The title wins whenever it names a colour.
     *
     * Descriptions use colour words comparatively — "50 Pink Rose Vase" reads
     * "softer than red, warmer than white", which tagged it red AND white AND
     * pink and made the red filter wrong. A colour in the title is a
     * statement about the product; one in the description often is not.
     */
    const fromTitle = match(product.title ?? "")
    const colours = fromTitle.length
      ? fromTitle
      : match(product.description ?? "")

    // Only when nothing matched — "mixed" should mean multi-coloured, not
    // "undetermined".
    if (!colours.length) {
      colours.push("mixed")
    }

    colours.forEach((c) => {
      tally[c] = (tally[c] ?? 0) + 1
    })

    const existing = (product.tags ?? [])
      .filter(Boolean)
      .map((t) => t!.value)

    const nonColour = existing.filter(
      (v) => !(v in COLOUR_WORDS) && v !== "mixed"
    )
    const wanted = [...new Set([...nonColour, ...colours])].sort()

    // Skip products whose tags already match, so re-runs are cheap.
    if (JSON.stringify([...existing].sort()) === JSON.stringify(wanted)) {
      continue
    }

    const tagIds = wanted
      .map((v) => tagIdByValue.get(v))
      .filter(Boolean) as string[]

    await updateProductsWorkflow(container).run({
      input: {
        selector: { id: product.id },
        update: { tag_ids: tagIds },
      },
    })
    tagged++
  }

  const summary = Object.entries(tally)
    .sort((a, b) => b[1] - a[1])
    .map(([c, n]) => `${c}=${n}`)
    .join(", ")

  logger.info(`Tagged ${tagged} products with colours (${summary}).`)
}
