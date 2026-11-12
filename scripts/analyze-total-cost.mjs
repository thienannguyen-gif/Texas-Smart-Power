// One-off: drop S_flex and put term and cancellation fee into the cost itself.
//
//   node scripts/analyze-total-cost.mjs [tdu]      (default: oncor)
//
//   score = (11 * S_cost + 1 * S_green) / 12
//   over a 12-month holding period, for a plan with term L and cancellation fee f:
//     renewals = L < 12 ? ceil(12 / L) - 1 : 0
//     exitFee  = L > 12 ? f : 0
//     TC = 12 * E + exitFee + S * renewals
//     CE = TC / 12 + semiSd                    (k = 1)
//     S_cost = 10 * (CE_max - CE) / (CE_max - CE_min), recomputed at every S
//   S = cost of finding and signing a replacement contract, swept 0..100 by 5.
//
// The cancellation fee lives ONLY in TC: there is no fee or term points factor.
// Reads the newest plans/<tdu>-*.json from Vercel Blob (token from .env.local,
// read-only). ranking.ts is only imported (to reuse S_green and the fee parser).
// Writes analysis/total-cost.csv (git-ignored).
//
// Nothing here is the formula in docs/BRIEF.md; it is a proposal under test.

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

const tdu = process.argv[2] ?? "oncor";
const U0 = 1125;
const EPS = 1e-9;
const MULT = [
  0.9931, 0.8903, 0.7898, 0.7223, 0.8896, 1.176, 1.3954, 1.4299, 1.2153, 0.9297,
  0.7336, 0.8351,
];
const S_GRID = Array.from({ length: 21 }, (_, i) => i * 5);
const SHOW = [0, 25, 50, 75, 100];

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
console.log("");
console.log("ASSUMPTIONS (both favour short plans)");
console.log(
  "  1. After a short plan ends the user re-signs at the SAME price: no price change is modelled, only the cost S of switching.",
);
console.log(
  "  2. A plan longer than 12 months always pays its full cancellation fee at month 12, with no move-out waiver.",
);
console.log(
  "  The cancellation fee is counted once, inside TC; there is no fee/term points factor.",
);
console.log("");

// ---------- cost model (same as the earlier scripts) ----------
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
  const L = plan.termMonths;
  const f = parseExitFee(plan.pricingDetails, L);
  return {
    storedIndex,
    plan,
    L,
    f,
    E,
    semiSd,
    bill1125: costAt(r, U0),
    renewals: L < 12 ? Math.ceil(12 / L) - 1 : 0,
    exitFee: L > 12 ? f : 0,
    sGreen: breakdown.green,
    // for the comparison with the previous run only
    sTermOld: breakdown.term,
    sTermNew: (10 * Math.min(L, 12)) / 12,
    sFee: breakdown.fee,
  };
});

// ---------- the model at one S ----------
function runAt(S) {
  const withCE = rows.map((r) => {
    const TC = 12 * r.E + r.exitFee + S * r.renewals;
    return { row: r, TC, CE: TC / 12 + r.semiSd };
  });
  const lo = Math.min(...withCE.map((o) => o.CE));
  const hi = Math.max(...withCE.map((o) => o.CE));
  const flat = hi - lo < EPS;
  for (const o of withCE) {
    o.sCost = flat ? 10 : (10 * (hi - o.CE)) / (hi - lo);
    o.score = (11 * o.sCost + 1 * o.row.sGreen) / 12;
  }
  withCE.sort(
    (a, b) => b.score - a.score || a.row.storedIndex - b.row.storedIndex,
  );
  withCE.forEach((o, i) => (o.rank = i + 1));
  return withCE;
}
const byS = new Map(S_GRID.map((S) => [S, runAt(S)]));

const f1 = (n) => n.toFixed(1);
const f2 = (n) => n.toFixed(2);
const f3 = (n) => n.toFixed(3);
const pad = (s, n) => String(s).slice(0, n).padEnd(n);
const padL = (s, n) => String(s).padStart(n);
const feeText = (v) => (v === null ? "?" : `$${v}`);
const mean = (v) => v.reduce((a, b) => a + b, 0) / v.length;

