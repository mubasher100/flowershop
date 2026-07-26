import { Metadata } from "next"

import CategoryTiles from "@modules/home/components/category-tiles"
import DeliveryStrip from "@modules/home/components/delivery-strip"
import OccasionTiles from "@modules/home/components/occasion-tiles"
import FeaturedProducts from "@modules/home/components/featured-products"
import Hero from "@modules/home/components/hero"
import { listCollections } from "@lib/data/collections"
import { getRegion } from "@lib/data/regions"

export const metadata: Metadata = {
  title: "Flowershop — Same-day flower delivery in Doha",
  description:
    "Hand-tied bouquets, vase arrangements and signature roses, arranged in Doha and delivered the same day. Order by 6pm.",
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params

  const { countryCode } = params

  const region = await getRegion(countryCode)

  const { collections } = await listCollections({
    fields: "id, handle, title",
  })

  if (!collections || !region) {
    return null
  }

  return (
    <>
      <Hero />

      {/* Delivery reassurance sits directly under the hero: in flower gifting,
          "will it arrive in time" blocks the purchase more often than
          "is it pretty". */}
      <DeliveryStrip />

      <CategoryTiles />

      {/* Occasion-led browsing is how flower gifting usually starts —
          someone has a birthday, not a craving for hydrangea. */}
      <OccasionTiles />

      <ul className="flex flex-col">
        <FeaturedProducts collections={collections} region={region} />
      </ul>
    </>
  )
}
