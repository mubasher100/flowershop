import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Calendar } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Switch,
  Text,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import { sdk } from "../../lib/sdk"

type DeliveryDay = {
  id: string
  date: string
  closed: boolean
  max_orders: number | null
  max_per_window: number | null
  booked: number
  window_counts: Record<string, number> | null
  note: string | null
}

type DaysResponse = {
  days: DeliveryDay[]
  defaults: { max_orders: number; max_per_window: number }
}

const DAYS_KEY = ["delivery-days"]

/** yyyy-mm-dd in Qatar, which is the day the shop is actually working. */
const qatarToday = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Qatar" })

const prettyDate = (date: string) => {
  const d = new Date(`${date}T12:00:00Z`)
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}

/**
 * Delivery days.
 *
 * The shop could not close a day or cap a slot, so the site would keep taking
 * orders for Eid, and would sell forty bouquets into one 2pm-4pm window on
 * Valentine's Day. This is where a florist says "we are shut" or "that
 * afternoon is full", and sees how full the coming days already are.
 *
 * Only days that have been booked or configured appear — an ordinary quiet
 * day needs no row, and adding one is how you close it.
 */
const DeliveryDaysPage = () => {
  const queryClient = useQueryClient()
  const [newDate, setNewDate] = useState(qatarToday())
  const [note, setNote] = useState("")

  const { data, isLoading } = useQuery<DaysResponse>({
    queryKey: DAYS_KEY,
    queryFn: () => sdk.client.fetch("/admin/delivery-days"),
  })

  const save = useMutation({
    mutationFn: (body: Partial<DeliveryDay> & { date: string }) =>
      sdk.client.fetch("/admin/delivery-days", { method: "POST", body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DAYS_KEY })
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not save that day."),
  })

  const defaults = data?.defaults
  const today = qatarToday()
  const days = (data?.days ?? []).filter((d) => d.date >= today)

  return (
    <div className="flex flex-col gap-3">
      <Container className="divide-y p-0">
        <div className="flex flex-col gap-1 px-6 py-4">
          <Heading level="h1">Delivery days</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Close a day the shop is shut, or cap how many orders it will take.
            Days you have not touched run on the shop default of{" "}
            {defaults?.max_orders ?? "—"} orders a day and{" "}
            {defaults?.max_per_window ?? "—"} per two-hour window.
          </Text>
        </div>

        <div className="flex flex-wrap items-end gap-3 px-6 py-4">
          <div className="flex flex-col gap-1">
            <Label size="small" htmlFor="new-date">
              Date
            </Label>
            <Input
              id="new-date"
              type="date"
              min={today}
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <Label size="small" htmlFor="new-note">
              Why (optional)
            </Label>
            <Input
              id="new-note"
              placeholder="Eid holiday, fully booked, staff day"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <Button
            variant="secondary"
            disabled={!newDate || save.isPending}
            onClick={() => {
              save.mutate(
                { date: newDate, closed: true, note: note || null },
                {
                  onSuccess: () => {
                    toast.success(`${prettyDate(newDate)} is closed.`)
                    setNote("")
                  },
                }
              )
            }}
          >
            Close this day
          </Button>
        </div>
      </Container>

      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">The next few weeks</Heading>
        </div>

        {isLoading ? (
          <div className="px-6 py-8">
            <Text size="small" className="text-ui-fg-subtle">
              Loading…
            </Text>
          </div>
        ) : days.length === 0 ? (
          <div className="px-6 py-8">
            <Text size="small" className="text-ui-fg-subtle">
              Nothing booked or closed yet. Every day is open.
            </Text>
          </div>
        ) : (
          <div className="flex flex-col divide-y">
            {days.map((day) => {
              const counts = Object.entries(day.window_counts ?? {}).filter(
                ([, n]) => n > 0
              )
              const cap = day.max_orders ?? defaults?.max_orders ?? 0

              return (
                <div
                  key={day.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-6 py-4"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Text weight="plus">{prettyDate(day.date)}</Text>
                      {day.closed ? (
                        <Badge size="2xsmall" color="red">
                          closed
                        </Badge>
                      ) : day.booked >= cap ? (
                        <Badge size="2xsmall" color="orange">
                          full
                        </Badge>
                      ) : (
                        <Badge size="2xsmall" color="green">
                          open
                        </Badge>
                      )}
                      {day.note && (
                        <Text size="small" className="text-ui-fg-subtle">
                          {day.note}
                        </Text>
                      )}
                    </div>
                    <Text size="small" className="text-ui-fg-subtle">
                      {day.booked} of {cap} orders
                      {counts.length
                        ? ` · ${counts
                            .map(([w, n]) => `${w}: ${n}`)
                            .join(" · ")}`
                        : ""}
                    </Text>
                  </div>

                  <div className="flex flex-none items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label size="small" htmlFor={`open-${day.id}`}>
                        Open
                      </Label>
                      <Switch
                        id={`open-${day.id}`}
                        checked={!day.closed}
                        onCheckedChange={(checked) =>
                          save.mutate({ date: day.date, closed: !checked })
                        }
                      />
                    </div>
                    <Input
                      type="number"
                      min={0}
                      className="w-24"
                      aria-label="Maximum orders for this day"
                      placeholder={String(defaults?.max_orders ?? "")}
                      defaultValue={day.max_orders ?? ""}
                      onBlur={(e) => {
                        const value = e.target.value.trim()
                        save.mutate({
                          date: day.date,
                          max_orders: value === "" ? null : Number(value),
                        })
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Delivery days",
  icon: Calendar,
})

export default DeliveryDaysPage
