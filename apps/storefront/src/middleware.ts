import {
  buildSegment,
  DEFAULT_LOCALE,
  Locale,
  LOCALES,
  parseSegment,
} from "@lib/util/locale"
import { HttpTypes } from "@medusajs/types"
import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
const DEFAULT_REGION = process.env.NEXT_PUBLIC_DEFAULT_REGION || "dk"

const regionMapCache = {
  regionMap: new Map<string, HttpTypes.StoreRegion>(),
  regionMapUpdated: Date.now(),
}

async function getRegionMap(cacheId: string) {
  const { regionMap, regionMapUpdated } = regionMapCache

  if (!BACKEND_URL) {
    throw new Error(
      "Middleware.ts: Error fetching regions. Did you set up regions in your Medusa Admin and define a NEXT_PUBLIC_MEDUSA_BACKEND_URL environment variable."
    )
  }

  if (
    !regionMap.keys().next().value ||
    regionMapUpdated < Date.now() - 3600 * 1000
  ) {
    // Fetch regions from Medusa. We can't use the JS client here because middleware is running on Edge and the client needs a Node environment.
    const response = await fetch(`${BACKEND_URL}/store/regions`, {
      method: "GET",
      headers: {
        "x-publishable-api-key": PUBLISHABLE_API_KEY!,
      },
      next: {
        revalidate: 3600,
        tags: [`regions-${cacheId}`],
      },
      cache: "force-cache",
    })

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`)
    }

    const json = await response.json()

    const { regions } = json

    if (!regions?.length) {
      return new Map<string, HttpTypes.StoreRegion>()
    }

    // Create a map of country codes to regions.
    regions.forEach((region: HttpTypes.StoreRegion) => {
      region.countries?.forEach((c) => {
        regionMapCache.regionMap.set(c.iso_2 ?? "", region)
      })
    })

    regionMapCache.regionMapUpdated = Date.now()
  }

  return regionMapCache.regionMap
}

/**
 * Fetches regions from Medusa and sets the region cookie.
 * @param request
 * @param response
 */
async function getCountryCode(
  request: NextRequest,
  regionMap: Map<string, HttpTypes.StoreRegion | number>
) {
  let countryCode

  const urlCountryCode = request.nextUrl.pathname.split("/")[1]?.toLowerCase()

  // Cloudflare Workers provides country via request.cf.country
  const cloudflareCountryCode = (request as { cf?: { country?: string } }).cf?.country?.toLowerCase()

  // Vercel provides x-vercel-ip-country header
  const vercelCountryCode = request.headers
    .get("x-vercel-ip-country")
    ?.toLowerCase()

  if (urlCountryCode && regionMap.has(urlCountryCode)) {
    countryCode = urlCountryCode
  } else if (cloudflareCountryCode && regionMap.has(cloudflareCountryCode)) {
    countryCode = cloudflareCountryCode
  } else if (vercelCountryCode && regionMap.has(vercelCountryCode)) {
    countryCode = vercelCountryCode
  } else if (regionMap.has(DEFAULT_REGION)) {
    countryCode = DEFAULT_REGION
  } else if (regionMap.keys().next().value) {
    countryCode = regionMap.keys().next().value
  }

  return countryCode
}

/**
 * Picks a language for a visitor who has not chosen one.
 *
 * Honours a previous choice first, then Accept-Language, then English.
 * Guessing Arabic purely from a Qatari IP would be wrong as often as right —
 * Doha's population is largely non-Arabic-speaking.
 */
function localePreference(request: NextRequest): Locale {
  const chosen = request.cookies.get("_medusa_locale")?.value
  if (chosen && LOCALES.includes(chosen.split("-")[0] as Locale)) {
    return chosen.split("-")[0] as Locale
  }

  const header = request.headers.get("accept-language") ?? ""
  const preferred = header.split(",")[0]?.split("-")[0]?.toLowerCase()

  return LOCALES.includes(preferred as Locale)
    ? (preferred as Locale)
    : DEFAULT_LOCALE
}

/**
 * Middleware to handle region selection and onboarding status.
 */
/**
 * Headers every response carries.
 *
 * The site had none of these. HSTS is the one that matters most: without it
 * a first visit over http:// is a plaintext round trip that can be
 * intercepted, and Cloudflare's redirect only helps after it has happened.
 * The rest are cheap and stop a class of embedding and sniffing attacks.
 *
 * No Content-Security-Policy yet: the storefront inlines Next's hydration
 * scripts, so a useful policy needs nonces threading through the document,
 * which is a larger change than this pass.
 */
const SECURITY_HEADERS: [string, string][] = [
  ["Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload"],
  ["X-Content-Type-Options", "nosniff"],
  ["X-Frame-Options", "SAMEORIGIN"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  ["X-DNS-Prefetch-Control", "on"],
  ["Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()"],
]

const withSecurityHeaders = (response: NextResponse) => {
  for (const [name, value] of SECURITY_HEADERS) {
    response.headers.set(name, value)
  }
  return response
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.includes(".")) {
    return withSecurityHeaders(NextResponse.next())
  }

  // One canonical host. Both www and the apex are bound to the Worker so
  // either resolves, but a shop reachable at two addresses splits its cache
  // and its search ranking; www is redirected permanently to the apex.
  const host = request.headers.get("host") ?? ""
  if (host.startsWith("www.")) {
    const url = request.nextUrl.clone()
    url.host = host.slice(4)
    return withSecurityHeaders(NextResponse.redirect(url, 308))
  }

  const cacheIdCookie = request.cookies.get("_medusa_cache_id")
  const cacheId = cacheIdCookie?.value || crypto.randomUUID()

  const regionMap = await getRegionMap(cacheId)
  const countryCode = await getCountryCode(request, regionMap)

  // if the country code is available, use it, otherwise use the default region
  const country = countryCode || DEFAULT_REGION
  const firstPathSegment = request.nextUrl.pathname.split("/")[1]?.toLowerCase()

  /**
   * The first segment carries language and country together — "en-qa",
   * "ar-qa" — so each locale gets its own statically prerendered page. A
   * cookie could not do this: it is unreadable during static generation, so
   * every cached page would ship the default language.
   *
   * A bare country ("/qa/...") is redirected to the default locale rather
   * than 404'd, so older links and bookmarks keep working.
   */
  const { locale, countryCode: segmentCountry } = parseSegment(firstPathSegment)
  const urlHasLocaleAndCountry =
    firstPathSegment === buildSegment(locale, segmentCountry) &&
    regionMap.has(segmentCountry)

  if (urlHasLocaleAndCountry) {
    if (!cacheIdCookie) {
      const response = NextResponse.next()
      response.cookies.set("_medusa_cache_id", cacheId, {
        maxAge: 60 * 60 * 24,
      })
      return withSecurityHeaders(response)
    }
    return withSecurityHeaders(NextResponse.next())
  }

  // Otherwise send the visitor to a proper locale-and-country URL.
  //
  // If the first segment was a bare country we already consumed it, so it must
  // be dropped from the remainder — "/qa/store" becomes "/en-qa/store", not
  // "/en-qa/qa/store".
  const segments = request.nextUrl.pathname.split("/").filter(Boolean)
  const consumedBareCountry = regionMap.has(firstPathSegment ?? "")
  const rest = consumedBareCountry ? segments.slice(1) : segments

  const target = buildSegment(
    localePreference(request),
    regionMap.has(segmentCountry) ? segmentCountry : country
  )

  const redirectPath = rest.length ? `/${rest.join("/")}` : ""
  const queryString = request.nextUrl.search || ""

  return withSecurityHeaders(
    NextResponse.redirect(
      `${request.nextUrl.origin}/${target}${redirectPath}${queryString}`,
      307
    )
  )
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|images|assets|png|svg|jpg|jpeg|gif|webp).*)",
  ],
}
