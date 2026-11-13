import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

/**
 * "Make it live now", from the shop app.
 *
 * A saved change normally reaches customers within about half an hour: each
 * Cloudflare datacentre serves its cached copy for that long without checking
 * (see CLAUDE.md, Caching & performance). The one thing that clears every
 * datacentre at once is a fresh storefront deploy, because cache keys carry
 * the build id — so this starts the storefront's deploy workflow on GitHub.
 *
 * It changes no Medusa data, so there is no workflow behind it: it is a call
 * to GitHub on the shop's behalf. Needs GITHUB_DEPLOY_TOKEN on Railway — a
 * fine-grained token for this one repository with "Actions: read and write".
 * Without it the route says so, and the app keeps its half-hour countdown.
 */
const REPO = process.env.GITHUB_DEPLOY_REPO || "mubasher100/flowershop"
const REF = process.env.GITHUB_DEPLOY_REF || "main"
const WORKFLOW = "deploy-storefront.yml"

type Run = {
  status: string
  conclusion: string | null
  created_at: string
  updated_at: string
}

async function github(path: string, init?: RequestInit) {
  return fetch(`https://api.github.com/repos/${REPO}${path}`, {
    ...init,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${process.env.GITHUB_DEPLOY_TOKEN}`,
      "x-github-api-version": "2022-11-28",
      "user-agent": "tulips-and-truffles-shop",
      ...(init?.headers ?? {}),
    },
  })
}

async function latestRun(): Promise<Run | null> {
  const res = await github(
    `/actions/workflows/${WORKFLOW}/runs?branch=${encodeURIComponent(REF)}&per_page=1`
  )
  if (!res.ok) throw new Error(`GitHub answered ${res.status}`)
  const body = (await res.json()) as { workflow_runs?: Run[] }
  return body.workflow_runs?.[0] ?? null
}

const describe = (run: Run | null) =>
  run
    ? {
        running: run.status !== "completed",
        started_at: run.created_at,
        finished_at: run.status === "completed" ? run.updated_at : null,
        ok: run.status === "completed" ? run.conclusion === "success" : null,
      }
    : null

/** Whether a deploy is running, and how the last one went. */
export async function GET(
  _req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  if (!process.env.GITHUB_DEPLOY_TOKEN) {
    return res.json({ available: false, last: null })
  }
  try {
    res.json({ available: true, last: describe(await latestRun()) })
  } catch (e) {
    res.json({ available: true, last: null, error: (e as Error).message })
  }
}

/** Start a deploy, unless one is already on its way. */
export async function POST(
  _req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  if (!process.env.GITHUB_DEPLOY_TOKEN) {
    return res.status(501).json({
      message:
        "Make it live now is not switched on yet. Changes still reach the website within 30 minutes.",
    })
  }

  // Two taps (or two people) must not queue two five-minute deploys.
  const current = await latestRun().catch(() => null)
  if (current && current.status !== "completed") {
    return res.json({ started: false, last: describe(current) })
  }

  const dispatched = await github(`/actions/workflows/${WORKFLOW}/dispatches`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ref: REF }),
  })
  if (!dispatched.ok) {
    return res.status(502).json({
      message: `The website could not be refreshed (GitHub answered ${dispatched.status}). Changes still go live within 30 minutes.`,
    })
  }
  res.json({ started: true, last: null })
}
