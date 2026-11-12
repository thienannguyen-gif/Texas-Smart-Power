// One-off check: are the plans that carry the V-trap / Hump badge materially curved?
//
//   node scripts/analyze-curvature.mjs [tdu] [--usage 1000] [--month 10]
//
// For every plan in the newest Oncor file in Vercel Blob (read-only):
//   m1 = (c1000 - c500) / 500       marginal $/kWh below 1,000 kWh
//   m2 = (c2000 - c1000) / 1000     marginal $/kWh above 1,000 kWh
//   curvature = m2 / m1             1.0 = a perfectly flat per-kWh price
// where c500 = rate500 * 500, c1000 = rate1000 * 1000, c2000 = rate2000 * 2000 (dollars).
// Also reports each plan's fragility asymmetry (the +20% figure plus the -20% figure
// shown on the card). Changes nothing in the app.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { list } from "@vercel/blob";
import { tsImport } from "tsx/esm/api";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const parentURL = pathToFileURL(root + "/").href;
const load = (path) => tsImport(path, { parentURL });
const { rankByContractCost, currentStartMonth, MONTH_NAMES } = await load(
  "./frontend/src/lib/contractCost.ts",
);
const { priceCurveWarning } = await load("./frontend/src/lib/ranking.ts");
const { DEFAULT_USAGE_KWH } = await load("./frontend/src/lib/usage.ts");

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const tdu =
  args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--")) ??
  "oncor";
const usage =
  flag("--usage") !== null ? Number(flag("--usage")) : DEFAULT_USAGE_KWH;
const startMonth =
  flag("--month") !== null ? Number(flag("--month")) : currentStartMonth();

const token = readFileSync(resolve(root, ".env.local"), "utf8").match(
  /^BLOB_READ_WRITE_TOKEN="?([^"\n]+)"?$/m,
)?.[1];
if (!token) {
  console.error("BLOB_READ_WRITE_TOKEN not found in .env.local.");
  process.exit(1);
}
const { blobs } = await list({ prefix: `plans/${tdu}-`, token });
const latest = blobs.reduce((a, b) => (b.uploadedAt > a.uploadedAt ? b : a));
const file = await (await fetch(latest.url)).json();
const plans = (file.plans ?? []).filter((p) => !p.isTimeOfUse);

console.log(
  `Blob file   ${latest.pathname} (uploaded ${new Date(latest.uploadedAt).toISOString()})`,
);
console.log(`Plans       ${plans.length} ranked (time-of-use excluded)`);
console.log(`Usage       ${usage} kWh, start month ${MONTH_NAMES[startMonth]}`);
console.log("");

// ---------- per plan ----------
const ranked = {
  long: rankByContractCost(plans, "long", usage, startMonth),
  short: rankByContractCost(plans, "short", usage, startMonth),
};
const info = new Map();
for (const which of ["long", "short"]) {
  ranked[which].forEach(({ plan, cost }, i) => {
    info.set(plan.id, { which, rank: i + 1, cost });
  });
}

const rows = plans.map((plan) => {
  const { at500, at1000, at2000 } = plan.pricePerKwh;
  const c500 = at500 * 500;
  const c1000 = at1000 * 1000;
  const c2000 = at2000 * 2000;
  const m1 = (c1000 - c500) / 500;
  const m2 = (c2000 - c1000) / 1000;
  const c = info.get(plan.id);
  return {
    plan,
    warning: priceCurveWarning(plan),
    m1,
    m2,
    curvature: m2 / m1,
    list: c?.which ?? "-",
    rank: c?.rank ?? null,
    asymmetry: c ? c.cost.moreUsageDelta + c.cost.lessUsageDelta : null,
    more: c?.cost.moreUsageDelta ?? null,
    less: c?.cost.lessUsageDelta ?? null,
    perMonth: c?.cost.rankedPerMonth ?? null,
  };
});

const f2 = (n) => (n === null ? "n/a" : n.toFixed(2));
const f3 = (n) => (Number.isFinite(n) ? n.toFixed(3) : String(n));
const sgn = (n) =>
  n === null ? "n/a" : `${n >= 0 ? "+" : "-"}$${Math.abs(n).toFixed(2)}`;
const pad = (s, n) => String(s).slice(0, n).padEnd(n);
const padL = (s, n) => String(s).padStart(n);

// ---------- 1. the badged plans ----------
const badged = rows
  .filter((r) => r.warning !== null)
  .sort((a, b) => Math.abs(b.asymmetry ?? 0) - Math.abs(a.asymmetry ?? 0));
