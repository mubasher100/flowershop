/**
 * Two copies of each catalogue page: one ready-made, one built per request.
 *
 * Reading searchParams makes a route render on every visit, and a catalogue
 * render does not fit the Worker's free CPU allowance: one visitor opening
 * /store every few seconds was enough for Cloudflare 1102 (23 Nov 2026). So
 * /store, /categories/… and /collections/… read no query and are served from
 * the cache, and the middleware sends an address that really has a filter to
 * its twin under /filtered, which the visitor never sees in the address bar.
 */
export const FILTERED_SEGMENT = "filtered"

const FILTER_PARAMS = [
  "sortBy",
  "page",
  "q",
  "colour",
  "category",
  "minPrice",
  "maxPrice",
  "optionValueIds",
]

const CATALOGUE = /^\/([a-z]{2}-[a-z]{2})\/(store\/?$|categories\/.+|collections\/.+)/

/** The twin to render for this address, or null if the ready-made page will do. */
export function filteredPath(pathname: string, params: URLSearchParams): string | null {
  const match = CATALOGUE.exec(pathname)
  if (!match || !FILTER_PARAMS.some((p) => params.get(p))) return null
  const segment = match[1]
  return `/${segment}/${FILTERED_SEGMENT}${pathname.slice(segment.length + 1)}`
}

/** The address the visitor sees, whichever twin is rendering. */
export const publicPathname = (pathname: string) =>
  pathname.replace(/^(\/[^/]+)\/filtered(?=\/|$)/, "$1")

/** The page's filters as a query string, for the client controls. */
export function queryString(params: Record<string, string | string[] | undefined>): string {
  const out = new URLSearchParams()
  for (const key of FILTER_PARAMS) {
    const value = params[key]
    for (const v of Array.isArray(value) ? value : [value]) if (v) out.append(key, v)
  }
  return out.toString()
}
