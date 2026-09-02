// Serve the latest ingested data file for one TDU (docs/architecture-blueprint.md §4).
//
// The browser never talks to Blob or Power to Choose directly — it calls this
// route, which finds "the current data" for the area and 307-redirects to that
// blob's public URL. It does not proxy the bytes.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { list } from "@vercel/blob";
import { isTduId } from "../../frontend/src/types/plan.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const tdu = Array.isArray(req.query.tdu) ? req.query.tdu[0] : req.query.tdu;

  if (!tdu || !isTduId(tdu)) {
    res.status(400).json({ error: `Unknown TDU: ${tdu ?? "(missing)"}` });
    return;
  }

  let blobs;
  try {
    ({ blobs } = await list({ prefix: `plans/${tdu}-` }));
  } catch (error) {
    res.status(502).json({
      error: "Could not reach Blob storage",
      detail: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  if (blobs.length === 0) {
    res.status(404).json({ error: `No data yet for ${tdu}` });
    return;
  }

  // Each cron run writes a new timestamped path, so "current" = newest upload.
  const latest = blobs.reduce((newest, blob) =>
    blob.uploadedAt > newest.uploadedAt ? blob : newest,
  );

  res.redirect(307, latest.url);
}
