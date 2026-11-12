import { useQuery, useQueryClient } from "@tanstack/react-query"

import { Button } from "../components/ui"
import { BACKEND, IS_STAGING, sdk } from "../lib/sdk"

const LINKS: [string, string][] = [
  ["Delivery days", "/app/delivery-days"],
  ["Full admin", "/app/orders"],
]

export default function More() {
  const qc = useQueryClient()
  const me = useQuery({ queryKey: ["me"], queryFn: () => sdk.admin.user.me(), staleTime: Infinity })

  async function signOut() {
    await sdk.auth.logout().catch(() => undefined)
    qc.clear()
    window.location.assign("/")
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-[max(12px,env(safe-area-inset-top))]">
      <h1 className="font-display text-3xl font-semibold">More</h1>
      <ul className="flex flex-col gap-2">
        {LINKS.map(([label, path]) => (
          <li key={path}>
            <a href={`${BACKEND}${path}`} target="_blank" rel="noreferrer" className="flex min-h-[48px] items-center justify-between rounded-2xl border border-ink-200 bg-white px-4">
              {label} <span aria-hidden>↗</span>
            </a>
          </li>
        ))}
      </ul>
      <section className="flex flex-col gap-2 rounded-2xl border border-ink-200 bg-white p-4">
        <p className="text-[15px] text-ink-600">
          Signed in as <b className="text-ink-900">{me.data?.user.email}</b>
          {IS_STAGING ? " on the staging copy" : ""}.
        </p>
        <Button variant="secondary" onClick={signOut}>
          Sign out
        </Button>
      </section>
    </div>
  )
}
