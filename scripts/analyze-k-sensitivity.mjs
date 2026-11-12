// One-off check: does the ranking depend on k, the risk weight in CE = E + k * semiSd?
//
//   node scripts/analyze-k-sensitivity.mjs [tdu]      (default: oncor)
//
// Reads the newest plans/<tdu>-*.json from Vercel Blob (token from .env.local,
// read-only), scores every plan under an alternative cost model at several k,
// and prints how the top of the list moves. It changes nothing in the app:
// ranking.ts is only imported, to reuse its S_flex and S_green.
//
// Writes analysis/k-sensitivity.csv (git-ignored): every plan at every k.
//
// NOTE: the score here is (8 S_cost + 3 S_flex + 1 S_green) / 12, a proposal under
// test. It is NOT the formula in docs/BRIEF.md / ranking.ts (5/12 price, 3/12
// slope, 3/12 flexibility, 1/12 green), and nothing here is used by the app.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { list } from "@vercel/blob";
import { tsImport } from "tsx/esm/api";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { scorePlans } = await tsImport("./frontend/src/lib/ranking.ts", {
  parentURL: pathToFileURL(root + "/").href,
});

const tdu = process.argv[2] ?? "oncor";
const KS = [0.2, 0.3, 0.5, 0.7, 1.0];
const U0 = 1125;
// EIA Form 861M, Texas residential, 2020-2025 (month 1..12)
const MULT = [
  0.9931, 0.8903, 0.7898, 0.7223, 0.8896, 1.176, 1.3954, 1.4299, 1.2153, 0.9297,
  0.7336, 0.8351,
];
const EPS = 1e-9;

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
// A file written before the split keeps time-of-use plans inside `plans`.
const touInPlans = stored.filter((p) => p.isTimeOfUse);
const candidates = stored.filter((p) => !p.isTimeOfUse);

const hasAnchors = (p) =>
  [p.pricePerKwh?.at500, p.pricePerKwh?.at1000, p.pricePerKwh?.at2000].every(
    (v) => typeof v === "number" && Number.isFinite(v),
  );
const withAnchors = candidates.filter(hasAnchors);
const missingAnchors = candidates.length - withAnchors.length;

// S_flex and S_green come from the app's own scoring (ranking.ts), so they are
// the real values, including max_fee taken over the eligible plans.
const scored = scorePlans(withAnchors);
const notScoredByApp = withAnchors.length - scored.length;

console.log("DATA");
console.log(`  Blob file        ${latest.pathname}`);
console.log(`  uploadedAt       ${new Date(latest.uploadedAt).toISOString()}`);
console.log(`  file.generatedAt ${file.generatedAt}`);
console.log(
  `  plans in file    ${stored.length} ranked + ${touStored.length} time-of-use = ${stored.length + touStored.length}`,
);
console.log("EXCLUSIONS (same three rules as the brief)");
console.log(
  "  minimum_usage    not applicable: the stored plan has no minimum_usage field",
);
console.log(
  "                   (upstream sends a boolean, and the pipeline never carries it),",
);
console.log(
  "                   so 0 can be removed and the rule cannot be checked from Blob",
);
console.log(
  `  time-of-use      ${touStored.length + touInPlans.length} removed (listed separately in the file)`,
);
console.log(
  `  missing anchor   ${missingAnchors} removed (the pipeline already dropped any earlier)`,
);
if (notScoredByApp > 0) {
  console.log(
    `  not scorable by ranking.ts (fee / term / renewable unreadable): ${notScoredByApp} removed`,
  );
}
console.log(`  analysed         ${scored.length} plans`);
console.log("");

// ---------- cost model ----------
// r* are cents/kWh; the bill comes out in dollars.
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

const rows = scored.map(({ plan, breakdown }, index) => {
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
  return {
    index,
    plan,
    E,
    semiSd,
    sFlex: breakdown.flexibility,
    sGreen: breakdown.green,
    bill1125: costAt(r, U0),
  };
});

