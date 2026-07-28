"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useState, useTransition } from "react"

import { DICTIONARY, TranslationKey } from "@lib/i18n/dictionary"
import { useTranslations } from "@lib/i18n/use-translations"
import { clx } from "@modules/common/components/ui"
import SortProducts, { SortOptions } from "../refinement-list/sort-products"

/**
 * Catalogue filters: text, colour, category, price and sort.
 *
 * State lives entirely in the URL, so a filtered view is shareable,
 * bookmarkable, and survives the back button — which a component-state
 * implementation gives up for nothing.
 *
 * On phones the whole panel collapses behind a "Filters" button. A permanent
 * sidebar would push the products themselves below the fold, and browsing is
 * what people came to do.
 */

export type FilterOption = { label: string; value: string }

type Props = {
  sortBy: SortOptions
  colours: FilterOption[]
  categories: FilterOption[]
  /** Highest price in the catalogue, so the range never excludes everything. */
  maxPrice: number
}

/** Swatches, so colour reads as colour rather than as a word. */
const SWATCH: Record<string, string> = {
  red: "#c0392b",
  pink: "var(--blush-300)",
  white: "#f7f4f2",
  purple: "#8e7cc3",
  yellow: "#e8c25a",
  green: "var(--sage-400)",
  orange: "#e08b4a",
  mixed:
    "conic-gradient(var(--blush-300), var(--champagne-300), var(--sage-300), var(--blush-300))",
}

const chipClass = (active: boolean) =>
  clx(
    "inline-flex min-h-[2.5rem] items-center gap-2 rounded-full border px-3.5 text-sm transition-colors",
    active
      ? "border-blush-600 bg-blush-50 font-medium text-blush-800"
      : "border-ink-200 text-ink-700 hover:border-blush-300 hover:bg-blush-50"
  )

