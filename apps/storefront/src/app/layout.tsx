import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import localFont from "next/font/local"
import "styles/globals.css"

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

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode="light" className={googleSans.variable}>
      <body className={googleSans.className}>
        <main className="relative">{props.children}</main>
      </body>
    </html>
  )
}
