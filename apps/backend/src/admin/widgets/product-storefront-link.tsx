import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { ArrowUpRightOnBox } from "@medusajs/icons"
import { Button, Container, Heading, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"

import { sdk } from "../lib/sdk"

/**
 * "See it on the shop" — a link from a product in the admin to the same
 * product on the storefront.
 *
 * Checking whether an edit came out right meant copying the handle, opening
 * the storefront, and assembling the URL by hand, remembering that the path
 * carries a locale segment. Both languages are offered because they are
 * separately prerendered pages and an Arabic heading is exactly the kind of
 * thing worth eyeballing after a change.
 *
 * Opens in a new tab, so the admin keeps its place.
 */

type ProductLike = { handle?: string | null; status?: string }

const LOCALES = [
  { segment: "en-qa", label: "English" },
  { segment: "ar-qa", label: "العربية" },
]

const ProductStorefrontLink = ({ data }: { data: ProductLike }) => {
  const { data: config } = useQuery({
    queryKey: ["storefront-url"],
    queryFn: () =>
      sdk.client.fetch<{ url: string | null }>("/admin/storefront-url"),
    // The value does not change between page views.
    staleTime: Infinity,
  })

  const base = config?.url
  const handle = data?.handle

  if (!base || !handle) {
    return null
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">See it on the shop</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Opens in a new tab, so you can compare side by side.
        </Text>
      </div>

      <div className="flex flex-col gap-2 px-6 py-4">
        {LOCALES.map((locale) => (
          <Button key={locale.segment} size="small" variant="secondary" asChild>
            <a
              href={`${base}/${locale.segment}/products/${handle}`}
              target="_blank"
              rel="noreferrer"
            >
              <ArrowUpRightOnBox />
              {locale.label}
            </a>
          </Button>
        ))}

        {/* A draft has no page to visit — the storefront only lists published
            products, so the link would 404 and look like a broken deploy. */}
        {data?.status !== "published" && (
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            This product is not published, so the shop will show a 404 until it
            is.
          </Text>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default ProductStorefrontLink
