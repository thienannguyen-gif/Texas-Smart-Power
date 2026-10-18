// Export one TDU's ranking breakdown to CSV for checking the formula by hand.
//
//   node scripts/export-scores.mjs [tdu]      (default: oncor)
//
// Reads the newest plans/<tdu>-*.json from Vercel Blob (token from .env.local),
// scores it with the real ranking library, and writes
//   exports/scores-<tdu>-<date>.csv             one row per plan
//   exports/scores-<tdu>-<date>-constants.csv   normalisation constants
// Values are raw (no currency/percent formatting), rounded to at most 4 dp.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { list } from "@vercel/blob";
import { tsImport } from "tsx/esm/api";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const lib = (name) =>
  tsImport(`./frontend/src/lib/${name}.ts`, {
    parentURL: pathToFileURL(root + "/").href,
  });

const { scorePlans } = await lib("ranking");
const { parseExitFee } = await lib("cancellationFee");
const { renewablePct } = await lib("filters");

const tdu = process.argv[2] ?? "oncor";

let env;
try {
  env = readFileSync(resolve(root, ".env.local"), "utf8");
} catch {
  console.error(
    "Could not find .env.local — run `npx vercel env pull .env.local`.",
  );
  process.exit(1);
}
const token = env.match(/^BLOB_READ_WRITE_TOKEN="?([^"\n]+)"?$/m)?.[1];
if (!token) {
  console.error("BLOB_READ_WRITE_TOKEN not found in .env.local.");
  process.exit(1);
}

const { blobs } = await list({ prefix: `plans/${tdu}-`, token });
if (blobs.length === 0) {
  console.error(`No Blob data for "${tdu}".`);
  process.exit(1);
}
const latest = blobs.reduce((a, b) => (b.uploadedAt > a.uploadedAt ? b : a));
const file = await (await fetch(latest.url)).json();

const scored = scorePlans(file.plans);
if (scored.length === 0) {
  console.error(`No eligible plans for "${tdu}".`);
  process.exit(1);
}

// Weights from docs/BRIEF.md §3 (not exported by ranking.ts). The check below
// aborts if they ever drift from what the library actually computes.
const W = { price: 5 / 12, slope: 3 / 12, flex: 3 / 12, green: 1 / 12 };

const r4 = (n) => (n === null ? "" : String(Math.round(n * 1e4) / 1e4));
const csv = (v) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const rows = scored.map(({ plan, breakdown: b }, i) => {
  const p = plan.pricePerKwh;
  const vTrap = p.at1000 < p.at2000;
  const hump = p.at1000 > p.at500;
  const trapType =
    vTrap && hump ? "both" : vTrap ? "v_trap" : hump ? "hump" : "";
  const w = {
    price: W.price * b.price,
    slope: W.slope * b.slope,
    flex: W.flex * b.flexibility,
    green: W.green * b.green,
  };
  if (Math.abs(w.price + w.slope + w.flex + w.green - b.total) > 1e-9) {
    console.error(
      `Weights in this script disagree with ranking.ts (plan ${plan.id}). Aborting.`,
    );
    process.exit(1);
  }
  return {
    cells: [
      i + 1,
      plan.planName,
      plan.companyName,
      plan.termMonths,
      r4(p.at500),
      r4(p.at1000),
      r4(p.at2000),
      r4(parseExitFee(plan.pricingDetails, plan.termMonths)),
      r4(renewablePct(plan)),
      trapType ? 1 : 0,
      trapType,
      r4(b.price),
      r4(b.slope),
      r4(b.flexibility),
      r4(b.green),
      r4(w.price),
      r4(w.slope),
      r4(w.flex),
      r4(w.green),
      r4(b.total),
    ],
    price: p.at500,
    fee: parseExitFee(plan.pricingDetails, plan.termMonths),
  };
});

const header = [
  "rank",
  "plan_name",
  "provider",
  "term_months",
  "price_500",
  "price_1000",
  "price_2000",
  "exit_fee",
  "green_percent",
  "is_trap",
  "trap_type",
  "S_price",
  "S_slope",
  "S_flex",
  "S_green",
  "weighted_price",
  "weighted_slope",
  "weighted_flex",
  "weighted_green",
  "final_score",
];

const prices = rows.map((r) => r.price);
const fees = rows.map((r) => r.fee);
// max_slope / max_term: BRIEF.md normalises neither (slope is binary 0/10, term
// is a points table whose best entry is 10), so these are the scale caps.
const constants = {
  p_min: r4(Math.min(...prices)),
  p_max: r4(Math.max(...prices)),
  max_slope: 10,
  max_fee: r4(Math.max(...fees)),
  max_term: 10,
};

const date = new Date().toLocaleDateString("en-CA");
const outDir = resolve(root, "exports");
mkdirSync(outDir, { recursive: true });
const base = `scores-${tdu}-${date}`;
const out = resolve(outDir, `${base}.csv`);
const outConst = resolve(outDir, `${base}-constants.csv`);
writeFileSync(
  out,
  [header, ...rows.map((r) => r.cells)]
    .map((c) => c.map(csv).join(","))
    .join("\n") + "\n",
);
writeFileSync(
  outConst,
  `${Object.keys(constants).join(",")}\n${Object.values(constants).join(",")}\n`,
);

console.log(`Blob file: ${latest.pathname} (generatedAt ${file.generatedAt})`);
console.log(`${rows.length} plans -> ${out}`);
console.log(`constants -> ${outConst}`);
console.log(constants);
