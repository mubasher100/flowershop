/**
 * The app's small set of building blocks. Every control is at least 44px tall
 * (the shop's tap-target rule), and sheets are native <dialog>s, which give
 * focus trapping, Escape to close and an inert page behind for free.
 */
import {
  useEffect,
  useRef,
  useSyncExternalStore,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react"

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ")

/* ------------------------------------------------------------- buttons */

type Variant = "primary" | "secondary" | "ghost" | "danger"

export function Button({
  variant = "primary",
  busy,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; busy?: boolean }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || busy}
      aria-busy={busy || undefined}
      className={cx(
        "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-medium transition-colors disabled:opacity-50",
        variant === "primary" && "bg-blush-600 text-white active:bg-blush-700",
        variant === "secondary" && "border border-ink-200 bg-white text-ink-900 active:bg-ink-50",
        variant === "ghost" && "text-ink-900 active:bg-ink-100",
        variant === "danger" && "border border-blush-600 bg-white text-blush-700 active:bg-blush-100",
        className
      )}
    >
      {busy ? <Spinner /> : null}
      {children}
    </button>
  )
}

export const Spinner = () => (
  <span
    aria-hidden
    className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
  />
)

/* --------------------------------------------------------------- switch */

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex min-h-[44px] min-w-[52px] items-center justify-center disabled:opacity-50"
    >
      <span
        className={cx(
          "relative h-7 w-12 rounded-full transition-colors",
          checked ? "bg-sage-600" : "bg-ink-200"
        )}
      >
        <span
          className={cx(
            "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all",
            checked ? "start-6" : "start-1"
          )}
        />
      </span>
    </button>
  )
}

/* ---------------------------------------------------------------- sheet */

/** A bottom sheet on phones, a centred panel on wider screens. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={title}
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none rounded-t-3xl bg-white p-0 text-ink-900 sm:m-auto sm:max-w-lg sm:rounded-3xl"
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-ink-100 px-4 py-2">
            {/* Focus lands on the title, not the close button: opening a sheet
                should read its name, not offer to close it. */}
            <h2 tabIndex={-1} autoFocus className="text-lg font-semibold focus:outline-none">
              {title}
            </h2>
            <Button variant="ghost" onClick={onClose} aria-label="Close" className="px-3">
              ✕
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
          {footer && (
            <div className="border-t border-ink-100 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
              {footer}
            </div>
          )}
        </div>
      )}
    </dialog>
  )
}

/* ---------------------------------------------------------------- field */

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink-700">{label}</span>
      {children}
      {hint && <span className="text-sm text-ink-600">{hint}</span>}
    </label>
  )
}

export const inputClass =
  "min-h-[44px] w-full rounded-xl border border-ink-200 bg-white px-3 text-ink-900 placeholder:text-ink-500 focus:border-blush-600 focus:outline-none"

/* ---------------------------------------------------------------- toast */

type Toast = { id: number; text: string; tone: "ok" | "error" }
let toasts: Toast[] = []
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function toast(text: string, tone: Toast["tone"] = "ok") {
  const id = Date.now() + Math.random()
  toasts = [...toasts, { id, text, tone }]
  emit()
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id)
    emit()
  }, tone === "error" ? 8000 : 4500)
}

export function Toasts() {
  const list = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => toasts
  )
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[max(8px,env(safe-area-inset-top))] z-50 flex flex-col items-center gap-2 px-4"
    >
      {list.map((t) => (
        <div
          key={t.id}
          role={t.tone === "error" ? "alert" : "status"}
          className={cx(
            "pointer-events-auto w-full max-w-md rounded-2xl px-4 py-3 text-[15px] shadow-lg",
            t.tone === "ok" ? "bg-ink-900 text-white" : "bg-blush-700 text-white"
          )}
        >
          {t.text}
        </div>
      ))}
    </div>
  )
}

export { cx }
