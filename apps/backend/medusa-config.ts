import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const REDIS_URL = process.env.REDIS_URL

/**
 * Guard against deploying without Redis.
 *
 * `medusa start` forces NODE_ENV=production even when run locally, so this
 * would otherwise make it impossible to run a production build on a dev
 * machine. ALLOW_INMEMORY_INFRA=true is the deliberate escape hatch for that —
 * never set it on Railway.
 */
if (
  process.env.NODE_ENV === 'production' &&
  !REDIS_URL &&
  process.env.ALLOW_INMEMORY_INFRA !== 'true'
) {
  // A generic Error is correct here: this is a boot-time misconfiguration that
  // must stop the process, not a request failure that maps to an HTTP status.
  // eslint-disable-next-line @medusajs/use-medusa-error-not-generic-error
  throw new Error(
    'REDIS_URL is required in production. Without it Medusa falls back to ' +
      'in-memory modules, which lose scheduled jobs and workflow state on ' +
      'restart. To run a production build locally without Redis, set ' +
      'ALLOW_INMEMORY_INFRA=true.'
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
/**
 * Where product photography uploaded in the admin is stored.
 *
 * With no file module configured, Medusa falls back to the local provider,
 * which writes into `static/` and hands back a `http://localhost:9000/...`
 * URL. That is broken three ways over: the address means nothing to a
 * visitor's browser, it is plain http on an https page, and Railway's
 * filesystem does not survive a deploy — so the file disappears anyway.
 *
 * Cloudflare R2 is S3-compatible and already part of this stack. Set the five
 * variables below and uploads go there with a public URL that works. Leave
 * them unset and the local provider stays, which is only good enough for
 * local development.
 *
 * The bucket must be a *separate*, publicly readable one — not
 * `flowershop-cache`, which holds the storefront's incremental cache and
 * should stay private.
 */
const S3_FILE_URL = process.env.S3_FILE_URL
const S3_BUCKET = process.env.S3_BUCKET
const S3_ENDPOINT = process.env.S3_ENDPOINT

const fileModule =
  S3_FILE_URL && S3_BUCKET && S3_ENDPOINT
    ? [
        {
          resolve: '@medusajs/medusa/file',
          options: {
            providers: [
              {
                resolve: '@medusajs/medusa/file-s3',
                id: 's3',
                options: {
                  file_url: S3_FILE_URL,
                  bucket: S3_BUCKET,
                  endpoint: S3_ENDPOINT,
                  access_key_id: process.env.S3_ACCESS_KEY_ID,
                  secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
                  // R2 has no regions, but the S3 client insists on one.
                  region: process.env.S3_REGION || 'auto',
                },
              },
            ],
          },
        },
      ]
    : [
        {
          resolve: '@medusajs/medusa/file',
          options: {
            providers: [
              {
                resolve: '@medusajs/medusa/file-local',
                id: 'local',
                options: {
                  // Without this the provider hardcodes localhost:9000, so an
                  // uploaded image is unreachable from anywhere but the
                  // machine that received it.
                  backend_url: `${
                    process.env.MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
                  }/static`,
                },
              },
            ],
          },
        },
      ]

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

/**
 * Email notifications, gated on a Resend API key.
 *
 * RESEND_FROM must be an address on a domain verified with Resend, or every
 * send is refused. Without the key the module still registers the local
 * provider, which writes the notification to the logs — useful in
 * development and harmless in production.
 */
const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM = process.env.RESEND_FROM

const notificationModule = [
  {
    resolve: "@medusajs/medusa/notification",
    options: {
      providers: [
        {
          resolve: "@medusajs/medusa/notification-local",
          id: "local",
          options: { name: "Local notification", channels: ["feed"] },
        },
        ...(RESEND_API_KEY && RESEND_FROM
          ? [
              {
                resolve: "./src/modules/resend",
                id: "resend",
                options: {
                  channels: ["email"],
                  api_key: RESEND_API_KEY,
                  from: RESEND_FROM,
                  reply_to: process.env.RESEND_REPLY_TO,
                },
              },
            ]
          : []),
      ],
    },
  },
]

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
    ...fileModule,

    /**
     * Homepage sections.
     *
     * Which collections get a rail, in what order and under what heading used
     * to be a hardcoded list in the storefront, so renaming a section or
     * adding a seasonal one meant a code change and a deploy.
     */
    { resolve: "./src/modules/homepage" },

    /**
     * Delivery capacity.
     *
     * How many orders the shop will take for a given day and for each
     * two-hour window, and which days are closed. Without it the checkout
     * accepted unlimited orders into every slot and no holiday could be
     * blocked.
     */
    { resolve: "./src/modules/delivery-capacity" },

    /**
     * Email.
     *
     * The shop sent the customer nothing at all — the browser tab was their
     * only record of an order. Registered only when a Resend key is present,
     * so a deploy without one behaves exactly as before rather than failing
     * to boot; the local provider keeps a record in the logs either way.
     */
    ...notificationModule,

    /**
     * Translation module.
     *
     * Registers the locales this store serves and exposes /store/locales,
     * which the storefront's language switcher reads — that endpoint was
     * 404ing because the module was never registered.
     *
     * Arabic is the second language for a Qatar shop, and `ar` is RTL, so the
     * storefront has to flip direction as well as swap strings.
     */
    {
      resolve: "@medusajs/medusa/translation",
      options: {
        locales: [
          { code: "en-US", name: "English" },
          { code: "ar-QA", name: "العربية" },
        ],
      },
    },

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
