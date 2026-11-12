import { describe, expect, it } from "vitest"

import { endIn9, nextStocked, offerPrice, runLimited } from "./bulk"
import { countdown, liveBy, LIVE_DELAY_MINUTES } from "./live"
import { groupByDay, matchesOrder, stageOf, windowRank, type ShopOrder } from "./orders"
import { sellingOf } from "./shop"
import { priceHint, sizeProblem } from "../components/flower-sheet"

describe("prices end in 9", () => {
  it.each([
    [223.2, 219],
    [229, 229],
    [230, 229],
    [999.99, 999],
    [1000, 999],
    [15, 9],
    [9, 9],
    [5, 5],
  ])("endIn9(%s) = %s", (input, expected) => expect(endIn9(input)).toBe(expected))

  it("an offer is always below the full price and ends in 9", () => {
    for (const full of [99, 149, 279, 999, 1999]) {
      for (const pct of [1, 5, 10, 20, 50]) {
        const o = offerPrice(full, pct)
        expect(o).toBeLessThan(full)
        expect(o % 10).toBe(9)
      }
    }
    expect(offerPrice(279, 20)).toBe(219)
  })

  it("hints at a price that does not end in 9, and stays quiet otherwise", () => {
    expect(priceHint("280")).toMatch(/279/)
    expect(priceHint("279")).toBeNull()
    expect(priceHint("")).toBeNull()
  })
})

describe("what a customer pays", () => {
  it("reads a sale price over a higher base as an offer", () => {
    expect(sellingOf({ base: 279, sale: 249, sale_price_id: "x" })).toEqual({ now: 249, was: 279 })
  })
  it("ignores a sale price that is not lower", () => {
    expect(sellingOf({ base: 249, sale: 279, sale_price_id: "x" })).toEqual({ now: 279, was: null })
  })
  it("uses the base price when there is no sale", () => {
    expect(sellingOf({ base: 199, sale: null, sale_price_id: null })).toEqual({ now: 199, was: null })
  })
})

describe("size validation", () => {
  const ok = { id: "v", title: "One size", price: "279", onOffer: false, offer: "", canSell: "10", held: 0 }
  it("accepts a complete size", () => expect(sizeProblem(ok)).toBeNull())
  it("needs a price", () => expect(sizeProblem({ ...ok, price: "" })).toMatch(/price/i))
  it("needs an offer below the price", () =>
    expect(sizeProblem({ ...ok, onOffer: true, offer: "300" })).toMatch(/below/))
  it("refuses negative stock", () => expect(sizeProblem({ ...ok, canSell: "-1" })).toMatch(/0 or more/))
})

describe("stock: the florist sets what can be sold", () => {
  it("set adds back what unsent orders hold", () => expect(nextStocked(5, 2, "set", 10)).toBe(12))
  it("set to 0 leaves only what is held, so nothing more can be bought", () =>
    expect(nextStocked(5, 2, "set", 0)).toBe(2))
  it("add adds to the shelf", () => expect(nextStocked(5, 2, "add", 3)).toBe(8))
})

describe("runLimited", () => {
  it("reports each item and never runs more than the limit at once", async () => {
    let running = 0
    let peak = 0
    const results = await runLimited([1, 2, 3, 4, 5, 6], 2, async (n) => {
      running++
      peak = Math.max(peak, running)
      await new Promise((r) => setTimeout(r, 5))
      running--
      if (n === 4) throw new Error("no")
    })
    expect(peak).toBeLessThanOrEqual(2)
    expect(results.map((r) => r.ok)).toEqual([true, true, true, false, true, true])
    expect(results[3].error).toBe("no")
  })
})

describe("live-by timer", () => {
  it(`is ${LIVE_DELAY_MINUTES} minutes after the change`, () => {
    const at = new Date("2026-11-12T10:00:00Z")
    expect(liveBy(at).toISOString()).toBe("2026-11-12T10:30:00.000Z")
  })
  it("counts down in minutes and seconds, then stops", () => {
    const target = new Date("2026-11-12T10:30:00Z")
    expect(countdown(target, new Date("2026-11-12T10:03:50Z"))).toBe("26:10")
    expect(countdown(target, new Date("2026-11-12T10:30:00Z"))).toBeNull()
  })
})

const order = (o: Partial<ShopOrder> & { metadata?: Record<string, unknown> }): ShopOrder => ({
  id: String(Math.random()),
  display_id: 1,
  created_at: "",
  status: "pending",
  payment_status: "captured",
  fulfillment_status: "not_fulfilled",
  total: 0,
  currency_code: "qar",
  ...o,
})

describe("orders", () => {
  it("moves New → Confirmed → Sent, and Cancelled wins", () => {
    expect(stageOf(order({}))).toBe("new")
    expect(stageOf(order({ metadata: { shop_confirmed_at: "x" } }))).toBe("confirmed")
    expect(stageOf(order({ fulfillment_status: "fulfilled", metadata: { shop_confirmed_at: "x" } }))).toBe("sent")
    expect(stageOf(order({ status: "canceled", fulfillment_status: "fulfilled" }))).toBe("cancelled")
  })

  it("finds an order by number, name or the end of a phone number", () => {
    const o = order({ display_id: 1052, metadata: { contact_name: "Fatima Al-Kuwari", contact_phone: "+974 5555 1234" } })
    expect(matchesOrder(o, "#1052")).toBe(true)
    expect(matchesOrder(o, "fatima")).toBe(true)
    expect(matchesOrder(o, "1234")).toBe(true)
    expect(matchesOrder(o, "105")).toBe(false)
    expect(matchesOrder(o, "ahmed")).toBe(false)
  })

  it("groups by day in date order, each day in window order, 11:59 last", () => {
    const groups = groupByDay([
      order({ display_id: 3, metadata: { delivery_date: "2026-11-13", delivery_window: "11:59 PM" } }),
      order({ display_id: 1, metadata: { delivery_date: "2026-11-13", delivery_window: "2pm - 4pm" } }),
      order({ display_id: 2, metadata: { delivery_date: "2026-11-12", delivery_window: "10am - 12pm" } }),
      order({ display_id: 4, metadata: {} }),
    ])
    expect(groups.map(([d]) => d)).toEqual(["2026-11-12", "2026-11-13", "unscheduled"])
    expect(groups[1][1].map((o) => o.display_id)).toEqual([1, 3])
    expect(windowRank("4pm - 6pm")).toBeGreaterThan(windowRank("10am - 12pm"))
  })
})
