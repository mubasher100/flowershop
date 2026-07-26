const checkEnvVariables = require("./check-env-variables")

checkEnvVariables()

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
    unoptimized: true,
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
      ...(MEDIA_HOSTNAME && MEDIA_PATHNAME
        ? [
            {
              protocol: "https",
              hostname: MEDIA_HOSTNAME,
              pathname: MEDIA_PATHNAME,
            },
          ]
        : []),
    ],
  },
}

module.exports = nextConfig
