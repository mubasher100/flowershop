import { useState, type FormEvent } from "react"

import { Button, Field, inputClass } from "../components/ui"
import { messageOf } from "../lib/bulk"
import { sdk } from "../lib/sdk"

export default function Login({ onSignedIn }: { onSignedIn: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setBusy(true)
    setError("")
    try {
      const result = await sdk.auth.login("user", "emailpass", {
        email: String(form.get("email")),
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

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 px-6 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <img src="/icons/logo.webp" alt="Tulips and Truffles" className="w-48" width={320} height={55} />
        <p className="text-ink-600">Sign in to run the shop.</p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Email">
          <input name="email" type="email" autoComplete="username" required className={inputClass} />
        </Field>
        <Field label="Password">
          <input name="password" type="password" autoComplete="current-password" required className={inputClass} />
        </Field>
        {error && (
          <p role="alert" className="rounded-xl bg-blush-100 px-3 py-2 text-blush-700">
            {error}
          </p>
        )}
        <Button type="submit" busy={busy} className="mt-2">
          Sign in
        </Button>
      </form>
    </main>
  )
}