// ---------- score at each k (normalised separately per k) ----------
function scoreAt(k) {
  const ce = rows.map((row) => row.E + k * row.semiSd);
  const lo = Math.min(...ce);
  const hi = Math.max(...ce);
  const flat = hi - lo < EPS;
  const out = rows.map((row, i) => {
    const sCost = flat ? 10 : (10 * (hi - ce[i])) / (hi - lo);
    const score = (8 * sCost + 3 * row.sFlex + 1 * row.sGreen) / 12;
    return { row, ce: ce[i], sCost, score };
  });
  // best score first; ties keep the stored (app) order
  out.sort((a, b) => b.score - a.score || a.row.index - b.row.index);
  out.forEach((o, i) => (o.rank = i + 1));
  return out;
}
const byK = new Map(KS.map((k) => [k, scoreAt(k)]));
const rankOf = (k) => new Map(byK.get(k).map((o) => [o.row.plan.id, o.rank]));

const f2 = (n) => n.toFixed(2);
const f3 = (n) => n.toFixed(3);
const pad = (s, n) => String(s).slice(0, n).padEnd(n);
const padL = (s, n) => String(s).padStart(n);
const name = (o) => `${o.row.plan.planName} (${o.row.plan.companyName})`;

// ---------- 1. top 10 at each k ----------
for (const k of KS) {
  console.log(`TOP 10 AT k = ${k}`);
  console.log(
    ` ${padL("#", 2)}  ${pad("plan", 30)} ${pad("provider", 22)} ${padL("term", 4)} ${padL("score", 6)} ${padL("CE", 7)} ${padL("E", 7)} ${padL("semiSd", 7)} ${padL("bill@1125", 9)}`,
  );
  for (const o of byK.get(k).slice(0, 10)) {
    console.log(
      ` ${padL(o.rank, 2)}  ${pad(o.row.plan.planName, 30)} ${pad(o.row.plan.companyName, 22)} ${padL(o.row.plan.termMonths ?? "-", 4)} ${padL(f3(o.score), 6)} ${padL(f2(o.ce), 7)} ${padL(f2(o.row.E), 7)} ${padL(f2(o.row.semiSd), 7)} ${padL(f2(o.row.bill1125), 9)}`,
    );
  }
  console.log("");
}

// ---------- 2. stability ----------
const topIds = (k) =>
  new Set(
    byK
      .get(k)
      .slice(0, 10)
      .map((o) => o.row.plan.id),
  );
const planById = new Map(rows.map((row) => [row.plan.id, row.plan]));
const label = (id) =>
  `${planById.get(id).planName} (${planById.get(id).companyName})`;
const inAll = [...topIds(KS[0])].filter((id) =>
  KS.every((k) => topIds(k).has(id)),
);
console.log("STABILITY ACROSS k");
console.log(`  in the top 10 at every k: ${inAll.length} of 10`);
for (let i = 1; i < KS.length; i++) {
  const a = topIds(KS[i - 1]);
  const b = topIds(KS[i]);
  const entered = [...b].filter((id) => !a.has(id));
  const left = [...a].filter((id) => !b.has(id));
  const text =
    entered.length + left.length === 0
      ? "no change"
      : `in: ${entered.map(label).join(", ") || "none"}; out: ${left.map(label).join(", ") || "none"}`;
  console.log(`  k ${KS[i - 1]} -> ${KS[i]}: ${text}`);
}
const r02 = rankOf(KS[0]);
const r10 = rankOf(KS[KS.length - 1]);
let biggest = { id: null, change: -1 };
for (const [id, rank] of r02) {
  const change = Math.abs(rank - r10.get(id));
  if (change > biggest.change) biggest = { id, change };
}
console.log(
  `  largest rank change k 0.2 -> 1.0: ${biggest.change} places (${label(biggest.id)}: #${r02.get(biggest.id)} -> #${r10.get(biggest.id)})`,
);
function spearman(ka, kb) {
  const ra = rankOf(ka);
  const rb = rankOf(kb);
  const ids = [...ra.keys()];
  const xs = ids.map((id) => ra.get(id));
  const ys = ids.map((id) => rb.get(id));
  const mean = (v) => v.reduce((a, b) => a + b, 0) / v.length;
  const mx = mean(xs);
  const my = mean(ys);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < xs.length; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  return sxy / Math.sqrt(sxx * syy);
}
console.log(
  `  Spearman rank correlation, k 0.5 vs 1.0: ${spearman(0.5, 1.0).toFixed(4)}`,
);
console.log("");

