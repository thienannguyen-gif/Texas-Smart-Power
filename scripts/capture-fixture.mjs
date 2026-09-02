// Capture a REAL Power to Choose `plans` response and save it verbatim as a
// local fixture. Run this from a network where powertochoose.org is reachable
// (it is behind Cloudflare and 403s from many places). Do NOT hand-edit the
// saved file or invent fields — this script exists so the fixture is an
// observed response, not a guess (docs/student-build-guide.md §4, §6).
//
//   node scripts/capture-fixture.mjs            # all six TDUs
//   node scripts/capture-fixture.mjs oncor      # just one
//
// Output: pipeline/__fixtures__/plans.<tdu>.raw.json  (the raw JSON array)
//         pipeline/__fixtures__/CAPTURE-LOG.md         (request + date + result)

import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(__dirname, "..", "pipeline", "__fixtures__");

const URL = "https://www.powertochoose.org/en-us/service/v1/";

// Anchor ZIPs — one per TDU, each fully inside that utility's territory
// (architecture-blueprint.md §5).
const ANCHOR_ZIP = {
  oncor: "75201",
  centerpoint: "77002",
  "aep-central": "78401",
  "aep-north": "79601",
  tnmp: "75067",
  lubbock: "79424",
};

// The request body, verbatim from architecture-blueprint.md §5. Do not tweak.
const requestBody = (zip) => ({
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
});

const targets = process.argv[2] ? [process.argv[2]] : Object.keys(ANCHOR_ZIP);

for (const tdu of targets) {
  const zip = ANCHOR_ZIP[tdu];
  if (!zip) {
    console.error(
      `Unknown TDU "${tdu}". One of: ${Object.keys(ANCHOR_ZIP).join(", ")}`,
    );
    process.exit(1);
  }

  process.stdout.write(`${tdu} (ZIP ${zip}) ... `);

  let res, text;
  try {
    res = await fetch(URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(requestBody(zip)),
    });
    text = await res.text();
  } catch (err) {
    console.log(`FAILED (${err.message})`);
    continue;
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.log(
      `FAILED — HTTP ${res.status}, non-JSON (likely Cloudflare block). ` +
        `First 80 chars: ${text.slice(0, 80).replace(/\s+/g, " ")}`,
    );
    continue;
  }

  if (!Array.isArray(parsed)) {
    console.log(`FAILED — HTTP ${res.status}, JSON but not an array`);
    continue;
  }

  const outFile = resolve(fixturesDir, `plans.${tdu}.raw.json`);
  await writeFile(outFile, `${JSON.stringify(parsed, null, 2)}\n`);

  const logLine =
    `- **${tdu}** — ${new Date().toISOString()} — ` +
    `POST ${URL} zip_code=${zip} — HTTP ${res.status} — ` +
    `${parsed.length} records — saved plans.${tdu}.raw.json\n`;
  const logFile = resolve(fixturesDir, "CAPTURE-LOG.md");
  let existing = "";
  try {
    existing = await readFile(logFile, "utf8");
  } catch {
    existing =
      "# Fixture capture log\n\nEach line is one real capture from powertochoose.org.\n\n";
  }
  await writeFile(logFile, existing + logLine);

  console.log(`OK — ${parsed.length} records -> plans.${tdu}.raw.json`);
}

console.log(
  "\nDone. Review a saved file against architecture-blueprint.md §5 — if any " +
    "field name differs, the blueprint (and RawPlan) is what needs updating.",
);
