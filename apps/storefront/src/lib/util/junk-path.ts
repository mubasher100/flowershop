/** Files the app itself serves at the root (src/app), and the favicon. */
const ROOT_FILES = new Set([
  "/robots.txt",
  "/sitemap.xml",
  "/favicon.ico",
  "/icon.png",
  "/icon1.png",
  "/apple-icon.png",
  "/opengraph-image.jpg",
  "/twitter-image.jpg",
  "/IMAGE-CREDITS.json",
])

/** What scanners ask for and this shop never serves. */
const JUNK_EXTENSION =
  /\.(sql|zip|rar|gz|tgz|tar|7z|bz2|bak|old|orig|save|swp|env|php\d?|phtml|aspx?|jsp|cgi|ini|conf|log|db|sqlite3?|mdb|ya?ml|toml|pem|key|crt|sh|bat|exe)$/i

/**
 * A path with a dot in it that is not a file of ours.
 *
 * Dotted paths skip locale routing, so "/backup.sql" reached the homepage
 * route with "backup.sql" as its country and rendered, and cached, a whole
 * homepage. One scanner did that 750 times on 23 Nov 2026 and every request
 * ran out of CPU. Answered in the middleware it costs next to nothing.
 */
export function isJunkPath(pathname: string): boolean {
  if (!pathname.includes(".")) return false
  if (ROOT_FILES.has(pathname)) return false
  if (JUNK_EXTENSION.test(pathname)) return true
  const segments = pathname.split("/").filter(Boolean)
  // "/.env", "/.git/config": hidden files, but not /.well-known/….
  if (segments.some((s) => s.startsWith(".") && s !== ".well-known")) return true
  // Anything else dotted at the root would be read as a country.
  return Boolean(segments[0]?.includes(".")) && segments[0] !== ".well-known"
}
