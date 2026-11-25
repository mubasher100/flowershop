import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import {
  isDriveId,
  mapLimited,
  photoVersion,
} from "../../../../lib/drive-folder"

/** Each photo's current version, to tell whether it was replaced in Drive. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const ids = String(req.query.ids ?? "")
    .split(",")
    .filter(isDriveId)
    .slice(0, 50)
  const versions = await mapLimited(ids, 8, photoVersion)
  res.json({
    versions: Object.fromEntries(ids.map((id, i) => [id, versions[i]])),
  })
}
