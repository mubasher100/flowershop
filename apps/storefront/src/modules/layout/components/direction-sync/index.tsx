"use client"

import { isRtl, localeOf } from "@lib/util/locale"
import { useParams } from "next/navigation"
import { useEffect } from "react"

/**
 * Keeps <html lang/dir> in step with the route.
 *
 * The inline script in the root layout sets these before first paint, but it
 * only runs once per document load. Switching language is a client-side
 * navigation, so the strings re-rendered in Arabic while the document stayed
 * dir="ltr" — the whole layout, including which edge the menu drawer slides
 * from, was still mirrored for English.
 *
 * Browser back and forward hit the same path, so this cannot be avoided by
 * making the switcher itself a hard navigation.
 *
 * Both are needed: the script prevents a flash of the wrong direction on a
 * cold load, this keeps it correct from then on.
 */
export default function DirectionSync() {
  const params = useParams()
  const segment = Array.isArray(params?.countryCode)
    ? params.countryCode[0]
    : (params?.countryCode as string | undefined)

  useEffect(() => {
    const locale = localeOf(segment)
    const el = document.documentElement
    el.lang = locale
    el.dir = isRtl(locale) ? "rtl" : "ltr"
  }, [segment])

  return null
}
