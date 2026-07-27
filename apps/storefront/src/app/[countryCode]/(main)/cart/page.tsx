import { retrieveCart } from "@lib/data/cart"
import { getTranslations } from "@lib/i18n/dictionary"
import CartTemplate from "@modules/cart/templates"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export async function generateMetadata(props: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  const { countryCode } = await props.params
  const { t } = getTranslations(countryCode)

  return {
    title: t("cart.title"),
    description: t("cart.metaDescription"),
  }
}

export default async function Cart(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params

  const cart = await retrieveCart().catch((error) => {
    console.error(error)
    return notFound()
  })

  // retrieveCustomer() used to run here to decide whether to show a sign-in
  // prompt. Ordering is guest-only, so it always returned null and the prompt
  // always rendered — inviting people to sign in to a shop with no accounts,
  // at the cost of a backend round trip on every cart view.
  return <CartTemplate cart={cart} segment={countryCode} />
}