// ---------- 1. the "about $12 a month" claim ----------
console.log(
  "1. THE 12-MONTH vs 3-MONTH GAP (E = mean monthly bill over the 12 seasonal months)",
);
function listTerm(L, full) {
  const sel = rows.filter((r) => r.L === L);
  console.log(`  Plans with L = ${L}: ${sel.length}`);
  if (sel.length === 0) return null;
  if (full) {
    console.log(
      `    ${pad("plan", 30)} ${pad("provider", 20)} ${padL("E", 7)} ${padL("semiSd", 7)} ${padL("bill@1125", 9)}`,
    );
    for (const r of [...sel].sort((a, b) => a.E - b.E)) {
      console.log(
        `    ${pad(r.plan.planName, 30)} ${pad(r.plan.companyName, 20)} ${padL(f2(r.E), 7)} ${padL(f2(r.semiSd), 7)} ${padL(f2(r.bill1125), 9)}`,
      );
    }
  }
  const es = sel.map((r) => r.E);
  const stats = {
    n: sel.length,
    mean: mean(es),
    min: Math.min(...es),
    max: Math.max(...es),
  };
  console.log(
    `    E across them: mean ${f2(stats.mean)}, min ${f2(stats.min)}, max ${f2(stats.max)}`,
  );
  return stats;
}
const s12 = listTerm(12, true);
const s3 = listTerm(3, true);
if (s12 && s3) {
  console.log("  Gap in E, 12-month minus 3-month ($/month):");
  console.log(`    mean vs mean   ${f2(s12.mean - s3.mean)}`);
  console.log(
    `    cheapest vs cheapest   ${f2(s12.min - s3.min)}   <- the gap that matters for who is #1`,
  );
  console.log(`    most expensive vs most expensive   ${f2(s12.max - s3.max)}`);
}
console.log("");

// ---------- 2. top 10 at selected S ----------
console.log("2. TOP 10");
const mixOf = (top) => {
  const t = (o) => o.row.L;
  return `3 mo ${top.filter((o) => t(o) === 3).length}, 6 mo ${top.filter((o) => t(o) === 6).length}, 12 mo ${top.filter((o) => t(o) === 12).length}, over 12 mo ${top.filter((o) => t(o) > 12).length}, other under 12 ${top.filter((o) => t(o) < 12 && ![3, 6].includes(t(o))).length}`;
};
for (const S of SHOW) {
  const res = byS.get(S);
  console.log(`  S = ${S}`);
  console.log(
    `   ${padL("#", 2)}  ${pad("plan", 28)} ${padL("term", 4)} ${padL("fee", 5)} ${padL("score", 6)} ${padL("E", 7)} ${padL("renew", 5)} ${padL("TC", 8)}`,
  );
  for (const o of res.slice(0, 10)) {
    console.log(
      `   ${padL(o.rank, 2)}  ${pad(o.row.plan.planName, 28)} ${padL(o.row.L, 4)} ${padL(feeText(o.row.f), 5)} ${padL(f3(o.score), 6)} ${padL(f2(o.row.E), 7)} ${padL(o.row.renewals, 5)} ${padL(f2(o.TC), 8)}`,
    );
  }
  console.log(`   term mix: ${mixOf(res.slice(0, 10))}`);
}
console.log("");

// ---------- 3. thresholds ----------
// Asked grid is steps of 5; a finer scan (steps of 0.25, up to 100) gives the actual crossing.
function firstS(pred) {
  for (let S = 0; S <= 100 + 1e-9; S += 0.25) {
    if (pred(runAt(S))) return S;
  }
  return null;
}
const twelveInTop10 = (res) => res.slice(0, 10).some((o) => o.row.L === 12);
const twelveIsFirst = (res) => res[0].row.L === 12;
const gridFirst = (pred) => S_GRID.find((S) => pred(byS.get(S))) ?? null;
const fmtS = (v) => (v === null ? "never, for any S up to 100" : `S = ${v}`);
console.log("3. THRESHOLDS");
console.log(
  `  smallest S with any 12-month plan in the top 10:  ${fmtS(firstS(twelveInTop10))} (on the step-5 grid: ${fmtS(gridFirst(twelveInTop10))})`,
);
console.log(
  `  smallest S with a 12-month plan at #1:            ${fmtS(firstS(twelveIsFirst))} (on the step-5 grid: ${fmtS(gridFirst(twelveIsFirst))})`,
);
const best12 = (S) => byS.get(S).find((o) => o.row.L === 12);
console.log(
  `  best 12-month plan: ${best12(0).row.plan.planName} (${best12(0).row.plan.companyName}); its rank at S = 0/25/50/75/100: ${SHOW.map((S) => "#" + best12(S).rank).join(" / ")}`,
);
console.log("");

// ---------- 4. 24 months or more ----------
console.log("4. PLANS OF 24 MONTHS OR MORE");
const longIn = (res) => res.slice(0, 10).filter((o) => o.row.L >= 24);
const firstLong = firstS((res) => longIn(res).length > 0);
console.log(`  smallest S at which one enters the top 10: ${fmtS(firstLong)}`);
const long0 = byS.get(0).filter((o) => o.row.L >= 24);
console.log(
  `  there are ${long0.length} plans of 24+ months. Best-ranked of them at each S:`,
);
for (const S of SHOW) {
  const o = byS.get(S).find((x) => x.row.L >= 24);
  if (o)
    console.log(
      `    S = ${padL(S, 3)}: #${o.rank} ${o.row.plan.planName} (${o.row.plan.companyName}), term ${o.row.L}, fee ${feeText(o.row.f)}, E ${f2(o.row.E)}, score ${f3(o.score)}`,
    );
}
// is the exit fee actually penalising them? compare CE with and without it
const exitPenalty = rows.filter((r) => r.L > 12).map((r) => r.exitFee / 12);
console.log(
  `  exit fee added to CE for the plans over 12 months ($/month, = fee/12): mean ${f2(mean(exitPenalty))}, max ${f2(Math.max(...exitPenalty))}`,
);
console.log("");

