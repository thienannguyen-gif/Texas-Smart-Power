// Nightly ingestion job (docs/architecture-blueprint.md §4).
//
// For each of the six TDUs: fetch plans from Power to Choose using that area's
// anchor ZIP, normalize the records, run them through the domain pipeline
// (currently a no-op — see pipeline/pipeline.ts), write one timestamped JSON
// file to Blob, then delete that TDU's previous run(s).
//
// Invoked by Vercel Cron on the schedule in vercel.json. Auth is a bearer
// token: `Authorization: Bearer <CRON_SECRET>`.

import { readFile } from "node:fs/promises";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { del, list, put } from "@vercel/blob";
import {
  TDU_IDS,
  type Plan,
  type RawPlan,
  type TduId,
} from "../../frontend/src/types/plan.js";
import { normalizePlan } from "../../pipeline/normalize.js";
import { applyPipeline } from "../../pipeline/pipeline.js";
import { buildTduDataFile } from "../../pipeline/data-file.js";
import samplePlans from "../../pipeline/__fixtures__/plans.sample.json" with { type: "json" };

const POWER_TO_CHOOSE_URL = "https://www.powertochoose.org/en-us/service/v1/";

// One anchor ZIP per TDU, each known to sit entirely inside that utility's
// territory (blueprint §5). A split-territory ZIP would pull another TDU's
// plans into the wrong file.
const ANCHOR_ZIP: Record<TduId, string> = {
  oncor: "75201",
  centerpoint: "77002",
  "aep-central": "78401",
  "aep-north": "79601",
  tnmp: "75067",
  lubbock: "79424",
};

async function fetchRawPlans(zip: string): Promise<RawPlan[]> {
  const response = await fetch(POWER_TO_CHOOSE_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      method: "plans",
      zip_code: zip,
      company_tdu_id: "",
      company_unique_id: "",
      plan_mo_from: "",
      plan_mo_to: "",
      estimated_use: 1000,
      plan_type: "1",
      rating_total: "",
      include_details: true,
      language: 0,
      min_usage_plan: "off",
    }),
  });

  // The endpoint sometimes answers with an HTML error page instead of JSON —
  // guard the parse rather than letting it throw a bare SyntaxError.
  const text = await response.text();
  try {
    const parsed: unknown = JSON.parse(text);
    return Array.isArray(parsed) ? (parsed as RawPlan[]) : [];
  } catch {
    throw new Error(
      `Power to Choose returned non-JSON for ZIP ${zip} (HTTP ${response.status})`,
    );
  }
}

interface IngestResult {
  tdu: TduId;
  source: string;
  planCount: number;
  url: string;
  removedOldFiles: number;
}

// Local-dev escape hatch. powertochoose.org is behind Cloudflare and 403s from
// most environments, so `npm run seed` sends `x-seed-fixtures: 1` and the job
// reads from pipeline/__fixtures__/ instead of fetching (a real captured
// response per TDU if one exists, else the synthetic sample). Honoured only
// when this is NOT a deployed environment — preview and production always fetch
// live. See pipeline/__fixtures__/README.md.
function fixturesAllowedHere(): boolean {
  const env = process.env.VERCEL_ENV;
  return env === undefined || env === "development";
}

// In fixture mode, prefer a REAL captured response for this TDU
// (pipeline/__fixtures__/plans.<tdu>.raw.json, produced by
// `npm run capture-fixture`) and fall back to the synthetic sample only if no
// capture exists. Returns the plans plus which source was used, for reporting.
async function loadRawPlans(
  tdu: TduId,
  useFixtures: boolean,
): Promise<{ plans: RawPlan[]; source: string }> {
  if (!useFixtures) {
    return {
      plans: await fetchRawPlans(ANCHOR_ZIP[tdu]),
      source: "powertochoose",
    };
  }

  const capturedPath = new URL(
    `../../pipeline/__fixtures__/plans.${tdu}.raw.json`,
    import.meta.url,
  );
  try {
    const parsed: unknown = JSON.parse(await readFile(capturedPath, "utf8"));
    if (Array.isArray(parsed)) {
      return { plans: parsed as RawPlan[], source: `captured:${tdu}` };
    }
  } catch {
    // no capture for this TDU — fall through to the synthetic sample
  }
  return { plans: samplePlans as RawPlan[], source: "sample(synthetic)" };
}

async function ingestTdu(
  tdu: TduId,
  useFixtures: boolean,
): Promise<IngestResult> {
  const { plans: raw, source } = await loadRawPlans(tdu, useFixtures);

  const normalized = raw
    .map(normalizePlan)
    .filter((plan): plan is Plan => plan !== null);

  const plans = applyPipeline(normalized);

  const file = buildTduDataFile(tdu, plans);

  // New timestamped path every run: Blob URLs are edge-cached hard, so
  // overwriting a fixed path would keep serving stale data (blueprint §4).
  const pathname = `plans/${tdu}-${Date.now()}.json`;
  const { url } = await put(pathname, JSON.stringify(file), {
    access: "public",
    contentType: "application/json",
  });

  // Only now that the new file is written, drop this TDU's earlier runs.
  const { blobs } = await list({ prefix: `plans/${tdu}-` });
  const stale = blobs
    .filter((blob) => blob.pathname !== pathname)
    .map((blob) => blob.url);
  if (stale.length > 0) {
    await del(stale);
  }

  return {
    tdu,
    source,
    planCount: plans.length,
    url,
    removedOldFiles: stale.length,
  };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const useFixtures =
    fixturesAllowedHere() && req.headers["x-seed-fixtures"] === "1";

  const results: IngestResult[] = [];
  const errors: Array<{ tdu: TduId; message: string }> = [];

  // Sequential and independent: one TDU failing must not abort the others or
  // delete their previous good files.
  for (const tdu of TDU_IDS) {
    try {
      results.push(await ingestTdu(tdu, useFixtures));
    } catch (error) {
      errors.push({
        tdu,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  res.status(results.length === 0 ? 500 : 200).json({
    ok: errors.length === 0,
    generatedAt: new Date().toISOString(),
    mode: useFixtures ? "fixtures" : "live",
    results,
    errors,
  });
}
