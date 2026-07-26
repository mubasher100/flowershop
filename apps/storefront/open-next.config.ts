import { defineCloudflareConfig } from "@opennextjs/cloudflare"

// Incremental cache is left unset until an R2 bucket or KV namespace exists.
// Without it, ISR/SSG pages are regenerated per-request rather than cached.
export default defineCloudflareConfig({})
