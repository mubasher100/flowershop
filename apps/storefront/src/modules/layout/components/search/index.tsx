"use client"

import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react"
import { useTranslations } from "@lib/i18n/use-translations"
import { countryOf } from "@lib/util/locale"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useParams, useRouter } from "next/navigation"
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react"

/**
 * Catalogue search.
 *
 * Filters an in-memory index rather than round-tripping to the server on every
 * keystroke, so results appear as fast as the characters do. The index is
 * fetched once on first open and kept for the life of the page — the whole
 * catalogue is a few kilobytes, far less than a single page of search results
 * would have cost.
 *
 * See app/api/search-index/route.ts for what the index contains and when this
 * approach stops being the right one.
 */

type IndexedProduct = {
  id: string
  title: string
  handle: string
  thumbnail: string | null
  price: string | null
  terms: string
}

/**
 * Shared across every mount for the life of the document, so opening search a
 * second time is instant and the fetch never repeats.
 */
const indexCache = new Map<string, IndexedProduct[]>()
const inflight = new Map<string, Promise<IndexedProduct[]>>()

function loadIndex(country: string): Promise<IndexedProduct[]> {
  const cached = indexCache.get(country)
  if (cached) return Promise.resolve(cached)

  // Two components can ask at once (the header button and the bottom bar), so
  // share the in-flight request rather than firing a second one.
  const pending = inflight.get(country)
  if (pending) return pending

  const request = fetch(`/api/search-index?country=${country}`)
    .then((r) => (r.ok ? r.json() : { products: [] }))
    .then((d: { products: IndexedProduct[] }) => {
      const products = d.products ?? []
      indexCache.set(country, products)
      return products
    })
    .catch((): IndexedProduct[] => [])
    .finally(() => {
      inflight.delete(country)
    })

  inflight.set(country, request)
  return request
}

const MAX_RESULTS = 8

/**
 * Lets the mobile bottom bar open this overlay without a shared provider.
 * The two components sit in different parts of the tree and there is exactly
 * one thing to say between them, so an event is cheaper than context.
 */
export const OPEN_SEARCH_EVENT = "flowershop:open-search"

const SearchIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
    <circle
      cx="11"
      cy="11"
      r="6.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    />
    <path
      d="m16 16 4.5 4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
)

