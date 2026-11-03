import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { BellAlert, BellAlertSolid } from "@medusajs/icons"
import { Button, Tooltip, toast } from "@medusajs/ui"
import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"

import { ORDERS_KEY } from "../components/shop/shared"
import { sdk } from "../lib/sdk"

/**
 * A chime, a pop-up and a desktop notification the moment an order comes in.
 *
 * The shop's request (3 Nov 2026): the admin sits open on the shop computer,
 * and a new order should be impossible to miss. It lives in the top bar so it
 * runs on every admin page, not just Shop.
 *
 * Orders are checked every 15 seconds. A browser slows timers in a tab that
 * is in the background, so there an alert can take up to about a minute;
 * the desktop notification still shows over other windows.
 *
 * Browsers refuse to play sound until someone has clicked the page, so the
 * bell button is that click: it switches sound on (remembered on this
 * computer) and asks for permission to show desktop notifications. After a
 * reload any click on the page re-enables sound.
 *
 * Only orders placed after the page opened are announced — the Shop list is
 * where the earlier ones are.
 */
const POLL_MS = 15_000
const SOUND_KEY = "tt-order-sound"

type NewOrder = {
  id: string
  display_id: number
  created_at: string
  metadata?: Record<string, unknown> | null
}

/** The page's own title, without our "(2) New order —" prefix. */
const plainTitle = () => document.title.replace(/^\(\d+\) New order — /, "")

const readSoundPref = () => {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off"
  } catch {
    return true
  }
}

/** A bright two-note bell, three times — made in the browser, no file. */
const chime = (ctx: AudioContext) => {
  const notes = [880, 1318.5]
  for (let ring = 0; ring < 3; ring++) {
    notes.forEach((freq, i) => {
      const start = ctx.currentTime + ring * 0.7 + i * 0.16
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "sine"
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.6, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.9)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 1)
    })
  }
}

const describe = (o: NewOrder) => {
  const m = o.metadata ?? {}
  const who = (m.contact_name as string) || "A customer"
  const when = [m.delivery_date, m.delivery_window].filter(Boolean).join(", ")
  return when ? `${who} · delivery ${when}` : who
}

const NewOrderAlert = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [soundOn, setSoundOn] = useState(readSoundPref)
  const [audioReady, setAudioReady] = useState(false)
  const ctxRef = useRef<AudioContext | null>(null)
  const lastSeen = useRef<string | null>(null)
  const unread = useRef(0)

  // Create or wake the audio context. Only works inside a click or key press.
  const unlockAudio = () => {
    try {
      ctxRef.current ??= new AudioContext()
      void ctxRef.current.resume().then(() => setAudioReady(ctxRef.current?.state === "running"))
    } catch {
      // No Web Audio: the pop-up and notification still work.
    }
  }

  // After a reload, the first click anywhere re-enables sound — except a
  // click on the bell, which toggle() handles. Waking audio on the bell's own
  // pointerdown made the click that followed see sound already on and mute
  // it, so the first press appeared to do nothing.
  const bellRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!soundOn) return
    const wake = (e: Event) => {
      if (bellRef.current?.contains(e.target as Node)) return
      unlockAudio()
    }
    window.addEventListener("pointerdown", wake)
    window.addEventListener("keydown", wake)
    return () => {
      window.removeEventListener("pointerdown", wake)
      window.removeEventListener("keydown", wake)
    }
  }, [soundOn])

  // The tab title counts unseen orders until the window is looked at.
  useEffect(() => {
    const clear = () => {
      if (document.hidden) return
      unread.current = 0
      document.title = plainTitle()
    }
    document.addEventListener("visibilitychange", clear)
    window.addEventListener("focus", clear)
    return () => {
      document.removeEventListener("visibilitychange", clear)
      window.removeEventListener("focus", clear)
    }
  }, [])

  useEffect(() => {
    let stopped = false

    const announce = (orders: NewOrder[]) => {
      if (soundOn && ctxRef.current?.state === "running") chime(ctxRef.current)

      for (const o of orders) {
        toast.info(`New order #${o.display_id}`, {
          description: describe(o),
          duration: 60_000,
          action: {
            label: "Open",
            altText: `Open order #${o.display_id}`,
            onClick: () => navigate(`/orders/${o.id}`),
          },
        })
        try {
          if ("Notification" in window && Notification.permission === "granted") {
            const n = new Notification(`New order #${o.display_id}`, {
              body: describe(o),
              tag: o.id,
              requireInteraction: true,
            })
            n.onclick = () => {
              window.focus()
              navigate(`/orders/${o.id}`)
              n.close()
            }
          }
        } catch {
          // Some browsers only allow notifications from a service worker.
        }
      }

      if (document.hidden || !document.hasFocus()) {
        unread.current += orders.length
        document.title = `(${unread.current}) New order — ${plainTitle()}`
      }
      // The Shop list shows it now rather than at its next minute's refresh.
      queryClient.invalidateQueries({ queryKey: ORDERS_KEY })
    }

    const check = async () => {
      try {
        const { orders } = (await sdk.admin.order.list({
          limit: 10,
          order: "-created_at",
          fields: "id,display_id,created_at,metadata",
        })) as unknown as { orders: NewOrder[] }
        if (stopped || !orders) return
        // First look: remember where the list stands, announce nothing.
        if (lastSeen.current === null) {
          lastSeen.current = orders[0]?.created_at ?? new Date(0).toISOString()
          return
        }
        const fresh = orders.filter((o) => o.created_at > (lastSeen.current as string))
        if (!fresh.length) return
        lastSeen.current = fresh[0].created_at
        announce(fresh.reverse())
      } catch {
        // Offline or signed out for a moment: try again next round.
      }
    }

    void check()
    const timer = window.setInterval(check, POLL_MS)
    return () => {
      stopped = true
      window.clearInterval(timer)
    }
  }, [soundOn, navigate, queryClient])

  const toggle = () => {
    const next = !(soundOn && audioReady)
    setSoundOn(next)
    try {
      localStorage.setItem(SOUND_KEY, next ? "on" : "off")
    } catch {
      // Not remembered; fine for this session.
    }
    if (next) {
      unlockAudio()
      // A short ring so the shop knows what to listen for, and that it works.
      window.setTimeout(() => {
        if (ctxRef.current?.state === "running") chime(ctxRef.current)
      }, 150)
      try {
        if ("Notification" in window && Notification.permission === "default") {
          void Notification.requestPermission()
        }
      } catch {
        // Notifications unavailable; sound and pop-ups still work.
      }
    }
  }

  const live = soundOn && audioReady
  return (
    <Tooltip
      content={
        live
          ? "Order sound is on. Click to mute."
          : "Click to hear a chime when an order comes in."
      }
    >
      <Button
        ref={bellRef}
        size="small"
        variant={live ? "secondary" : "primary"}
        onClick={toggle}
      >
        {live ? <BellAlertSolid /> : <BellAlert />}
        {live ? "Order alerts on" : "Turn on order sound"}
      </Button>
    </Tooltip>
  )
}

export const config = defineWidgetConfig({
  zone: "topbar",
})

export default NewOrderAlert
