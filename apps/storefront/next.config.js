const checkEnvVariables = require("./check-env-variables")

// next.config.js is loaded by `next lint` and `next typegen` too, not just
// `dev`/`build`. Those don't talk to the backend, so requiring a real
// publishable key there would break CI on every PR.
if (!process.env.SKIP_ENV_VALIDATION) {
  checkEnvVariables()
}

/**
 * Remote image host for product media.
 *
 * This project is self-hosted — set these to whichever bucket the Medusa file
 * provider writes to (Cloudflare R2 or Supabase Storage). Not Medusa Cloud.
 */
const MEDIA_HOSTNAME = process.env.NEXT_PUBLIC_MEDIA_HOSTNAME
const MEDIA_PATHNAME = process.env.NEXT_PUBLIC_MEDIA_PATHNAME

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    /**
     * Next's optimiser does not run on Cloudflare Workers, so images used to
     * be served at full size — a 900px photograph for a 165px card. A custom
     * loader picks from variants generated ahead of time by
     * scripts/build-image-variants.mjs; anything not in that manifest falls
     * back to its original URL.
     */
    loader: "custom",
    loaderFile: "./src/lib/util/image-loader.js",
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "*.s3.*.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "*.s3.amazonaws.com",
      },
      // MEDIA_PATHNAME is optional: the bucket serves images from its root,
      // and requiring it meant the media host was silently never allowed.
      ...(MEDIA_HOSTNAME
        ? [
            {
              protocol: "https",
              hostname: MEDIA_HOSTNAME,
              pathname: MEDIA_PATHNAME || "/**",
            },
          ]
        : []),
    ],
  },
}

module.exports = nextConfig
