import { useQuery, useQueryClient } from "@tanstack/react-query"
import { NavLink, Navigate, Route, Routes } from "react-router-dom"

import { Toasts, cx } from "./components/ui"
import { IS_STAGING, sdk } from "./lib/sdk"
import Flowers from "./screens/flowers"
import Login from "./screens/login"
import More from "./screens/more"
import Orders from "./screens/orders"
import Website from "./screens/website"

const TABS = [
  { to: "/orders", label: "Orders", icon: "M4 6h16M4 12h16M4 18h10" },
  { to: "/flowers", label: "Flowers", icon: "M12 21c4-3 7-6.5 7-10a7 7 0 0 0-14 0c0 3.5 3 7 7 10Zm0-7a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" },
  { to: "/website", label: "Website", icon: "M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Z" },
  { to: "/more", label: "More", icon: "M5 12h.01M12 12h.01M19 12h.01" },
]

export default function App() {
  const qc = useQueryClient()
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => sdk.admin.user.me(),
    retry: false,
    staleTime: Infinity,
  })

  if (me.isPending) {
    return <div className="flex min-h-dvh items-center justify-center text-ink-600">Opening the shop…</div>
  }
  if (me.isError) {
    return (
      <>
        <Login onSignedIn={() => qc.invalidateQueries({ queryKey: ["me"] })} />
        <Toasts />
      </>
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
      {IS_STAGING && (
        <div className="bg-champagne-600 px-4 py-1 text-center text-xs font-medium text-white">
          Staging: test copy. Changes here never reach the real shop.
        </div>
      )}
      <main className="flex-1 pb-[calc(72px+env(safe-area-inset-bottom))]">
        <Routes>
          <Route path="/" element={<Navigate to="/orders" replace />} />
          <Route path="/orders/*" element={<Orders />} />
          <Route path="/flowers/*" element={<Flowers />} />
          <Route path="/website" element={<Website />} />
          <Route path="/more" element={<More />} />
          <Route path="*" element={<Navigate to="/orders" replace />} />
        </Routes>
      </main>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-white pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="mx-auto flex max-w-2xl">
          {TABS.map((t) => (
            <li key={t.to} className="flex-1">
              <NavLink
                to={t.to}
                className={({ isActive }) =>
                  cx(
                    "flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-xs",
                    isActive ? "font-semibold text-blush-700" : "text-ink-600"
                  )
                }
              >
                <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={t.icon} />
                </svg>
                {t.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Toasts />
    </div>
  )
}
