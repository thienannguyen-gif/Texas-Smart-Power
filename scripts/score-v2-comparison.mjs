// Builds analysis/score-v2-comparison.md: the score-v2 ranking (this branch) next
// to the dollar ranking (feat/dollar-ranking) and the current live scoring, for
// the newest Oncor file in Vercel Blob.
//
//   node scripts/score-v2-comparison.mjs [tdu] [--usage 1000] [--month 10]
//
// --month is zero-indexed (0 = January) and only matters for the dollar ranking's
// short list; the default is the current month. Reads the Blob with the token in
// .env.local (read-only). Changes nothing in the app: scoreV2.ts, contractCost.ts
// and ranking.ts are only imported, so the numbers are the ones the pages show.
// contractCost.ts is byte-identical to feat/dollar-ranking's.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
const { scorePlans, priceCurveWarning } = await load(
  "./frontend/src/lib/ranking.ts",
);
const { scorePlansV2, WEIGHTS_V2 } = await load(
  "./frontend/src/lib/scoreV2.ts",
);
const { parseExitFee } = await load("./frontend/src/lib/cancellationFee.ts");
const { renewablePct } = await load("./frontend/src/lib/filters.ts");
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

// ---------- data ----------
const token = readFileSync(resolve(root, ".env.local"), "utf8").match(
  /^BLOB_READ_WRITE_TOKEN="?([^"\n]+)"?$/m,
)?.[1];
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
const plans = stored.filter((p) => !p.isTimeOfUse);

// ---------- the three rankings ----------
const v2 = scorePlansV2(plans, plans, usage); // this branch
const v2Rank = new Map(v2.map(({ plan }, i) => [plan.id, i + 1]));
const v2By = new Map(v2.map((s) => [s.plan.id, s]));

const live = scorePlans(plans); // ranking.ts, untouched: the live scoring
const liveRank = new Map(live.map(({ plan }, i) => [plan.id, i + 1]));
const liveBreakdown = new Map(
  live.map(({ plan, breakdown }) => [plan.id, breakdown]),
);

const dollar = {
  long: rankByContractCost(plans, "long", usage, startMonth),
  short: rankByContractCost(plans, "short", usage, startMonth),
};
const dollarPos = new Map(); // id -> { list, rank }
for (const which of ["long", "short"]) {
  dollar[which].forEach(({ plan }, i) =>
    dollarPos.set(plan.id, { list: which, rank: i + 1 }),
  );
}

// ---------- formatting ----------
const usd = (n) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const cell = (s) => String(s).replace(/\|/g, "\\|");
const f2 = (n) => n.toFixed(2);
const f3 = (n) => n.toFixed(3);
const feeOf = (plan) => {
  const f = parseExitFee(plan.pricingDetails, plan.termMonths);
  return f === null ? "n/a" : f === 0 ? "none" : usd(f).replace(/\.00$/, "");
};
const dollarText = (id) => {
  const d = dollarPos.get(id);
  return d ? `${d.list} #${d.rank}` : "n/a";
};

const maxFee = Math.max(
  ...plans
    .map((p) => parseExitFee(p.pricingDetails, p.termMonths))
    .filter((f) => f !== null),
);

// ---------- 1 + 2. top 10 ----------
const top = v2.slice(0, 10);
const topRows = top.map((s, i) => {
  const b = s.breakdown;
  return `| ${i + 1} | ${cell(s.plan.planName)} | ${cell(s.plan.companyName)} | ${s.plan.termMonths} | ${feeOf(s.plan)} | ${f3(b.total)} | ${f2(b.cost)} | ${f2(b.term)} | ${f2(b.fee)} | ${f2(b.green)} | ${usd(s.bill)} | ${dollarText(s.plan.id)} | ${liveRank.get(s.plan.id)} |`;
});

// ---------- 3. term mix, and what S_term alone does ----------
const mix = (plansList) => {
  const t = (p) => p.termMonths;
  return {
    3: plansList.filter((p) => t(p) === 3).length,
    6: plansList.filter((p) => t(p) === 6).length,
    12: plansList.filter((p) => t(p) === 12).length,
    over12: plansList.filter((p) => t(p) > 12).length,
    other: plansList.filter((p) => ![3, 6, 12].includes(t(p)) && t(p) <= 12)
      .length,
  };
};
const mixRow = (label, ps) => {
  const m = mix(ps);
  return `| ${label} | ${m[3]} | ${m[6]} | ${m[12]} | ${m.over12} | ${m.other} |`;
};

