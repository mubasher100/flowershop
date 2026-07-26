// Required by jest.config.js (setupFiles). Clearing MikroORM's metadata
// storage between test runs prevents "entity already defined" errors when
// multiple suites load the same modules in one Jest process.
const { MetadataStorage } = require("@medusajs/framework/mikro-orm/core")

MetadataStorage.clear()