console.log(
  `1. PLANS WITH THE V-TRAP / HUMP BADGE (${badged.length} of ${rows.length})`,
);
console.log(
  ` ${pad("plan", 30)} ${pad("provider", 18)} ${padL("term", 4)} ${pad("badge", 6)} ${padL("rate500", 7)} ${padL("rate1000", 8)} ${padL("rate2000", 8)} ${padL("curv.", 7)} ${padL("+20%", 8)} ${padL("-20%", 8)} ${padL("asym.", 7)} ${padL("$/mo", 7)} list rank`,
);
for (const r of badged) {
  const p = r.plan.pricePerKwh;
  console.log(
    ` ${pad(r.plan.planName, 30)} ${pad(r.plan.companyName, 18)} ${padL(r.plan.termMonths, 4)} ${pad(r.warning, 6)} ${padL((p.at500 * 100).toFixed(1), 7)} ${padL((p.at1000 * 100).toFixed(1), 8)} ${padL((p.at2000 * 100).toFixed(1), 8)} ${padL(f3(r.curvature), 7)} ${padL(sgn(r.more), 8)} ${padL(sgn(r.less), 8)} ${padL(sgn(r.asymmetry), 7)} ${padL(f2(r.perMonth), 7)} ${r.list} #${r.rank}`,
  );
}
console.log(
  "  (rates in cents/kWh; asym. = (+20% figure) + (-20% figure), 0 for a flat plan; $/mo = ranked per month)",
);
console.log("");

// ---------- 2. distribution ----------
const stats = (label, set) => {
  const v = set
    .map((r) => r.curvature)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const median =
    v.length % 2
      ? v[(v.length - 1) / 2]
      : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
  const outside = set.filter(
    (r) => !(r.curvature >= 0.9 && r.curvature <= 1.1),
  ).length;
  const nonFinite = set.length - v.length;
  console.log(
    `  ${pad(label, 28)} n=${padL(set.length, 3)}  min ${f3(v[0])}  median ${f3(median)}  max ${f3(v[v.length - 1])}  outside 0.9-1.1: ${outside}${nonFinite ? `  (non-finite: ${nonFinite})` : ""}`,
  );
};
console.log("2. CURVATURE (m2 / m1) ACROSS THE PLANS");
stats("all plans", rows);
stats(
  "with a badge",
  rows.filter((r) => r.warning),
);
stats(
  "without a badge",
  rows.filter((r) => !r.warning),
);
console.log("");
const buckets = [
  ["below 0.5", (c) => c < 0.5],
  ["0.5 to 0.9", (c) => c >= 0.5 && c < 0.9],
  ["0.9 to 1.1", (c) => c >= 0.9 && c <= 1.1],
  ["above 1.1 to 1.5", (c) => c > 1.1 && c <= 1.5],
  ["above 1.5", (c) => c > 1.5],
];
for (const [label, test] of buckets) {
  const inB = rows.filter((r) => test(r.curvature));
  console.log(
    `  ${pad(label, 18)} ${padL(inB.length, 3)} plans (${inB.filter((r) => r.warning).length} badged)`,
  );
}
console.log("");

// ---------- 3. how big are the asymmetries ----------
const asym = (set) => set.map((r) => Math.abs(r.asymmetry ?? 0));
const maxOf = (v) => Math.max(...v);
const unbadged = rows.filter((r) => !r.warning && r.asymmetry !== null);
console.log("3. ASYMMETRY (|+20% figure + -20% figure|, dollars a month)");
console.log(
  `  badged plans    largest ${f2(maxOf(asym(badged)))}, mean ${f2(asym(badged).reduce((a, b) => a + b, 0) / badged.length)}`,
);
console.log(
  `  unbadged plans  largest ${f2(maxOf(asym(unbadged)))}, mean ${f2(asym(unbadged).reduce((a, b) => a + b, 0) / unbadged.length)}`,
);
const top = [...rows]
  .filter((r) => r.asymmetry !== null)
  .sort((a, b) => Math.abs(b.asymmetry) - Math.abs(a.asymmetry))
  .slice(0, 5);
console.log("  five largest asymmetries of all plans:");
for (const r of top) {
  console.log(
    `    ${pad(r.plan.planName, 30)} ${r.warning ?? "no badge"}  asym ${sgn(r.asymmetry)}  curvature ${f3(r.curvature)}  ${r.list} #${r.rank}`,
  );
}
const flatRef = rows.find(
  (r) => Math.abs(r.curvature - 1) < 1e-9 && r.asymmetry !== null,
);
if (flatRef)
  console.log(
    `  a perfectly flat plan for reference: ${flatRef.plan.planName}, asym ${sgn(flatRef.asymmetry)}`,
  );
