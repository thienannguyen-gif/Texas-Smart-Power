// One-off 2x2: how much do the price factor and the term scoring each move the top of the list?
//
//   node scripts/analyze-term-and-price.mjs [tdu] [--plan "<plan name fragment>"]
//
//   price factor   old = the app's S_price (5/12) + S_slope (3/12), as scorePlans does today
//                  new = S_cost at k = 1 (8/12), from the 12 EIA-weighted bills at u0 = 1125
//   term scoring   old = the app's term-point table
//                  new = S_term = 10 * min(L, 12) / 12
//
// S_fee and S_green are the app's own values in all four cells. Reads the newest
// plans/<tdu>-*.json from Vercel Blob (token from .env.local, read-only). Changes
// nothing in the app: ranking.ts is only imported. Writes analysis/term-and-price.csv
// (git-ignored).
//
// Nothing here is the formula in docs/BRIEF.md; both "new" factors are proposals under test.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { list } from "@vercel/blob";
import { tsImport } from "tsx/esm/api";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const parentURL = pathToFileURL(root + "/").href;
const { scorePlans } = await tsImport("./frontend/src/lib/ranking.ts", {
  parentURL,
});
const { parseExitFee } = await tsImport(
  "./frontend/src/lib/cancellationFee.ts",
  { parentURL },
);

const args = process.argv.slice(2);
const planFlag = args.indexOf("--plan");
const planQuery = planFlag >= 0 ? args[planFlag + 1] : null;
const tdu =
  args.find((a, i) => !a.startsWith("--") && i !== planFlag + 1) ?? "oncor";

const U0 = 1125;
const K = 1;
const FEE_REF = 395;
const EPS = 1e-9;
const MULT = [
  0.9931, 0.8903, 0.7898, 0.7223, 0.8896, 1.176, 1.3954, 1.4299, 1.2153, 0.9297,
  0.7336, 0.8351,
];

