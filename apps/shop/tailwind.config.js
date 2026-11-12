/**
 * The storefront's palette, through the same CSS variables (brand.css is
 * imported in src/index.css), so the shop app and the website can never drift.
 */
const shades = (name) =>
  Object.fromEntries(
    [50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((s) => [s, `var(--${name}-${s})`])
  )

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        blush: shades("blush"),
        sage: shades("sage"),
        champagne: shades("champagne"),
        ink: { 0: "var(--ink-0)", ...shades("ink") },
      },
      fontFamily: {
        sans: ['"Google Sans"', "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        display: ['"Cormorant Garamond"', "Georgia", "serif"],
      },
    },
  },
}
