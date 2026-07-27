"use client"

import { useTranslations } from "@lib/i18n/use-translations"
import FilterRadioGroup from "@modules/common/components/filter-radio-group"

export type SortOptions = "price_asc" | "price_desc" | "created_at"

type SortProductsProps = {
  sortBy: SortOptions
  setQueryParams: (name: string, value: string) => void
  "data-testid"?: string
}

const SortProducts = ({
  "data-testid": dataTestId,
  sortBy,
  setQueryParams,
}: SortProductsProps) => {
  const { t } = useTranslations()

  const handleChange = (value: string) => {
    setQueryParams("sortBy", value as SortOptions)
  }

  const sortOptions = [
    { value: "created_at", label: t("sort.latest") },
    { value: "price_asc", label: t("sort.priceAsc") },
    { value: "price_desc", label: t("sort.priceDesc") },
  ]

  return (
    <FilterRadioGroup
      title={t("sort.by")}
      items={sortOptions}
      value={sortBy}
      handleChange={handleChange}
      data-testid={dataTestId}
    />
  )
}

export default SortProducts