// ---------- data ----------
let env;
try {
  env = readFileSync(resolve(root, ".env.local"), "utf8");
} catch {
  console.error(
    "Could not find .env.local (run `npx vercel env pull .env.local`).",
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

const stored = file.plans ?? [];
const touStored = file.timeOfUsePlans ?? [];
const candidates = stored.filter((p) => !p.isTimeOfUse);
const hasAnchors = (p) =>
  [p.pricePerKwh?.at500, p.pricePerKwh?.at1000, p.pricePerKwh?.at2000].every(
    (v) => typeof v === "number" && Number.isFinite(v),
  );
const withAnchors = candidates.filter(hasAnchors);
const scored = scorePlans(withAnchors);

console.log("DATA");
console.log(`  Blob file        ${latest.pathname}`);
console.log(`  uploadedAt       ${new Date(latest.uploadedAt).toISOString()}`);
console.log(`  file.generatedAt ${file.generatedAt}`);
console.log(
  `  plans in file    ${stored.length} ranked + ${touStored.length} time-of-use = ${stored.length + touStored.length}`,
);
console.log(
  `  removed          time-of-use ${touStored.length + stored.length - candidates.length}, missing anchor ${candidates.length - withAnchors.length}, minimum_usage n/a (field not stored)`,
);
console.log(`  analysed         ${scored.length} plans`);

// ---------- cost model (same as analyze-k-sensitivity.mjs) ----------
function costAt(r, u) {
  const c500 = r.r500 * 5;
  const c1000 = r.r1000 * 10;
  const c2000 = r.r2000 * 20;
  const m1 = (c1000 - c500) / 500;
  const m2 = (c2000 - c1000) / 1000;
  if (u < 500) return Math.max(0, c500 - m1 * (500 - u));
  if (u <= 1000) return c500 + m1 * (u - 500);
  if (u <= 2000) return c1000 + m2 * (u - 1000);
  return c2000 + m2 * (u - 2000);
}

const rows = scored.map(({ plan, breakdown }, storedIndex) => {
  const p = plan.pricePerKwh;
  const r = {
    r500: p.at500 * 100,
    r1000: p.at1000 * 100,
    r2000: p.at2000 * 100,
  };
  const bills = MULT.map((s) => costAt(r, U0 * s));
  const E = bills.reduce((a, b) => a + b, 0) / bills.length;
  const semiSd = Math.sqrt(
    bills.filter((b) => b > E).reduce((a, b) => a + (b - E) ** 2, 0) / 12,
  );
  const fee = parseExitFee(plan.pricingDetails, plan.termMonths);
  const L = plan.termMonths;
  return {
    storedIndex,
    plan,
    fee,
    E,
    semiSd,
    CE: E + K * semiSd,
    sPriceOld: breakdown.price,
    sSlopeOld: breakdown.slope,
    sTermOld: breakdown.term,
    sTermNew: (10 * Math.min(L, 12)) / 12,
    sFee: breakdown.fee, // the app's own S_fee: unchanged in every cell
    sFeeLiteral: 10 * (1 - Math.min(fee, FEE_REF) / FEE_REF),
    sGreen: breakdown.green,
    appTotal: breakdown.total,
  };
});

// ---------- the four cells ----------
const CELLS = [
  { id: "old-price/old-term", price: "old", term: "old" },
  { id: "old-price/new-term", price: "old", term: "new" },
  { id: "new-price/old-term", price: "new", term: "old" },
  { id: "new-price/new-term", price: "new", term: "new" },
];

function runCell(cell) {
  const sTerm = (r) => (cell.term === "old" ? r.sTermOld : r.sTermNew);
  const sFlex = (r) => 0.5 * sTerm(r) + 0.5 * r.sFee;
  let sCost = () => 0;
  if (cell.price === "new") {
    const lo = Math.min(...rows.map((r) => r.CE));
    const hi = Math.max(...rows.map((r) => r.CE));
    const flat = hi - lo < EPS;
    sCost = (r) => (flat ? 10 : (10 * (hi - r.CE)) / (hi - lo));
  }
  const out = rows.map((r) => {
    const flex = sFlex(r);
    const cost = sCost(r);
    const score =
      cell.price === "old"
        ? (5 * r.sPriceOld + 3 * r.sSlopeOld + 3 * flex + 1 * r.sGreen) / 12
        : (8 * cost + 3 * flex + 1 * r.sGreen) / 12;
    return { row: r, score, sTerm: sTerm(r), sFlex: flex, sCost: cost };
  });
  // best first; ties keep the stored (app) order
  out.sort(
    (a, b) => b.score - a.score || a.row.storedIndex - b.row.storedIndex,
  );
  out.forEach((o, i) => (o.rank = i + 1));
  return out;
}
const results = new Map(CELLS.map((c) => [c.id, runCell(c)]));

// sanity: the old/old cell must reproduce the app's own total and order
const oo = results.get("old-price/old-term");
const maxDiff = Math.max(...oo.map((o) => Math.abs(o.score - o.row.appTotal)));
const sameOrder = oo.every((o, i) => o.row.storedIndex === i);
const feeDiff = Math.max(...rows.map((r) => Math.abs(r.sFee - r.sFeeLiteral)));
const maxFeeSeen = Math.max(...rows.map((r) => r.fee));
console.log("");
console.log("CHECKS");
console.log(
  `  old/old cell vs scorePlans: max |score - app total| = ${maxDiff.toExponential(2)}; same order as the stored list: ${sameOrder}`,
);
console.log(
  `  S_fee: app (relative to the highest fee in the data, ${maxFeeSeen}) vs literal 10*(1-min(fee,395)/395): max difference ${feeDiff.toFixed(4)}`,
);
console.log(
  feeDiff < 1e-9
    ? "  -> identical on this data, so using the app's S_fee is the same as your formula"
    : "  -> NOT identical; the app's S_fee (BRIEF: data-driven max) is used in every cell",
);

// ---------- the instructor's plan ----------
const twelve = oo.filter((o) => o.row.plan.termMonths === 12);
let target;
if (planQuery) {
  target = oo.find((o) =>
    `${o.row.plan.planName} ${o.row.plan.companyName}`
      .toLowerCase()
      .includes(planQuery.toLowerCase()),
  );
  if (!target) {
    console.error(`No plan matches "${planQuery}".`);
    process.exit(1);
  }
}

// ---------- reports ----------
const f1 = (n) => n.toFixed(1);
const f2 = (n) => n.toFixed(2);
const f3 = (n) => n.toFixed(3);
const pad = (s, n) => String(s).slice(0, n).padEnd(n);
const padL = (s, n) => String(s).padStart(n);
const feeText = (r) => (r.fee === null ? "?" : `$${r.fee}`);
const termMix = (top) => {
  const t = (o) => o.row.plan.termMonths;
  return {
    3: top.filter((o) => t(o) === 3).length,
    6: top.filter((o) => t(o) === 6).length,
    12: top.filter((o) => t(o) === 12).length,
    over12: top.filter((o) => t(o) > 12).length,
    other: top.filter((o) => ![3, 6, 12].includes(t(o)) && t(o) <= 12).length,
  };
};

for (const cell of CELLS) {
  const res = results.get(cell.id);
  const newPrice = cell.price === "new";
  console.log("");
  console.log(
    `=== CELL ${cell.id}: price ${cell.price}, term ${cell.term} ===`,
  );
  console.log(
    ` ${padL("#", 2)}  ${pad("plan", 28)} ${pad("provider", 18)} ${padL("term", 4)} ${padL("fee", 5)} ${padL("score", 6)} ${newPrice ? `${padL("S_cost", 6)} ` : `${padL("S_prc", 5)} ${padL("S_slp", 5)} `}${padL("S_trm", 5)} ${padL("S_fee", 5)} ${padL("S_flx", 5)} ${padL("S_grn", 5)}${newPrice ? `  ${padL("E", 7)} ${padL("semiSd", 7)}` : ""}`,
  );
  for (const o of res.slice(0, 10)) {
    const r = o.row;
    console.log(
      ` ${padL(o.rank, 2)}  ${pad(r.plan.planName, 28)} ${pad(r.plan.companyName, 18)} ${padL(r.plan.termMonths ?? "-", 4)} ${padL(feeText(r), 5)} ${padL(f3(o.score), 6)} ${newPrice ? `${padL(f2(o.sCost), 6)} ` : `${padL(f1(r.sPriceOld), 5)} ${padL(f1(r.sSlopeOld), 5)} `}${padL(f1(o.sTerm), 5)} ${padL(f1(r.sFee), 5)} ${padL(f1(o.sFlex), 5)} ${padL(f1(r.sGreen), 5)}${newPrice ? `  ${padL(f2(r.E), 7)} ${padL(f2(r.semiSd), 7)}` : ""}`,
    );
  }
  const mix = termMix(res.slice(0, 10));
  console.log(
    `  term mix of the top 10: 3 mo ${mix[3]}, 6 mo ${mix[6]}, 12 mo ${mix[12]}, over 12 mo ${mix.over12}${mix.other ? `, other under 12 ${mix.other}` : ""}`,
  );
}

console.log("");
console.log("=== THE INSTRUCTOR'S 12-MONTH PLAN ===");
if (target) {
  console.log(
    `  looked up by --plan "${planQuery}": ${target.row.plan.planName} (${target.row.plan.companyName})`,
  );
} else {
  console.log(
    "  No plan name was given, so none can be looked up by name. 12-month plans around #7 in the old/old cell:",
  );
  for (const o of twelve.filter((x) => x.rank >= 3 && x.rank <= 15)) {
    console.log(
      `    #${o.rank} ${o.row.plan.planName} (${o.row.plan.companyName})`,
    );
  }
}
const showTargets = target
  ? [target]
  : twelve.filter((x) => x.rank >= 5 && x.rank <= 9);
for (const t of showTargets) {
  const ranks = CELLS.map((c) => {
    const o = results.get(c.id).find((x) => x.row.plan.id === t.row.plan.id);
    return `${c.id} #${o.rank}`;
  });
  console.log(
    `  ${t.row.plan.planName} (${t.row.plan.companyName}): ${ranks.join(" | ")}`,
  );
}

console.log("");
console.log(
  "=== TOP 20 WITH A TERM OF 24 MONTHS OR MORE (new S_term cells) ===",
);
for (const cell of CELLS.filter((c) => c.term === "new")) {
  const hits = results
    .get(cell.id)
    .slice(0, 20)
    .filter((o) => o.row.plan.termMonths >= 24);
  console.log(`  ${cell.id}:`);
  if (hits.length === 0) {
    console.log(
      "    none: no plan with a term of 24 months or more is in the top 20",
    );
  }
  for (const o of hits) {
    console.log(
      `    #${o.rank} ${o.row.plan.planName} (${o.row.plan.companyName}): term ${o.row.plan.termMonths}, fee ${feeText(o.row)}, S_flex ${f2(o.sFlex)} (S_term ${f1(o.sTerm)}, S_fee ${f1(o.row.sFee)})`,
    );
  }
}

// ---------- attribution ----------
const topSet = (id) =>
  new Set(
    results
      .get(id)
      .slice(0, 10)
      .map((o) => o.row.plan.id),
  );
const diff = (a, b) => [...topSet(a)].filter((id) => !topSet(b).has(id)).length;
const meanAbsRank = (a, b) => {
  const rb = new Map(results.get(b).map((o) => [o.row.plan.id, o.rank]));
  const v = results.get(a).map((o) => Math.abs(o.rank - rb.get(o.row.plan.id)));
  return v.reduce((x, y) => x + y, 0) / v.length;
};
console.log("");
console.log(
  "=== ATTRIBUTION (top 10 plans that differ / mean absolute rank change over all plans) ===",
);
const pairs = [
  ["price only, old term", "old-price/old-term", "new-price/old-term"],
  ["price only, new term", "old-price/new-term", "new-price/new-term"],
  ["term only, old price", "old-price/old-term", "old-price/new-term"],
  ["term only, new price", "new-price/old-term", "new-price/new-term"],
  ["both", "old-price/old-term", "new-price/new-term"],
];
for (const [label, a, b] of pairs) {
  console.log(
    `  ${pad(label, 24)} ${diff(b, a)} of 10 plans enter the top 10 | mean rank change ${f1(meanAbsRank(a, b))}`,
  );
}

// ---------- CSV ----------
const header = [
  "cell",
  "price",
  "term",
  "rank",
  "plan_id",
  "plan_name",
  "provider",
  "term_months",
  "cancel_fee",
  "score",
  "s_price_old",
  "s_slope_old",
  "s_cost_new",
  "s_term",
  "s_fee",
  "s_flex",
  "s_green",
  "e",
  "semi_sd",
  "ce",
];
const q = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const r4 = (n) => Math.round(n * 1e4) / 1e4;
const lines = [header.join(",")];
for (const cell of CELLS) {
  for (const o of results.get(cell.id)) {
    const r = o.row;
    lines.push(
      [
        cell.id,
        cell.price,
        cell.term,
        o.rank,
        r.plan.id,
        r.plan.planName,
        r.plan.companyName,
        r.plan.termMonths,
        r.fee,
        r4(o.score),
        r4(r.sPriceOld),
        r4(r.sSlopeOld),
        cell.price === "new" ? r4(o.sCost) : "",
        r4(o.sTerm),
        r4(r.sFee),
        r4(o.sFlex),
        r4(r.sGreen),
        r4(r.E),
        r4(r.semiSd),
        r4(r.CE),
      ]
        .map(q)
        .join(","),
    );
  }
}
mkdirSync(resolve(root, "analysis"), { recursive: true });
const out = resolve(root, "analysis", "term-and-price.csv");
writeFileSync(out, lines.join("\n") + "\n");
console.log("");
console.log(
  `WROTE ${out} (${lines.length - 1} rows: ${rows.length} plans x ${CELLS.length} cells)`,
);
