import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * Shared shell for the standing information pages.
 *
 * The footer and side menu linked to /delivery, /flower-care and /contact on
 * every page of the site, and none of them existed — every one was a 404. They
 * share a layout so the three read as one voice rather than three attempts.
 *
 * Measured type: one h1, then h2 per block, so the heading outline is right
 * for a screen reader without needing a visual scan.
 */
export default function ContentPage({
  title,
  intro,
  backLabel,
  children,
}: {
  title: string
  intro?: string
  backLabel: string
  children: React.ReactNode
}) {
  return (
    <div className="content-container py-10 small:py-16">
      <div className="max-w-[68ch]">
        <h1 className="font-display text-4xl text-ink-900 small:text-5xl">
          {title}
        </h1>

        {intro && (
          <p className="mt-4 text-base leading-relaxed text-ink-600 small:text-lg">
            {intro}
          </p>
        )}

        <div className="mt-8 flex flex-col gap-8">{children}</div>

        <LocalizedClientLink
          href="/store"
          className="mt-12 inline-flex min-h-[2.75rem] items-center text-sm font-semibold text-blush-700 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blush-700"
        >
          {backLabel}
        </LocalizedClientLink>
      </div>
    </div>
  )
}

/** A titled block. h2 under the page's single h1. */
export function ContentBlock({
  heading,
  children,
}: {
  heading: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-2xl text-ink-900">{heading}</h2>
      {children}
    </section>
  )
}

export function ContentList({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-2 ps-5 text-base leading-relaxed text-ink-600 marker:text-blush-400">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}
