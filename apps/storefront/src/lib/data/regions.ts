"use server"

import { countryOf } from "@lib/util/locale"
import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { getPublicCacheOptions } from "./cookies"

export const listRegions = async () => {
  const next = {
    ...(getPublicCacheOptions("regions")),
  }

  return await sdk.client
    .fetch<{ regions: HttpTypes.StoreRegion[] }>(`/store/regions`, {
      method: "GET",
      next,
      cache: "force-cache",
    })
    .then(({ regions }) => regions)
}

export const retrieveRegion = async (id: string) => {
  const next = {
    ...(getPublicCacheOptions(["regions", id].join("-"))),
  }

  return await sdk.client
    .fetch<{ region: HttpTypes.StoreRegion }>(`/store/regions/${id}`, {
      method: "GET",
      next,
      cache: "force-cache",
    })
    .then(({ region }) => region)
}

const regionMap = new Map<string, HttpTypes.StoreRegion>()

/**
 * Accepts either a bare country code ("qa") or a locale segment ("ar-qa").
 *
 * Parsing here rather than at each call site means the eleven places that
 * pass a URL segment through keep working unchanged now that the segment
 * carries a language prefix.
 */
export const getRegion = async (segment: string) => {
  const countryCode = countryOf(segment)

  if (regionMap.has(countryCode)) {
    return regionMap.get(countryCode)
  }

  const regions = await listRegions()

  if (!regions) {
    return null
  }

  regions.forEach((region) => {
    region.countries?.forEach((c) => {
      regionMap.set(c?.iso_2 ?? "", region)
    })
  })

  return countryCode ? regionMap.get(countryCode) : regionMap.get("us")
}
