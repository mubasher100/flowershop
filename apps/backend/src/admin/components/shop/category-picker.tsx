import { Text } from "@medusajs/ui"

import {
  OCCASION_HANDLES,
  TYPE_CATEGORIES,
} from "../../../lib/catalogue-taxonomy"
import type { ShopCategory } from "./shared"

/**
 * Where a flower shows up on the shop, as tappable chips.
 *
 * Two groups, because they answer different questions: what the flower *is*
 * (the menu along the top of the site) and what it is *for* (the occasion
 * tiles on the homepage). A product belongs in both, and the old form allowed
 * exactly one category — so a vase of fifty roses could be filed under 50
 * Roses or under Flowers in Vases, never both, and never under Birthday.
 *
 * Order and grouping come from the shared taxonomy, so this lists the same
 * categories in the same order as the site's own menu.
 */
export default function CategoryPicker({
  categories,
  value,
  onChange,
}: {
  categories: ShopCategory[]
  value: string[]
  onChange: (ids: string[]) => void
}) {
  const byHandle = new Map(categories.map((c) => [c.handle, c]))
  const known = new Set<string>([
    ...TYPE_CATEGORIES.map((c) => c.handle),
    ...OCCASION_HANDLES,
  ])

  const groups = [
    {
      label: "What it is",
      hint: "The menu along the top of the shop.",
      items: TYPE_CATEGORIES.map((c) => byHandle.get(c.handle)),
    },
    {
      label: "Good for",
      hint: "The occasion tiles on the homepage.",
      items: OCCASION_HANDLES.map((h) => byHandle.get(h)),
    },
    {
      // A category made in the full admin still has to be choosable here.
      label: "Other",
      hint: "",
      items: categories.filter((c) => !known.has(c.handle)),
    },
  ]
    .map((g) => ({ ...g, items: g.items.filter(Boolean) as ShopCategory[] }))
    .filter((g) => g.items.length)

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-2">
          <div>
            <Text size="small" leading="compact" weight="plus">
              {group.label}
            </Text>
            {group.hint && (
              <Text size="xsmall" className="text-ui-fg-muted">
                {group.hint}
              </Text>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {group.items.map((c) => {
              const on = value.includes(c.id)
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(c.id)}
                  // 36px tall on purpose: this is often used on a phone, and
                  // the default chip size is too small to hit reliably.
                  className={
                    "txt-compact-small min-h-9 rounded-full border px-3 transition-colors " +
                    (on
                      ? "border-ui-fg-interactive bg-ui-bg-interactive text-ui-fg-on-color"
                      : "border-ui-border-base bg-ui-bg-base text-ui-fg-base hover:bg-ui-bg-base-hover")
                  }
                >
                  {c.name}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
