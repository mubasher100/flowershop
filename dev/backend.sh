#!/usr/bin/env bash
# Runs the Medusa CLI against the private Docker database (dev/docker-compose.yml).
#
#   dev/backend.sh db:migrate
#   dev/backend.sh exec ./src/scripts/seed-qatar.ts
#   dev/backend.sh develop
#
# Medusa always loads apps/backend/.env, which may hold the LIVE database and
# media bucket. dotenv never overwrites a variable that is already set, even
# to an empty string, so every variable that file can hold is set here first.
# That is what keeps this local copy away from the live shop.
set -euo pipefail
cd "$(dirname "$0")/../apps/backend"

export NODE_ENV=development
export DATABASE_URL="postgres://medusa:medusa@localhost:5441/flowershop"
export REDIS_URL="redis://localhost:6391"
export JWT_SECRET="local-dev-only" COOKIE_SECRET="local-dev-only" AUTH_MFA_ENCRYPTION_KEY="local-dev-only-key-0123456789abcd"
export STORE_CORS="http://localhost:8000,http://localhost:5174"
export ADMIN_CORS="http://localhost:9000,http://localhost:5174"
export AUTH_CORS="http://localhost:9000,http://localhost:8000,http://localhost:5174"
export MEDUSA_BACKEND_URL="http://localhost:9000"
export MEDUSA_WORKER_MODE=shared DISABLE_MEDUSA_ADMIN=false
export MEDUSA_ADMIN_ONBOARDING_TYPE="" MEDUSA_ADMIN_ONBOARDING_NEXTJS_DIRECTORY=""
# No live media bucket: uploads stay on this machine.
export S3_FILE_URL="" S3_BUCKET="" S3_ENDPOINT="" S3_ACCESS_KEY_ID="" S3_SECRET_ACCESS_KEY="" S3_REGION="" S3_PREFIX=""
# No real email, no real payments, no storefront to purge.
export RESEND_API_KEY="" RESEND_FROM="" RESEND_REPLY_TO="" SHOP_ORDER_ALERT_EMAILS=""
export SKIPCASH_CLIENT_ID="" SKIPCASH_KEY_ID="" SKIPCASH_KEY_SECRET="" SKIPCASH_WEBHOOK_KEY="" SKIPCASH_BASE_URL=""
export STOREFRONT_URL="" REVALIDATE_SECRET=""

exec npx medusa "$@"