// ---------- 3. crossover of the top two at k = 0.7 ----------
const top07 = byK.get(0.7);
const [A, B] = [top07[0], top07[1]];
console.log("CROSSOVER OF THE TOP TWO AT k = 0.7");
console.log(
  `  #1 ${name(A)}: E ${f2(A.row.E)}, semiSd ${f2(A.row.semiSd)}, score ${f3(A.score)}`,
);
console.log(
  `  #2 ${name(B)}: E ${f2(B.row.E)}, semiSd ${f2(B.row.semiSd)}, score ${f3(B.score)}`,
);
const dS = A.row.semiSd - B.row.semiSd;
if (Math.abs(dS) < EPS) {
  console.log(
    "  semiSd is equal, so their CE lines never cross (the gap is E alone).",
  );
} else {
  const kStar = (B.row.E - A.row.E) / dS;
  const inside = kStar >= 0.2 && kStar <= 1.0;
  console.log(
    `  CE crossover: E1 + k*s1 = E2 + k*s2  ->  k = ${kStar.toFixed(4)}`,
  );
  console.log(
    inside
      ? "  This falls INSIDE 0.2-1.0: the CE order of these two flips within the range."
      : "  This falls OUTSIDE 0.2-1.0: within the range their CE order never flips (headline result).",
  );
}
// The ranking is by score, not CE alone, so also scan for where the order flips.
const order = (k) => {
  const sc = scoreAt(k);
  return sc.findIndex((o) => o.row.plan.id === A.row.plan.id) <
    sc.findIndex((o) => o.row.plan.id === B.row.plan.id)
    ? "A"
    : "B";
};
let flip = null;
for (let k = 0; k <= 3.0001; k += 0.01) {
  if (order(k) !== order(0.7)) {
    flip = Math.round(k * 100) / 100;
    break;
  }
}
console.log(
  flip === null
    ? "  By score (S_flex and S_green included) their order does not flip anywhere in k = 0 to 3."
    : `  By score, their order first differs from the k = 0.7 order at k = ${flip}.`,
);
console.log("");

// ---------- 4. CSV ----------
const header = [
  "k",
  "rank",
  "plan_id",
  "plan_name",
  "provider",
  "term_months",
  "score",
  "s_cost",
  "s_flex",
  "s_green",
  "ce",
  "e",
  "semi_sd",
  "bill_1125",
];
const q = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const lines = [header.join(",")];
for (const k of KS) {
  for (const o of byK.get(k)) {
    const r4 = (n) => Math.round(n * 1e4) / 1e4;
    lines.push(
      [
        k,
        o.rank,
        o.row.plan.id,
        o.row.plan.planName,
        o.row.plan.companyName,
        o.row.plan.termMonths,
        r4(o.score),
        r4(o.sCost),
        r4(o.row.sFlex),
        r4(o.row.sGreen),
        r4(o.ce),
        r4(o.row.E),
        r4(o.row.semiSd),
        r4(o.row.bill1125),
      ]
        .map(q)
        .join(","),
    );
  }
}
mkdirSync(resolve(root, "analysis"), { recursive: true });
const out = resolve(root, "analysis", "k-sensitivity.csv");
writeFileSync(out, lines.join("\n") + "\n");
console.log(
  `WROTE ${out} (${lines.length - 1} rows: ${rows.length} plans x ${KS.length} k)`,
);
