// ZIP -> utility area(s) proxy (docs/architecture-blueprint.md §4).
//
// The upstream lookup API sends no CORS headers, so the browser can't call it
// directly — it goes through this function. This function takes { zip }, POSTs
// it upstream, maps the upstream's opaque company IDs to this app's short TDU
// codes, and returns { companies: [{ code, name }] }. It does NOT touch Blob.

import { readFile } from "node:fs/promises";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { TduId } from "../frontend/src/types/plan.js";
import type {
  UtilityArea,
  ZipLookupResponse,
} from "../frontend/src/types/zip.js";

const POWER_TO_CHOOSE_URL = "https://www.powertochoose.org/en-us/service/v1/";

// Upstream opaque company IDs -> this app's TDU codes (blueprint §5, verbatim).
const COMPANY_ID_TO_TDU: Record<string, TduId> = {
  ELSQL01DB1245281100004: "centerpoint",
  ELSQL01DB1245538000024: "lubbock",
  ELSQL01DB1245281100006: "oncor",
  ELSQL01DB1245281100002: "aep-central",
  ELSQL01DB1245281100003: "aep-north",
  ELSQL01DB1245281100008: "tnmp",
};

interface UpstreamCompany {
  company_id?: string;
  company_name?: string;
}

/** Pull a valid 5-digit ZIP out of the request body, or null. */
export function readZip(rawBody: unknown): string | null {
  let body = rawBody;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return null;
    }
  }
  if (typeof body !== "object" || body === null) return null;
  const zip = (body as Record<string, unknown>).zip;
  return typeof zip === "string" && /^\d{5}$/.test(zip) ? zip : null;
}

/** Map upstream records to app areas: drop unknown IDs, dedupe by code. */
export function toAreas(companies: UpstreamCompany[]): UtilityArea[] {
  const seen = new Set<TduId>();
  const areas: UtilityArea[] = [];
  for (const company of companies) {
    const code = company.company_id
      ? COMPANY_ID_TO_TDU[company.company_id]
      : undefined;
    if (!code || seen.has(code)) continue;
    seen.add(code);
    areas.push({ code, name: company.company_name?.trim() || code });
  }
  return areas;
}

async function fetchUpstream(zip: string): Promise<UpstreamCompany[]> {
  const response = await fetch(POWER_TO_CHOOSE_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      // This call needs the language cookie; the `plans` call does not. That
      // asymmetry is real (blueprint §5), not an oversight.
      Cookie: "PowerToChoose.CurrentLanguage=en-US",
    },
    body: JSON.stringify({
      method: "TduCompaniesByZip",
      zip_code: zip,
      include_details: false,
      language: 0,
    }),
  });

  // Guard non-JSON (e.g. a Cloudflare challenge page) — treat as "no match"
  // rather than throwing a 500.
  const text = await response.text();
  try {
    const parsed: unknown = JSON.parse(text);
    return Array.isArray(parsed) ? (parsed as UpstreamCompany[]) : [];
  } catch {
    return [];
  }
}

// Dev-only fallback: powertochoose.org is Cloudflare-blocked from many
// networks. When this is not a deployed environment and the live call returned
// nothing, serve a small documented fixture so the frontend flow is usable
// locally. Responses are tagged `source` so a fixture is never mistaken for a
// live result. See api/__fixtures__/zip-lookup.json.
function fixturesAllowedHere(): boolean {
  const env = process.env.VERCEL_ENV;
  return env === undefined || env === "development";
}

async function fixtureAreas(zip: string): Promise<UtilityArea[] | null> {
  try {
    const path = new URL("./__fixtures__/zip-lookup.json", import.meta.url);
    const data: unknown = JSON.parse(await readFile(path, "utf8"));
    if (typeof data !== "object" || data === null) return null;
    const entry = (data as Record<string, unknown>)[zip];
    return Array.isArray(entry) ? (entry as UtilityArea[]) : null;
  } catch {
    return null;
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST" });
    return;
  }

  const zip = readZip(req.body);
  if (!zip) {
    res.status(400).json({ error: 'Body must be { "zip": "#####" }' });
    return;
  }

  let companies = toAreas(await fetchUpstream(zip));
  let source = "powertochoose";

  if (companies.length === 0 && fixturesAllowedHere()) {
    const fixture = await fixtureAreas(zip);
    if (fixture) {
      companies = fixture;
      source = "fixture";
    }
  }

  const body: ZipLookupResponse & { source: string } = { companies, source };
  res.status(200).json(body);
}
