import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { DriveError, folderIdOf, listPhotos } from "../../../lib/drive-folder"

/**
 * The photos in a shared Google Drive folder, by name, for the spreadsheet
 * import. Read-only, so there is no workflow behind it.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const id = folderIdOf(String(req.query.link ?? ""))
  if (!id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "That is not a Google Drive folder link. Open the folder in Drive, choose Share, then Copy link."
    )
  }
  try {
    res.json({ photos: await listPhotos(id) })
  } catch (e) {
    if (!(e instanceof DriveError)) throw e
    throw new MedusaError(MedusaError.Types.INVALID_DATA, e.message)
  }
}
