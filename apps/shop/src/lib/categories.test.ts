import { describe, expect, it } from "vitest"

import { freeHandle, kindOf, moved, slugify, websiteOrder } from "./categories"
import type { ShopCategory } from "./shop"

const cat = (handle: string, extra: Partial<ShopCategory> = {}): ShopCategory => ({ id: handle, name: handle, handle, ...extra })

describe("websiteOrder", () => {
  const all = [
    cat("vases", { rank: 1 }),
    cat("bouquets", { rank: 0 }),
    cat("hot-deals", { rank: 8 }),
    cat("eid-flowers", { rank: 20 }),
    cat("birthday", { rank: 2 }),
    cat("graduation", { rank: 21, metadata: { kind: "occasion" } }),
    cat("child", { parent_category_id: "vases" }),
  ]

  it("keeps the website's built-in order, then new categories by rank", () => {
    expect(websiteOrder(all, "type").map((c) => c.handle)).toEqual(["hot-deals", "bouquets", "vases", "eid-flowers"])
  })

  it("puts a new occasion with the occasions, not in the menu", () => {
    expect(websiteOrder(all, "occasion").map((c) => c.handle)).toEqual(["birthday", "graduation"])
    expect(kindOf(all[5])).toBe("occasion")
  })

  it("follows positions once the florist has reordered", () => {
    const reordered = all.map((c) =>
      c.handle === "eid-flowers" ? { ...c, metadata: { position: 0 } } : c.handle === "hot-deals" ? { ...c, metadata: { position: 1 } } : { ...c, metadata: { position: 5 } }
    )
    expect(websiteOrder(reordered, "type").map((c) => c.handle).slice(0, 2)).toEqual(["eid-flowers", "hot-deals"])
  })
})

describe("handles", () => {
  it("makes a web address from a name", () => {
    expect(slugify("Eid & Ramadan Flowers!")).toBe("eid-and-ramadan-flowers")
    expect(slugify("Café Roses")).toBe("cafe-roses")
  })

  it("never reuses one already taken", () => {
    expect(freeHandle("Vases", ["vases", "vases-2"])).toBe("vases-3")
    expect(freeHandle("ورود", [])).toBe("category")
  })
})

describe("moved", () => {
  it("swaps with the neighbour and ignores moves off the end", () => {
    expect(moved(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"])
    const same = ["a", "b"]
    expect(moved(same, 0, -1)).toBe(same)
  })
})
