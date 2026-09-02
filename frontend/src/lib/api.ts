import type { TduDataFile, TduId } from "../types/plan";
import type { UtilityArea, ZipLookupResponse } from "../types/zip";

// The browser always goes through /api/plans/:tdu (never Blob directly). That
// route 307-redirects to the current Blob file for the area; fetch follows the
// redirect on its own.
export async function fetchTduPlans(
  tdu: TduId,
  signal?: AbortSignal,
): Promise<TduDataFile> {
  const response = await fetch(`/api/plans/${tdu}`, { signal });

  if (response.status === 404) {
    // No data file for this area yet — a real "empty" case, not an error.
    return {
      tdu,
      generatedAt: new Date().toISOString(),
      planCount: 0,
      plans: [],
    };
  }
  if (!response.ok) {
    throw new Error(`Plan data request failed (HTTP ${response.status})`);
  }

  const data: unknown = await response.json();
  if (!isTduDataFile(data)) {
    throw new Error("Plan data response was not in the expected shape");
  }
  return data;
}

function isTduDataFile(value: unknown): value is TduDataFile {
  if (typeof value !== "object" || value === null) return false;
  const file = value as Record<string, unknown>;
  return (
    typeof file.tdu === "string" &&
    typeof file.generatedAt === "string" &&
    typeof file.planCount === "number" &&
    Array.isArray(file.plans)
  );
}

// POST /api/zip-lookup — { zip } -> the utility area(s) that ZIP falls in.
// A ZIP can span two utility territories, so the result is a list; the caller
// shows a picker when it has more than one item (blueprint §5).
export async function lookupZip(
  zip: string,
  signal?: AbortSignal,
): Promise<UtilityArea[]> {
  const response = await fetch("/api/zip-lookup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ zip }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`ZIP lookup failed (HTTP ${response.status})`);
  }

  const data: unknown = await response.json();
  if (!isZipLookupResponse(data)) {
    throw new Error("ZIP lookup response was not in the expected shape");
  }
  return data.companies;
}

function isZipLookupResponse(value: unknown): value is ZipLookupResponse {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Record<string, unknown>;
  if (!Array.isArray(body.companies)) return false;
  return body.companies.every(
    (company) =>
      typeof company === "object" &&
      company !== null &&
      typeof (company as UtilityArea).code === "string" &&
      typeof (company as UtilityArea).name === "string",
  );
}
