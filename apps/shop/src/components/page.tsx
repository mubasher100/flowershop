import type { ReactNode } from "react"
import { Link } from "react-router-dom"

/**
 * A page under More: a back link to where it came from, the title, and an
 * optional action on the right (Add, Save…). The back link is a real link so
 * the phone's own back swipe and this button agree.
 */
export function SubPage({
  title,
  back = "/more",
  backLabel = "More",
  action,
  children,
}: {
  title: string
  back?: string
  backLabel?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-6">
      <div className="flex flex-col gap-1">
        <Link to={back} className="-ms-2 flex min-h-[44px] w-fit items-center px-2 text-blush-700">
          <span aria-hidden className="me-1">‹</span> {backLabel}
        </Link>
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-3xl font-semibold">{title}</h1>
          {action}
        </div>
      </div>
      {children}
    </div>
  )
}

/** A rounded white card, the app's one container. */
export const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <section className={`flex flex-col gap-3 rounded-2xl border border-ink-200 bg-white p-4 ${className}`}>{children}</section>
)