// control: the same formula with the OLD term-point table instead of S_term, to
// see what S_term alone changes while the price factor stays the plain bill
const oldTerm = (id) => liveBreakdown.get(id)?.term;
const control = v2
  .map((s, index) => {
    const b = s.breakdown;
    const flex = 0.5 * oldTerm(s.plan.id) + 0.5 * b.fee;
    const total = (8 * b.cost + 3 * flex + 1 * b.green) / 12;
    return { s, total, index };
  })
  .sort(
    (a, b) =>
      Math.round(b.total * 1e9) - Math.round(a.total * 1e9) ||
      a.index - b.index,
  );
const controlRank = new Map(control.map(({ s }, i) => [s.plan.id, i + 1]));

const twelve = v2.filter(({ plan }) => plan.termMonths === 12);
const twelveInTop10 = top.filter(({ plan }) => plan.termMonths === 12);
const controlTwelveInTop10 = control
  .slice(0, 10)
  .filter(({ s }) => s.plan.termMonths === 12);
const bestTwelve = twelve[0];

// ---------- 4. top 10 on one branch, outside the top 25 on the other ----------
// dollar branch: top 10 of its own list (long or short), position = rank in that list
const contribution = (s) => {
  const b = s.breakdown;
  return {
    "price (S_cost)": WEIGHTS_V2.cost * b.cost,
    "term (S_term)": 0.5 * WEIGHTS_V2.flexibility * b.term,
    "cancellation fee (S_fee)": 0.5 * WEIGHTS_V2.flexibility * b.fee,
    "renewable (S_green)": WEIGHTS_V2.green * b.green,
  };
};
const median = (v) => {
  const s = [...v].sort((a, b) => a - b);
  return s.length % 2
    ? s[(s.length - 1) / 2]
    : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const keys = Object.keys(contribution(v2[0]));
const medianContribution = Object.fromEntries(
  keys.map((k) => [k, median(v2.map((s) => contribution(s)[k]))]),
);
const topAvg = Object.fromEntries(
  keys.map((k) => [
    k,
    top.reduce((a, s) => a + contribution(s)[k], 0) / top.length,
  ]),
);

function whyMovedUp(s) {
  // top 10 under v2, far down on the dollar branch: which factor lifted it
  const c = contribution(s);
  const [k, gain] = keys
    .map((key) => [key, c[key] - medianContribution[key]])
    .sort((a, b) => b[1] - a[1])[0];
  const b = s.breakdown;
  return `${k} adds ${f2(gain)} points over the median plan (S_cost ${f2(b.cost)}, S_term ${f2(b.term)}, S_fee ${f2(b.fee)}, S_green ${f2(b.green)}); on price alone it is ${dollarText(s.plan.id)}.`;
}
function whyMovedDown(s) {
  // top 10 on the dollar branch, far down under v2: which factor held it back
  const c = contribution(s);
  const [k, gap] = keys
    .map((key) => [key, topAvg[key] - c[key]])
    .sort((a, b) => b[1] - a[1])[0];
  const b = s.breakdown;
  return `${k} is ${f2(gap)} points below the v2 top-10 average (S_cost ${f2(b.cost)}, S_term ${f2(b.term)}, S_fee ${f2(b.fee)}, S_green ${f2(b.green)}).`;
}

const moves = [];
for (const which of ["long", "short"]) {
  dollar[which].slice(0, 10).forEach(({ plan }, i) => {
    const r = v2Rank.get(plan.id);
    if (r > 25) {
      moves.push({
        plan,
        dir: `top 10 of the dollar ${which} list (#${i + 1}), v2 #${r}`,
        why: whyMovedDown(v2By.get(plan.id)),
        key: r,
      });
    }
  });
}
for (const s of top) {
  const d = dollarPos.get(s.plan.id);
  if (d && d.rank > 25) {
    moves.push({
      plan: s.plan,
      dir: `top 10 under v2 (#${v2Rank.get(s.plan.id)}), dollar ${d.list} list #${d.rank}`,
      why: whyMovedUp(s),
      key: d.rank,
    });
  }
}

// ---------- the document ----------
const lines = [];
const out = (s = "") => lines.push(s);
out(`# Score v2 vs dollar ranking vs live scoring: ${tdu}`);
out();
out(
  `Generated ${new Date().toISOString()} by \`scripts/score-v2-comparison.mjs\`. This is the proposal in branch \`feat/score-v2\`, set beside \`feat/dollar-ranking\` and the scoring that is live today. Nothing here is a product rule from BRIEF.md (BRIEF.md still describes the live 5/3/3/1 scoring).`,
);
out();
out("## Data and definitions");
out();
out(
  `- Blob file: \`${latest.pathname}\`, uploaded ${new Date(latest.uploadedAt).toISOString()} (file \`generatedAt\` ${file.generatedAt}).`,
);
out(
  `- ${stored.length} ranked plans + ${touStored.length} time-of-use plans in the file; time-of-use plans are not ranked by any of the three. ${plans.length} ranked plans, ${v2.length} scored by v2.`,
);
out(
  `- Usage ${usage} kWh a month (the page's default). The dollar ranking's short list also depends on the start month (${MONTH_NAMES[startMonth]}, the current month); v2 has no seasonal factor.`,
);
out(
  `- **Score v2**: (8 S_cost + 3 S_flex + 1 S_green) / 12. S_cost = 10 (cost_max - cost) / (cost_max - cost_min) over the plans shown, cost = the estimated monthly bill at ${usage} kWh (the piecewise-linear cost curve through the three published prices, to the cent). S_flex = 0.5 S_term + 0.5 S_fee; S_term = 10 min(L, 12) / 12; S_fee = 10 (1 - fee / max_fee) with max_fee = ${usd(maxFee)} (the highest fee in the data). S_green = renewable % / 10. No S_slope, no seasonal factor.`,
);
out(
  `- **feat/dollar-ranking**: two lists (under 12 months / 12 months and longer), each ordered by average monthly bill (long plans over their first 12 months, short plans over their own term). "Position" there is the rank inside the plan's own list.`,
);
out(
  `- **Live scoring**: \`scorePlans\` in \`ranking.ts\`, one list, 5/12 price (500 kWh rate) + 3/12 slope + 3/12 flexibility (old term-point table) + 1/12 green.`,
);
out(`- Equal bills are compared to the cent and ties keep the stored order.`);
out();
out("## 1 and 2. Top 10 under score v2, with the same plans on the other two");
out();
out(
  "| Rank (v2) | Plan | Provider | Term (mo) | Cancellation fee | Score | S_cost | S_term | S_fee | S_green | Monthly bill | feat/dollar-ranking | Live scoring |",
);
out("|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|");
topRows.forEach((r) => out(r));
out();
out("## 3. Term mix of the top 10");
out();
out(
  "| Ranking | 3 months | 6 months | 12 months | Over 12 months | Other under 12 |",
);
out("|---|---:|---:|---:|---:|---:|");
out(
  mixRow(
    "**Score v2**",
    top.map((s) => s.plan),
  ),
);
out(
  mixRow(
    "Same formula with the OLD term-point table instead of S_term (control)",
    control.slice(0, 10).map(({ s }) => s.plan),
  ),
);
out(
  mixRow(
    "Live scoring",
    live.slice(0, 10).map(({ plan }) => plan),
  ),
);
out(
  mixRow(
    "feat/dollar-ranking, long list",
    dollar.long.slice(0, 10).map(({ plan }) => plan),
  ),
);
out(
  mixRow(
    "feat/dollar-ranking, short list",
    dollar.short.slice(0, 10).map(({ plan }) => plan),
  ),
);
out();
out(
  `- 12-month plans in the v2 top 10: **${twelveInTop10.length}**${twelveInTop10.length ? ` (${twelveInTop10.map((s) => `${cell(s.plan.planName)} #${v2Rank.get(s.plan.id)}`).join(", ")})` : ""}.`,
);
out(
  `- 12-month plans in the top 10 of the control (same bill-only price factor, old term table): **${controlTwelveInTop10.length}**${controlTwelveInTop10.length ? ` (${controlTwelveInTop10.map(({ s }) => `${cell(s.plan.planName)} #${controlRank.get(s.plan.id)}`).join(", ")})` : ""}.`,
);
out(
  twelveInTop10.length > controlTwelveInTop10.length
    ? `- So S_term alone brings ${twelveInTop10.length - controlTwelveInTop10.length} 12-month plan(s) into the top 10 when the price factor is the plain bill.`
    : twelveInTop10.length === 0
      ? "- So S_term alone does NOT bring any 12-month plan into the top 10 when the price factor is the plain bill."
      : "- The 12-month plans in the v2 top 10 are there in the control too, so S_term is not what brings them in.",
);
out(
  `- Best 12-month plan under v2: ${cell(bestTwelve.plan.planName)} (${cell(bestTwelve.plan.companyName)}), rank #${v2Rank.get(bestTwelve.plan.id)}, score ${f3(bestTwelve.breakdown.total)} (S_cost ${f2(bestTwelve.breakdown.cost)}, S_term ${f2(bestTwelve.breakdown.term)}, S_fee ${f2(bestTwelve.breakdown.fee)}, S_green ${f2(bestTwelve.breakdown.green)}, bill ${usd(bestTwelve.bill)}); the cheapest bill of any plan is ${usd(v2.reduce((m, s) => Math.min(m, s.bill), Infinity))}, the #1 plan's is ${usd(v2[0].bill)} with S_term ${f2(v2[0].breakdown.term)}.`,
);
out(
  `- The score gap between the best 3-month plan and the best 12-month plan: ${f3(v2.find((s) => s.plan.termMonths === 3)?.breakdown.total - bestTwelve.breakdown.total)} points (3-month minus 12-month; positive = the 3-month plan is ahead).`,
);
out();
out("## 4. Top 10 on one branch and outside the top 25 on the other");
out();
out(
  "Compared: score v2 (one list) against feat/dollar-ranking (rank inside each plan's own list). The factor named is the one with the largest contribution to the move, measured in weighted score points.",
);
out();
if (moves.length === 0) {
  out("No plan is in the top 10 of one and outside the top 25 of the other.");
} else {
  out("| Plan | Provider | Term | Where | Which factor moved it |");
  out("|---|---|---:|---|---|");
  for (const m of moves.sort((a, b) => b.key - a.key)) {
    out(
      `| ${cell(m.plan.planName)} | ${cell(m.plan.companyName)} | ${m.plan.termMonths} | ${m.dir} | ${cell(m.why)} |`,
    );
  }
}
out();
const upMoves = moves.filter((m) => m.dir.startsWith("top 10 under v2")).length;
const downMoves = moves.length - upMoves;
out(
  `- Top 10 of a dollar list and outside the v2 top 25: ${downMoves}. Top 10 under v2 and outside the top 25 of the plan's dollar list: ${upMoves}.`,
);
out();
out("## Other things visible in the top 10");
out();
const badged = top.filter(({ plan }) => priceCurveWarning(plan) !== null);
out(
  `- Plans carrying the V-trap / hump badge in the v2 top 10: ${badged.length}${badged.length ? " (" + badged.map((s) => `${cell(s.plan.planName)} #${v2Rank.get(s.plan.id)}, live scoring #${liveRank.get(s.plan.id)}`).join("; ") + ")" : ""}. v2 has no slope term, so the badge no longer costs a plan 3 of 12 points.`,
);
const dupes = new Map();
for (const s of top) {
  const key = `${s.bill}|${s.breakdown.total.toFixed(9)}`;
  dupes.set(key, [...(dupes.get(key) ?? []), s.plan.planName]);
}
const tied = [...dupes.values()].filter((v) => v.length > 1);
out(
  `- Plans in the top 10 with an identical score to another (sold under two brand names, same price and terms; the stored order separates them): ${tied.length ? tied.map((v) => v.join(" / ")).join("; ") : "none"}.`,
);
out();

mkdirSync(resolve(root, "analysis"), { recursive: true });
const path = resolve(root, "analysis", "score-v2-comparison.md");
writeFileSync(path, lines.join("\n") + "\n");
console.log(`WROTE ${path}`);
console.log(
  `blob ${latest.pathname}; ${plans.length} plans, ${v2.length} scored; v2 top-10 12-month plans ${twelveInTop10.length}, control ${controlTwelveInTop10.length}; moves ${moves.length}`,
);
