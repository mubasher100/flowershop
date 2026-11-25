import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import {
  DriveError,
  downloadPhoto,
  isDriveId,
} from "../../../../../lib/drive-folder"

/** One photo from Google Drive, for the shop app to shrink and upload. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params
  if (!isDriveId(id)) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Not a Drive photo.")
  }
  try {
    const { data, type } = await downloadPhoto(id)
    res.setHeader("content-type", type)
    res.setHeader("x-content-type-options", "nosniff")
    res.setHeader("cache-control", "no-store")
    res.send(data)
  } catch (e) {
    if (!(e instanceof DriveError)) throw e
    throw new MedusaError(MedusaError.Types.INVALID_DATA, e.message)
  }
}
