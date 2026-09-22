import { getTranslations } from "@lib/i18n/dictionary"
import repeat from "@lib/util/repeat"
import { HttpTypes } from "@medusajs/types"
import { Heading, Table } from "@modules/common/components/ui"

import Item from "@modules/cart/components/item"
import SkeletonLineItem from "@modules/skeletons/components/skeleton-line-item"

type ItemsTemplateProps = {
  cart?: HttpTypes.StoreCart
  segment?: string
}

const ItemsTemplate = ({ cart, segment }: ItemsTemplateProps) => {
  const items = cart?.items
  const { t } = getTranslations(segment)

  return (
    <div>
      <div className="pb-3 flex items-center">
        <Heading className="text-[2rem] leading-[2.75rem]">
          {t("cart.title")}
        </Heading>
      </div>
      {/* The table's own columns are wider than a 320px screen. It scrolls
          inside this box so the page itself never does. */}
      <div className="w-full overflow-x-auto">
      <Table>
        <Table.Header className="border-t-0">
          <Table.Row className="text-ui-fg-subtle txt-medium-plus">
            <Table.HeaderCell className="!ps-0">
              {t("cart.item")}
            </Table.HeaderCell>
            <Table.HeaderCell></Table.HeaderCell>
            <Table.HeaderCell>{t("cart.quantity")}</Table.HeaderCell>
            <Table.HeaderCell className="hidden small:table-cell">
              {t("cart.price")}
            </Table.HeaderCell>
            <Table.HeaderCell className="!pe-0 text-end">
              {t("cart.total")}
            </Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {items
            ? items
                .sort((a, b) => {
                  return (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
                })
                .map((item) => {
                  return (
                    <Item
                      key={item.id}
                      item={item}
                      currencyCode={cart?.currency_code}
                    />
                  )
                })
            : repeat(5).map((i) => {
                return <SkeletonLineItem key={i} />
              })}
        </Table.Body>
      </Table>
      </div>
    </div>
  )
}

export default ItemsTemplate
