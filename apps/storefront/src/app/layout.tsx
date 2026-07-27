import { getLocale } from "@lib/data/locale-actions"
import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import { Cormorant_Garamond } from "next/font/google"
import localFont from "next/font/local"
import "styles/globals.css"

/**
 * Cormorant Garamond — the display face.
 *
 * Applied to headings, product names and prices. It is a high-contrast
 * display serif: gorgeous at 24px and up, but its hairline strokes thin out
 * badly at UI sizes on a phone, so body copy, buttons and form labels stay on
 * Google Sans. That pairing is how the reference sites use their serifs too.
 */
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
})

/**
 * Google Sans.
 *
 * Google released this under the SIL Open Font License in 2025 — it was
 * proprietary to Google's own products before that — so it is legitimately
 * usable here.
 *
 * Loaded via next/font/local rather than next/font/google: Next 15's font
 * manifest predates the release and rejects the family with "Unknown font".
 * The file below is the Latin subset of the variable face pulled from Google
 * Fonts (36 KB, covers 400–700 in one request).
 *
 * Self-hosting also means the Worker makes no third-party font request, so
 * there is nothing render-blocking on a cold mobile connection.
 */
const googleSans = localFont({
  src: [
    {
      path: "../fonts/google-sans-latin.woff2",
      weight: "400 700",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-google-sans",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
})

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default async function RootLayout(props: {
  children: React.ReactNode
}) {
  /**
   * `dir` drives the whole right-to-left layout. Every spacing and
   * positioning utility in the storefront was converted to Tailwind's logical
   * variants (ps/pe, ms/me, start/end), which mirror off this attribute — so
   * flipping it flips the layout without a second stylesheet.
   */
  const locale = (await getLocale()) ?? "en-US"
  const isArabic = locale.startsWith("ar")

  return (
    <html
      lang={isArabic ? "ar" : "en"}
      dir={isArabic ? "rtl" : "ltr"}
      data-mode="light"
      className={`${googleSans.variable} ${cormorant.variable}`}
    >
      <body className={googleSans.className}>
        <main className="relative">{props.children}</main>
      </body>
    </html>
  )
}