export default function Search() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [index, setIndex] = useState<IndexedProduct[] | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const params = useParams()
  const { t } = useTranslations()

  const segment = Array.isArray(params?.countryCode)
    ? params.countryCode[0]
    : (params?.countryCode as string | undefined)
  const country = countryOf(segment)

  useEffect(() => {
    const openFromElsewhere = () => setOpen(true)
    window.addEventListener(OPEN_SEARCH_EVENT, openFromElsewhere)
    return () => window.removeEventListener(OPEN_SEARCH_EVENT, openFromElsewhere)
  }, [])

  // Warm the index as soon as the overlay opens, not on page load — most
  // visitors never search, and this keeps it off the critical path.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    loadIndex(country).then((products) => {
      if (!cancelled) setIndex(products)
    })
    return () => {
      cancelled = true
    }
  }, [open, country])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || !index) return []

    // Every word must appear somewhere, so "red rose" narrows rather than
    // widening the way a plain substring match would.
    const words = q.split(/\s+/)
    return index
      .filter((p) => words.every((w) => p.terms.includes(w)))
      .slice(0, MAX_RESULTS)
  }, [query, index])

  const close = useCallback(() => {
    setOpen(false)
    setQuery("")
  }, [])

  // Enter hands off to the store page, which has the full filter set and a
  // shareable URL — the overlay is for finding one product quickly.
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    close()
    router.push(`/${segment}/store?q=${encodeURIComponent(q)}`)
  }

  const total = query.trim() && index ? results.length : 0

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("search.open")}
        data-testid="search-button"
        className="inline-flex min-h-[2.75rem] min-w-[2.75rem] items-center justify-center gap-2 text-ink-700 transition-colors hover:text-blush-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blush-700"
      >
        <SearchIcon className="h-5 w-5" />
        {/* The word is worth the space on desktop and costs too much on a
            375px header, where the icon alone is unambiguous. */}
        <span className="hidden small:inline">{t("search.open")}</span>
      </button>

      <Transition show={open} as={Fragment}>
        {/* initialFocus, not an afterEnter hook: the Dialog manages focus
            itself and was taking it back, so the caret never landed in the
            field and you had to tap it before typing. */}
        <Dialog
          onClose={close}
          initialFocus={inputRef}
          className="relative z-[70]"
        >
          <TransitionChild
            as={Fragment}
            enter="transition-opacity ease-out duration-150"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-ink-900/40" aria-hidden="true" />
          </TransitionChild>

          <div className="fixed inset-x-0 top-0 flex justify-center p-0 small:p-6">
            <TransitionChild
              as={Fragment}
              enter="transition ease-out duration-150"
              enterFrom="opacity-0 -translate-y-3"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 -translate-y-3"
            >
              <DialogPanel
                data-testid="search-panel"
                className="flex max-h-[100dvh] w-full max-w-2xl flex-col overflow-hidden bg-white shadow-xl small:rounded-2xl"
              >
                <form
                  onSubmit={submit}
                  className="flex items-center gap-2 border-b border-ink-200/70 px-3 py-2"
                >
                  <SearchIcon className="h-5 w-5 flex-none text-ink-400" />
                  <input
                    ref={inputRef}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("search.placeholder")}
                    aria-label={t("search.open")}
                    data-testid="search-input"
                    autoComplete="off"
                    className="min-h-[2.75rem] w-full border-0 bg-transparent text-base text-ink-900 placeholder:text-ink-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={close}
                    aria-label={t("search.close")}
                    className="inline-flex min-h-[2.75rem] min-w-[2.75rem] flex-none items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-blush-50 hover:text-blush-700"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                      <path
                        d="M6 6l12 12M18 6L6 18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </form>

                <div className="overflow-y-auto overscroll-contain">
                  {/* aria-live so a screen reader hears the count change; the
                      results themselves update silently as you type. */}
                  <p className="sr-only" aria-live="polite">
                    {query.trim()
                      ? total === 1
                        ? t("search.oneResult")
                        : t("search.results", { count: total })
                      : ""}
                  </p>

                  {!query.trim() ? (
                    <p className="px-4 py-8 text-center text-sm text-ink-500">
                      {index ? t("search.hint") : t("search.loading")}
                    </p>
                  ) : results.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <p className="text-base text-ink-800">
                        {t("search.empty", { q: query.trim() })}
                      </p>
                      <p className="mt-1 text-sm text-ink-500">
                        {t("search.emptyHint")}
                      </p>
                    </div>
                  ) : (
                    <ul className="flex flex-col py-1">
                      {results.map((p) => (
                        <li key={p.id}>
                          <LocalizedClientLink
                            href={`/products/${p.handle}`}
                            onClick={close}
                            className="flex min-h-[3.5rem] items-center gap-3 px-3 py-2 transition-colors hover:bg-blush-50 focus-visible:bg-blush-50 focus-visible:outline-none"
                          >
                            {p.thumbnail ? (
                              // Plain img, not next/image: these are already
                              // small, and routing 50 possible thumbnails
                              // through the optimizer on a Worker buys nothing.
                              <img
                                src={p.thumbnail}
                                alt=""
                                loading="lazy"
                                className="h-12 w-12 flex-none rounded-lg object-cover"
                              />
                            ) : (
                              <span className="h-12 w-12 flex-none rounded-lg bg-blush-50" />
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm text-ink-900">
                                {p.title}
                              </span>
                              {p.price && (
                                <span className="block text-sm text-ink-500">
                                  {p.price}
                                </span>
                              )}
                            </span>
                          </LocalizedClientLink>
                        </li>
                      ))}
                    </ul>
                  )}

                  {results.length > 0 && (
                    <button
                      type="button"
                      onClick={submit}
                      className="flex min-h-[3rem] w-full items-center justify-center border-t border-ink-200/70 text-sm font-semibold text-blush-700 hover:bg-blush-50"
                    >
                      {t("search.viewAll")}
                    </button>
                  )}
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}