export default function FilterPanel({
  sortBy,
  colours,
  categories,
  maxPrice,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const { t } = useTranslations()

  /**
   * Colour names come from product tags, so they arrive as English words with
   * no translation attached. The eight the catalogue actually uses are in the
   * dictionary; anything a future tag adds falls back to the raw label rather
   * than disappearing from the filter.
   */
  const colourLabel = ({ label, value }: FilterOption) => {
    const key = `colour.${value}` as TranslationKey
    return key in DICTIONARY.en ? t(key) : label
  }

  const update = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString())
      mutate(params)
      // Any filter change invalidates the current page number.
      params.delete("page")
      const qs = params.toString()

      // startTransition gives us `pending`, so the grid can dim while the
      // server re-renders. Without it a filter tap looked like nothing had
      // happened until the new results replaced the old ones.
      startTransition(() => {
        // replace, not push: filter tweaks are refinements of one browsing
        // session, and pushing meant Back walked through every colour the
        // visitor had tried instead of leaving the catalogue.
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
      })
    },
    [pathname, router, searchParams]
  )

  const selected = (key: string) => searchParams.getAll(key)

  const toggle = (key: string, value: string) =>
    update((p) => {
      const current = p.getAll(key)
      p.delete(key)
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      next.forEach((v) => p.append(key, v))
    })

  const setSingle = (key: string, value: string) =>
    update((p) => (value ? p.set(key, value) : p.delete(key)))

  const activeCount =
    selected("colour").length +
    selected("category").length +
    (searchParams.get("q") ? 1 : 0) +
    (searchParams.get("minPrice") || searchParams.get("maxPrice") ? 1 : 0)

  const clearAll = () =>
    update((p) => {
      ;["colour", "category", "q", "minPrice", "maxPrice"].forEach((k) =>
        p.delete(k)
      )
    })

  return (
    <div
      className={clx(
        "w-full small:w-[16rem] small:flex-none",
        // Dim while the server re-renders, so a tap visibly does something.
        pending && "opacity-60 transition-opacity"
      )}
    >
      {/* The search field sits ABOVE the mobile toggle, outside the collapsed
          panel. It used to live inside it, so on a phone the catalogue offered
          no visible way to search — you had to know to open "Filters & sort"
          first. It is the most-wanted control here, so it is never hidden. */}
      <div className="mb-3 flex flex-col gap-2">
        <label
          htmlFor="filter-q"
          className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500"
        >
          {t("filter.search")}
        </label>
        <input
          id="filter-q"
          type="search"
          defaultValue={searchParams.get("q") ?? ""}
          placeholder={t("filter.searchPlaceholder")}
          enterKeyHint="search"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              // Dismiss the on-screen keyboard so results are visible without
              // a second tap.
              ;(e.target as HTMLInputElement).blur()
              setSingle("q", (e.target as HTMLInputElement).value.trim())
            }
          }}
          onBlur={(e) => {
            if (e.target.value.trim() !== (searchParams.get("q") ?? "")) {
              setSingle("q", e.target.value.trim())
            }
          }}
          className="min-h-[2.75rem] w-full rounded-xl border border-ink-200 px-3.5 text-base text-ink-900 placeholder:text-ink-500 focus:border-blush-500 focus:outline-none focus:ring-2 focus:ring-blush-200"
        />
      </div>

      {/* Mobile toggle. Hidden from desktop, where the panel is always open. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="filter-panel"
        className="mb-4 inline-flex min-h-[2.75rem] w-full items-center justify-between rounded-xl border border-ink-200 px-4 text-base font-medium text-ink-800 small:hidden"
      >
        <span>{t("filter.title")}</span>
        <span className="text-sm text-ink-600">
          {activeCount > 0
            ? t("filter.active", { count: activeCount })
            : t("filter.none")}
        </span>
      </button>

      <div
        id="filter-panel"
        className={clx(
          "flex-col gap-7 pb-6 small:flex",
          open ? "flex" : "hidden"
        )}
      >

        <SortProducts
          sortBy={sortBy}
          setQueryParams={(name, value) => setSingle(name, value)}
        />

        {colours.length > 0 && (
          <fieldset className="flex flex-col gap-2.5">
            <legend className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">
              {t("filter.colour")}
            </legend>
            <div className="flex flex-wrap gap-2">
              {colours.map((c) => {
                const active = selected("colour").includes(c.value)
                return (
                  <button
                    key={c.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggle("colour", c.value)}
                    className={chipClass(active)}
                  >
                    <span
                      aria-hidden="true"
                      className="h-3.5 w-3.5 flex-none rounded-full ring-1 ring-inset ring-ink-900/15"
                      style={{ background: SWATCH[c.value] ?? "var(--ink-200)" }}
                    />
                    {colourLabel(c)}
                  </button>
                )
              })}
            </div>
          </fieldset>
        )}

        {categories.length > 0 && (
          <fieldset className="flex flex-col gap-2.5">
            <legend className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">
              {t("filter.category")}
            </legend>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => {
                const active = selected("category").includes(c.value)
                return (
                  <button
                    key={c.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggle("category", c.value)}
                    className={chipClass(active)}
                  >
                    {c.label}
                  </button>
                )
              })}
            </div>
          </fieldset>
        )}

        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">
            {t("filter.price")}
          </legend>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={maxPrice}
              inputMode="numeric"
              aria-label={t("filter.min")}
              placeholder={t("filter.min")}
              defaultValue={searchParams.get("minPrice") ?? ""}
              onBlur={(e) => setSingle("minPrice", e.target.value)}
              className="min-h-[2.75rem] w-full rounded-xl border border-ink-200 px-3 text-base tabular-nums focus:border-blush-500 focus:outline-none focus:ring-2 focus:ring-blush-200"
            />
            <span aria-hidden="true" className="text-ink-400">
              –
            </span>
            <input
              type="number"
              min={0}
              max={maxPrice}
              inputMode="numeric"
              aria-label={t("filter.price")}
              placeholder={String(maxPrice)}
              defaultValue={searchParams.get("maxPrice") ?? ""}
              onBlur={(e) => setSingle("maxPrice", e.target.value)}
              className="min-h-[2.75rem] w-full rounded-xl border border-ink-200 px-3 text-base tabular-nums focus:border-blush-500 focus:outline-none focus:ring-2 focus:ring-blush-200"
            />
          </div>
        </fieldset>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex min-h-[2.75rem] w-fit items-center text-sm font-semibold text-blush-700 underline-offset-4 hover:underline"
          >
            {t("filter.clearAll")}
          </button>
        )}
      </div>
    </div>
  )
}
