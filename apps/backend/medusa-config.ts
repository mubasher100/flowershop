import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const REDIS_URL = process.env.REDIS_URL

if (process.env.NODE_ENV === 'production' && !REDIS_URL) {
  throw new Error(
    'REDIS_URL is required in production. Without it Medusa falls back to ' +
      'in-memory modules, which lose scheduled jobs and workflow state on restart.'
  )
}

/**
 * Redis-backed infrastructure modules.
 *
 * Without these, Medusa silently falls back to in-memory implementations.
 * That is fine for local dev, but in production it breaks scheduled jobs,
 * subscribers, and long-running workflows across restarts — and it cannot
 * work at all once the API and worker run as separate processes.
 *
 * Gated on REDIS_URL so `npm run dev` works without a local Redis.
 */
const redisModules = REDIS_URL
  ? [
      {
        // Deprecated since v2.11 in favour of @medusajs/medusa/caching, which
        // is still behind a feature flag. Migrate once that flag is stable.
        resolve: '@medusajs/medusa/cache-redis',
        options: { redisUrl: REDIS_URL },
      },
      {
        resolve: '@medusajs/medusa/event-bus-redis',
        options: {
          redisUrl: REDIS_URL,
          // Bound job history so Redis memory doesn't grow without limit.
          jobOptions: {
            removeOnComplete: { age: 3600, count: 1000 },
            removeOnFail: { age: 86400, count: 5000 },
          },
        },
      },
      {
        resolve: '@medusajs/medusa/workflow-engine-redis',
        options: { redis: { url: REDIS_URL } },
      },
      {
        resolve: '@medusajs/medusa/locking',
        options: {
          providers: [
            {
              resolve: '@medusajs/medusa/locking-redis',
              id: 'locking-redis',
              is_default: true,
              options: { redisUrl: REDIS_URL },
            },
          ],
        },
      },
    ]
  : []

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,

    /**
     * Supabase terminates TLS at the pooler with a certificate that doesn't
     * chain to Node's default CA bundle, so verification has to be relaxed.
     * The connection is still encrypted.
     *
     * Use the SESSION POOLER (port 5432) — the transaction pooler (6543)
     * breaks MikroORM's prepared statements and migrations.
     */
    databaseDriverOptions: process.env.DATABASE_URL?.includes('supabase')
      ? { connection: { ssl: { rejectUnauthorized: false } } }
      : {},

    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    },

    // `shared` runs API + worker in one process. Split into two Railway
    // services (`server` and `worker`) when background work needs to scale
    // independently of request traffic.
    workerMode:
      (process.env.MEDUSA_WORKER_MODE as 'shared' | 'server' | 'worker') ??
      'shared',
  },

  admin: {
    // A worker process serves no HTTP, so it must not build the admin bundle.
    disable:
      process.env.DISABLE_MEDUSA_ADMIN === 'true' ||
      process.env.MEDUSA_WORKER_MODE === 'worker',
    backendUrl: process.env.MEDUSA_BACKEND_URL,
  },

  modules: [
    ...redisModules,

    // Payment providers. SkipCash lands here in Phase 8:
    // {
    //   resolve: '@medusajs/medusa/payment',
    //   options: {
    //     providers: [
    //       {
    //         resolve: './src/modules/skipcash',
    //         id: 'skipcash',
    //         options: {
    //           baseUrl: process.env.SKIPCASH_BASE_URL,
    //           clientId: process.env.SKIPCASH_CLIENT_ID,
    //           keyId: process.env.SKIPCASH_KEY_ID,
    //           keySecret: process.env.SKIPCASH_KEY_SECRET,
    //           webhookKey: process.env.SKIPCASH_WEBHOOK_KEY,
    //         },
    //       },
    //     ],
    //   },
    // },
  ],
})
