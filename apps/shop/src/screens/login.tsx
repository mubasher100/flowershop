import { useRef, useState, type FormEvent } from "react"

import { Button, inputClass } from "../components/ui"
import { messageOf } from "../lib/bulk"
import { sdk } from "../lib/sdk"

/**
 * Sign in. Made for a phone (13 Nov 2026, the owner's complaint): copying a
 * password from a notes app and long-pressing a field to paste fought with
 * the iPhone's own password bar, so each field has its own Paste button, the
 * password can be shown to check it, and the email field does not
 * autocorrect or capitalise. Once the phone has saved the password for this
 * site its Passwords bar offers it in one tap, and the sign-in then lasts 30
 * days (jwtExpiresIn in medusa-config.ts).
 */
export default function Login({ onSignedIn }: { onSignedIn: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const email = useRef<HTMLInputElement>(null)
  const password = useRef<HTMLInputElement>(null)
  // Paste needs the async clipboard API (HTTPS, and a recent browser).
  const canPaste = typeof navigator !== "undefined" && !!navigator.clipboard?.readText

  async function paste(into: React.RefObject<HTMLInputElement | null>) {
    try {
      const text = (await navigator.clipboard.readText()).trim()
      if (into.current && text) {
        into.current.value = text
        into.current.focus()
      }
    } catch {
      setError("The phone didn't allow pasting. Tap and hold in the box, then Paste.")
    }
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setBusy(true)
    setError("")
    try {
      const result = await sdk.auth.login("user", "emailpass", {
        email: String(form.get("email")).trim(),
        password: String(form.get("password")),
      })
      if (typeof result !== "string") throw new Error("This account needs another sign-in step.")
      onSignedIn()
    } catch (err) {
      const m = messageOf(err)
      setError(/unauthori|invalid/i.test(m) ? "That email and password don't match." : m)
    } finally {
      setBusy(false)
    }
  }

  const pasteButton = (into: React.RefObject<HTMLInputElement | null>, label: string) =>
    canPaste && (
      <button
        type="button"
        onClick={() => paste(into)}
        aria-label={label}
        className="min-h-[44px] flex-none rounded-xl border border-ink-200 bg-white px-3 text-sm font-medium text-ink-900 active:bg-ink-50"
      >
        Paste
      </button>
    )

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 px-6 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <img src="/icons/logo.webp" alt="Tulips and Truffles" className="w-48" width={320} height={55} />
        <p className="text-ink-600">Sign in to run the shop.</p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-ink-700">Email</label>
          <div className="flex gap-2">
            <input
              ref={email}
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              className={inputClass}
            />
            {pasteButton(email, "Paste email")}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium text-ink-700">Password</label>
          <div className="flex gap-2">
            <input
              ref={password}
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              className={inputClass}
            />
            {pasteButton(password, "Paste password")}
          </div>
          <label className="flex min-h-[44px] items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
              className="h-5 w-5 accent-blush-600"
            />
            Show password
          </label>
        </div>
        {error && (
          <p role="alert" className="rounded-xl bg-blush-100 px-3 py-2 text-blush-700">
            {error}
          </p>
        )}
        <Button type="submit" busy={busy} className="mt-2">
          Sign in
        </Button>
        <p className="text-center text-sm text-ink-600">You stay signed in on this phone for 30 days.</p>
      </form>
    </main>
  )
}
