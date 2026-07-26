import { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
  Modules,
} from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  deleteRegionsWorkflow,
  deleteTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateProductVariantsWorkflow,
  updateStockLocationsWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"

/**
 * The canonical store configuration for this project: Qatar, QAR, Doha.
 *
 * The starter shipped an `initial-data-seed` migration script that hardcoded a
 * European store (EUR default, 7 EU countries, a Copenhagen warehouse). It has
 * been DELETED — do not reintroduce it. Medusa records executed scripts by
 * filename, and dev runs `initial-data-seed.ts` while a production build runs
 * the compiled `initial-data-seed.js`. Those are different names, so the seed
 * re-ran on every deploy and kept resurrecting the Europe region.
 *
 * This script therefore both bootstraps a fresh database and reshapes one that
 * still carries the old European data.
 *
 * Idempotent — safe to re-run.
 *
 * Run with:
 *   npx medusa exec ./src/scripts/seed-qatar.ts
 */
export default async function seedQatar({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fulfillmentModuleService = container.resolve(
    ModuleRegistrationName.FULFILLMENT
  )

  const COUNTRY = "qa"
  const CURRENCY = "qar"

  /**
   * Narrow row shapes for the fields this script reads.
   *
   * `query.graph` is typed from generated module entities, which don't model
   * cross-module relations (variant prices live in the Pricing module) and
   * mark relations as nullable. Declaring exactly what we select is clearer
   * than casting at each use site.
   */
  type RegionRow = {
    id: string
    countries?: ({ iso_2: string } | null)[] | null
  }
  type PriceRow = { currency_code: string; amount: number }
  type VariantRow = { id: string; prices?: (PriceRow | null)[] | null }

  // ---------------------------------------------------------------------
  // Bootstrap: sales channel + publishable key
  //
  // The deleted starter seed used to create these. On a fresh database
  // nothing else does, and the storefront cannot call the Store API without
  // a publishable key linked to a sales channel.
  // ---------------------------------------------------------------------
  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  })

  let salesChannelId = salesChannels[0]?.id
  if (!salesChannelId) {
    const { result } = await createSalesChannelsWorkflow(container).run({
      input: { salesChannelsData: [{ name: "Default Sales Channel" }] },
    })
    salesChannelId = result[0].id
    logger.info("Created default sales channel.")
  }

  const { data: apiKeys } = await query.graph({
    entity: "api_key",
    fields: ["id", "title", "type"],
  })

  if (!apiKeys.some((k) => k.type === "publishable")) {
    const { result } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          { title: "Storefront", type: "publishable", created_by: "seed" },
        ],
      },
    })
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: { id: result[0].id, add: [salesChannelId] },
    })
    logger.info(`Created publishable API key: ${result[0].token}`)
  }

  // ---------------------------------------------------------------------
  // Store: make QAR the default currency
  // ---------------------------------------------------------------------
  logger.info("Configuring store for Qatar...")

  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["id", "name", "supported_currencies.*"],
  })
  const store = stores[0]

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        supported_currencies: [
          { currency_code: CURRENCY, is_default: true },
          // Kept non-default so the starter's demo product prices stay valid.
          // Drop these once real flower products are loaded.
          { currency_code: "eur", is_default: false },
          { currency_code: "usd", is_default: false },
        ],
      },
    },
  })
  logger.info(`Store default currency set to ${CURRENCY.toUpperCase()}.`)

  // ---------------------------------------------------------------------
  // Region: Qatar
  // ---------------------------------------------------------------------
  const { data: existingRegionsRaw } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "countries.iso_2"],
  })
  const existingRegions = existingRegionsRaw as unknown as RegionRow[]

  const servesQatar = (r: RegionRow) =>
    r.countries?.some((c) => c?.iso_2 === COUNTRY) ?? false

  let qatarRegion: { id: string } | undefined =
    existingRegions.find(servesQatar)

  if (qatarRegion) {
    logger.info("Qatar region already exists, skipping.")
  } else {
    const { result } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: "Qatar",
            currency_code: CURRENCY,
            countries: [COUNTRY],
            // System provider is a manual stand-in. SkipCash replaces this
            // in roadmap phase 8.
            payment_providers: ["pp_system_default"],
          },
        ],
      },
    })
    qatarRegion = result[0]
    logger.info("Created Qatar region.")
  }

  if (!qatarRegion) {
    // Unreachable — either the lookup found one or the workflow created it.
    // Present so the shipping-option prices below can reference it safely.
    // eslint-disable-next-line @medusajs/use-medusa-error-not-generic-error
    throw new Error("Could not resolve the Qatar region.")
  }

  // Tax region. Qatar has no VAT on most goods, so the rate stays 0 —
  // the region still has to exist or checkout fails to calculate totals.
  const { data: existingTaxRegions } = await query.graph({
    entity: "tax_region",
    fields: ["id", "country_code"],
  })
  if (!existingTaxRegions.some((t) => t.country_code === COUNTRY)) {
    await createTaxRegionsWorkflow(container).run({
      input: [{ country_code: COUNTRY, provider_id: "tp_system" }],
    })
    logger.info("Created Qatar tax region.")
  }

  // ---------------------------------------------------------------------
  // Stock location: repoint the starter's Copenhagen warehouse to Doha
  //
  // Updating in place rather than creating a new one keeps the inventory
  // levels the starter already seeded for the demo products.
  // ---------------------------------------------------------------------
  const { data: stockLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  })
  // Narrowed for the same reason as RegionRow above: the workflow returns a
  // DTO, query.graph returns an entity, and they differ in relation fields.
  let stockLocation: { id: string; name: string } | undefined =
    stockLocations[0]

  if (!stockLocation) {
    // Fresh database — nothing to repoint, so create Doha outright.
    const { result } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [
          {
            name: "Doha Warehouse",
            address: { city: "Doha", country_code: "QA", address_1: "" },
          },
        ],
      },
    })
    stockLocation = result[0]

    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
      [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
    })
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: { id: stockLocation.id, add: [salesChannelId] },
    })
    logger.info("Created Doha Warehouse.")
  } else if (stockLocation.name !== "Doha Warehouse") {
    await updateStockLocationsWorkflow(container).run({
      input: {
        selector: { id: stockLocation.id },
        update: {
          name: "Doha Warehouse",
          address: {
            city: "Doha",
            country_code: "QA",
            address_1: "",
          },
        },
      },
    })
    logger.info("Repointed stock location to Doha.")
  }

  // ---------------------------------------------------------------------
  // Fulfillment: a service zone that actually covers Qatar
  //
  // The starter's service zone lists only EU countries, so nothing ships to
  // Qatar until this exists.
  // ---------------------------------------------------------------------
  const existingSets = await fulfillmentModuleService.listFulfillmentSets(
    { name: "Qatar delivery" },
    { relations: ["service_zones"] }
  )

  let qatarFulfillmentSet = existingSets[0]

  if (!qatarFulfillmentSet) {
    qatarFulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: "Qatar delivery",
      type: "shipping",
      service_zones: [
        {
          name: "Qatar",
          geo_zones: [{ country_code: COUNTRY, type: "country" }],
        },
      ],
    })

    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
      [Modules.FULFILLMENT]: { fulfillment_set_id: qatarFulfillmentSet.id },
    })
    logger.info("Created Qatar fulfillment set.")

    const { data: shippingProfiles } = await query.graph({
      entity: "shipping_profile",
      fields: ["id"],
    })

    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: "Standard Delivery",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: qatarFulfillmentSet.service_zones[0].id,
          shipping_profile_id: shippingProfiles[0].id,
          type: {
            label: "Standard",
            description: "Delivered within Doha in 1-2 days.",
            code: "standard",
          },
          // Prices are stored as-is, NOT in cents. 25 means 25.00 QAR.
          prices: [
            { currency_code: CURRENCY, amount: 25 },
            { region_id: qatarRegion.id, amount: 25 },
          ],
          rules: [
            { attribute: "enabled_in_store", value: "true", operator: "eq" },
            { attribute: "is_return", value: "false", operator: "eq" },
          ],
        },
        {
          name: "Same-Day Delivery",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: qatarFulfillmentSet.service_zones[0].id,
          shipping_profile_id: shippingProfiles[0].id,
          type: {
            label: "Same Day",
            description: "Order before 2pm for delivery today.",
            code: "same-day",
          },
          prices: [
            { currency_code: CURRENCY, amount: 50 },
            { region_id: qatarRegion.id, amount: 50 },
          ],
          rules: [
            { attribute: "enabled_in_store", value: "true", operator: "eq" },
            { attribute: "is_return", value: "false", operator: "eq" },
          ],
        },
      ],
    })
    logger.info("Created Qatar shipping options.")
  } else {
    logger.info("Qatar fulfillment set already exists, skipping.")
  }

  // ---------------------------------------------------------------------
  // Product prices: give every variant a QAR price
  //
  // Without this, products exist but cannot be added to a Qatar cart —
  // the region has no price to resolve.
  // ---------------------------------------------------------------------
  const { data: variantsRaw } = await query.graph({
    entity: "product_variant",
    fields: ["id", "title", "prices.*"],
  })
  const variants = variantsRaw as unknown as VariantRow[]

  const variantsMissingQar = variants.filter(
    (v) => !v.prices?.some((p) => p?.currency_code === CURRENCY)
  )

  if (variantsMissingQar.length) {
    for (const variant of variantsMissingQar) {
      const existingPrices = (variant.prices ?? []).flatMap((p) =>
        p ? [{ currency_code: p.currency_code, amount: p.amount }] : []
      )
      const eurPrice = existingPrices.find((p) => p.currency_code === "eur")

      // Rough EUR→QAR conversion for placeholder demo data. Real flower
      // products get real prices in phase 7.
      const qarAmount = eurPrice ? Math.round(eurPrice.amount * 4) : 100

      await updateProductVariantsWorkflow(container).run({
        input: {
          selector: { id: variant.id },
          update: {
            prices: [
              ...existingPrices,
              { currency_code: CURRENCY, amount: qarAmount },
            ],
          },
        },
      })
    }
    logger.info(`Added QAR prices to ${variantsMissingQar.length} variants.`)
  } else {
    logger.info("All variants already have QAR prices, skipping.")
  }

  // ---------------------------------------------------------------------
  // Remove the Europe region
  //
  // Done last, so the steps above can read EUR prices for conversion.
  // Leaving it would make the storefront's country routing offer EU
  // countries this shop does not serve.
  // ---------------------------------------------------------------------
  const europeRegions = existingRegions.filter((r) => !servesQatar(r))

  if (europeRegions.length) {
    await deleteRegionsWorkflow(container).run({
      input: { ids: europeRegions.map((r) => r.id) },
    })
    logger.info(`Removed ${europeRegions.length} non-Qatar region(s).`)
  }

  // ---------------------------------------------------------------------
  // Clean up the starter's European fulfillment and tax data
  //
  // Deleting the Europe region orphans these rather than removing them.
  // They can never be used — no region resolves to them — but they clutter
  // the admin dashboard and invite confusion later.
  // ---------------------------------------------------------------------
  const euFulfillmentSets = await fulfillmentModuleService.listFulfillmentSets(
    {},
    { relations: ["service_zones"] }
  )
  const orphanedSets = euFulfillmentSets.filter(
    (s) => s.name !== "Qatar delivery"
  )

  if (orphanedSets.length) {
    const zoneIds = new Set(
      orphanedSets.flatMap((s) => (s.service_zones ?? []).map((z) => z.id))
    )

    // Shipping options reference service zones, so they go first.
    const { data: allOptions } = await query.graph({
      entity: "shipping_option",
      fields: ["id", "service_zone_id"],
    })
    const staleOptions = allOptions.filter((o) => zoneIds.has(o.service_zone_id))

    if (staleOptions.length) {
      await fulfillmentModuleService.deleteShippingOptions(
        staleOptions.map((o) => o.id)
      )
      logger.info(`Removed ${staleOptions.length} non-Qatar shipping option(s).`)
    }

    await fulfillmentModuleService.deleteFulfillmentSets(
      orphanedSets.map((s) => s.id)
    )
    logger.info(`Removed ${orphanedSets.length} non-Qatar fulfillment set(s).`)
  }

  const { data: taxRegions } = await query.graph({
    entity: "tax_region",
    fields: ["id", "country_code"],
  })
  const staleTaxRegions = taxRegions.filter((t) => t.country_code !== COUNTRY)
  if (staleTaxRegions.length) {
    await deleteTaxRegionsWorkflow(container).run({
      input: { ids: staleTaxRegions.map((t) => t.id) },
    })
    logger.info(`Removed ${staleTaxRegions.length} non-Qatar tax region(s).`)
  }

  logger.info("Qatar store configuration complete.")
}
