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

/**
 * Sets `lang` and `dir` from the first URL segment before the page paints.
 *
 * `dir` drives the entire right-to-left layout — every spacing and
 * positioning utility was converted to Tailwind's logical variants (ps/pe,
 * ms/me, start/end), which mirror off this one attribute.
 *
 * It has to be set here, synchronously, for two reasons. The root layout
 * receives no route params, so it cannot read the locale segment directly.
 * And doing it in an effect after hydration would show a flash of
 * left-to-right layout before flipping — jarring in Arabic.
 */
const DIR_SCRIPT = `(function(){try{
var s=(location.pathname.split('/')[1]||'').toLowerCase().split('-')[0];
var rtl=s==='ar';
var e=document.documentElement;
e.lang=rtl?'ar':'en';
e.dir=rtl?'rtl':'ltr';
}catch(e){}})()`

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html
      // Static markup ships the default; the script above corrects it from the
      // URL before first paint.
      lang="en"
      dir="ltr"
      data-mode="light"
      className={`${googleSans.variable} ${cormorant.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: DIR_SCRIPT }} />
      </head>
      <body className={googleSans.className}>
        {/* A plain wrapper, not <main>. This element wraps the whole document
            including the nav and footer, so calling it "main" put the site
            navigation inside the main landmark and left the page with no
            meaningful skip target. The real <main> is in the locale layout,
            around the page content only. */}
        <div className="relative">{props.children}</div>
      </body>
    </html>
  )
}
