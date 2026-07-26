import { medusaIntegrationTestRunner } from "@medusajs/test-utils"

/**
 * Smoke tests for the HTTP layer.
 *
 * These boot a real Medusa app against a real (throwaway) database, so they
 * catch the class of failure a build cannot: broken module registration, bad
 * medusa-config wiring, and missing middleware.
 */
medusaIntegrationTestRunner({
  testSuite: ({ api }) => {
    describe("health", () => {
      it("responds 200 so Railway's healthcheck passes", async () => {
        const response = await api.get("/health")

        expect(response.status).toEqual(200)
      })
    })

    describe("store API authentication", () => {
      it("rejects Store API requests that omit the publishable key", async () => {
        // Guards the single most common storefront misconfiguration. The
        // storefront must always send x-publishable-api-key.
        const response = await api
          .get("/store/products")
          .catch((e) => e.response)

        expect(response.status).toEqual(400)
      })
    })

    describe("admin API authentication", () => {
      it("rejects unauthenticated admin requests", async () => {
        const response = await api.get("/admin/products").catch((e) => e.response)

        expect(response.status).toEqual(401)
      })
    })
  },
})

// These tests boot the whole application and run migrations, so the default
// 5s Jest timeout is nowhere near enough.
jest.setTimeout(60 * 1000)