// ---------- 5. compare with the previous run ----------
console.log("5. TOP 10 AT S = 0 vs THE PREVIOUS RUN'S NEW-PRICE CELLS");
console.log(
  "  Previous cells: score = (8 S_cost + 3 S_flex + 1 S_green)/12, CE = E + semiSd, S_flex = 0.5 S_term + 0.5 S_fee.",
);
console.log(
  "  Note: at S = 0 the model also puts fee/12 into CE for plans over 12 months, so it is not ONLY S_flex removed; that part is shown below.",
);
function prevCell(termKind) {
  const ce = rows.map((r) => r.E + r.semiSd);
  const lo = Math.min(...ce);
  const hi = Math.max(...ce);
  const out = rows.map((r, i) => {
    const sTerm = termKind === "old" ? r.sTermOld : r.sTermNew;
    const flex = 0.5 * sTerm + 0.5 * r.sFee;
    const sCost = (10 * (hi - ce[i])) / (hi - lo);
    return { row: r, score: (8 * sCost + 3 * flex + r.sGreen) / 12 };
  });
  out.sort(
    (a, b) => b.score - a.score || a.row.storedIndex - b.row.storedIndex,
  );
  return out;
}
const idsOf = (res) => res.slice(0, 10).map((o) => o.row.plan.id);
const now0 = byS.get(0);
// S = 0 with the exit fee also removed: pure "S_flex removed" control
{
  const ce = rows.map((r) => r.E + r.semiSd);
  const lo = Math.min(...ce);
  const hi = Math.max(...ce);
  const ctl = rows.map((r, i) => ({
    row: r,
    score: (11 * ((10 * (hi - ce[i])) / (hi - lo)) + r.sGreen) / 12,
  }));
  ctl.sort(
    (a, b) => b.score - a.score || a.row.storedIndex - b.row.storedIndex,
  );
  const nm = (o) => `${o.row.plan.planName} (${o.row.L} mo)`;
  const cIds = new Set(idsOf(ctl));
  for (const kind of ["old", "new"]) {
    const prev = prevCell(kind);
    const pIds = new Set(idsOf(prev));
    const nIds = new Set(idsOf(now0));
    const samePos = idsOf(prev).filter((id, i) => id === idsOf(now0)[i]).length;
    console.log(
      `  vs previous new-price/${kind}-term cell: ${[...nIds].filter((id) => pIds.has(id)).length} of 10 plans in common, ${samePos} in the same position`,
    );
    const left = prev.slice(0, 10).filter((o) => !nIds.has(o.row.plan.id));
    const joined = now0.slice(0, 10).filter((o) => !pIds.has(o.row.plan.id));
    console.log(
      `    left the top 10:  ${left.map((o) => nm(o)).join("; ") || "none"}`,
    );
    console.log(
      `    entered the top 10: ${joined.map((o) => nm(o)).join("; ") || "none"}`,
    );
    console.log(
      `    control (S_flex removed, exit fee NOT in cost): ${[...cIds].filter((id) => pIds.has(id)).length} of 10 in common with that cell`,
    );
  }
  console.log(
    `  S = 0 top 10 vs control (exit fee out of cost): ${[...new Set(idsOf(now0))].filter((id) => cIds.has(id)).length} of 10 in common`,
  );
  console.log(`  control top 10: ${ctl.slice(0, 10).map(nm).join("; ")}`);
}
console.log("");

// ---------- CSV ----------
const header = [
  "S",
  "rank",
  "plan_id",
  "plan_name",
  "provider",
  "term_months",
  "cancel_fee",
  "renewals",
  "exit_fee_in_tc",
  "score",
  "s_cost",
  "s_green",
  "e",
  "semi_sd",
  "bill_1125",
  "tc",
  "ce",
];
const q = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const r4 = (n) => Math.round(n * 1e4) / 1e4;
const lines = [header.join(",")];
for (const S of S_GRID) {
  for (const o of byS.get(S)) {
    const r = o.row;
    lines.push(
      [
        S,
        o.rank,
        r.plan.id,
        r.plan.planName,
        r.plan.companyName,
        r.L,
        r.f,
        r.renewals,
        r.exitFee,
        r4(o.score),
        r4(o.sCost),
        r4(r.sGreen),
        r4(r.E),
        r4(r.semiSd),
        r4(r.bill1125),
        r4(o.TC),
        r4(o.CE),
      ]
        .map(q)
        .join(","),
    );
  }
}
mkdirSync(resolve(root, "analysis"), { recursive: true });
const out = resolve(root, "analysis", "total-cost.csv");
writeFileSync(out, lines.join("\n") + "\n");
console.log(
  `WROTE ${out} (${lines.length - 1} rows: ${rows.length} plans x ${S_GRID.length} values of S)`,
);
