// Builds analysis/dollar-ranking-comparison.md: the dollar ranking next to the
// current live scoring, for the newest Oncor file in Vercel Blob.
//
//   node scripts/dollar-ranking-comparison.mjs [tdu] [--usage 1000] [--month 10]
//
// --month is zero-indexed (0 = January); the default is the current month.
// Reads the Blob with the token in .env.local (read-only). Changes nothing in
// the app: frontend/src/lib/contractCost.ts and ranking.ts are only imported, so
// the numbers here are the ones the page shows.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { list } from "@vercel/blob";
import { tsImport } from "tsx/esm/api";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const parentURL = pathToFileURL(root + "/").href;
const load = (path) => tsImport(path, { parentURL });
const {
  SEASON,
  MONTH_NAMES,
  currentStartMonth,
  rankByContractCost,
  describeMonths,
} = await load("./frontend/src/lib/contractCost.ts");
const { scorePlans } = await load("./frontend/src/lib/ranking.ts");
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
const plans = stored.filter((p) => !p.isTimeOfUse);

// ---------- live scoring: the current ranking, one combined list ----------
const live = scorePlans(plans); // sorted best first, exactly as the page's "Best match" order
const liveRank = new Map(live.map(({ plan }, i) => [plan.id, i + 1]));
const liveBreakdown = new Map(
  live.map(({ plan, breakdown }) => [plan.id, breakdown]),
);
const sameAsStored =
  live.length === plans.length &&
  live.every(({ plan }, i) => plan.id === plans[i].id);
// position among its own list (long or short) in the live order
const liveOwnRank = new Map();
for (const which of ["long", "short"]) {
  const inList = live.filter(
    ({ plan }) => (plan.termMonths < 12 ? "short" : "long") === which,
  );
  inList.forEach(({ plan }, i) => liveOwnRank.set(plan.id, i + 1));
}

// ---------- dollar ranking ----------
const dollar = {
  long: rankByContractCost(plans, "long", usage, startMonth),
  short: rankByContractCost(plans, "short", usage, startMonth),
};
const dollarRank = new Map();
for (const which of ["long", "short"]) {
  dollar[which].forEach(({ plan }, i) => dollarRank.set(plan.id, i + 1));
}
const notCosted = plans.length - dollar.long.length - dollar.short.length;

// ---------- formatting ----------
const usd = (n) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const cell = (s) => String(s).replace(/\|/g, "\\|");
const feeOf = (plan) => {
  const f = parseExitFee(plan.pricingDetails, plan.termMonths);
  return f === null ? "n/a" : f === 0 ? "none" : usd(f).replace(/\.00$/, "");
};
const renewOf = (plan) => {
  const r = renewablePct(plan);
  return r === null ? "n/a" : `${r}%`;
};
const signedUsd = (n) => {
  const r = Math.round(n);
  return r === 0 ? "$0" : `${r > 0 ? "+" : "-"}${Math.abs(r)}`;
};
const sign = (n) => (n > 0 ? `+${n}` : String(n));

function topTable(which, n = 10) {
  const rows = dollar[which].slice(0, n).map(({ plan, cost }, i) => {
    const own = liveOwnRank.get(plan.id);
    return `| ${i + 1} | ${cell(plan.planName)} | ${cell(plan.companyName)} | ${plan.termMonths} | ${feeOf(plan)} | ${usd(cost.rankedPerMonth)} | ${usd(cost.total)} over ${plan.termMonths} mo | ${describeMonths(cost.monthsCovered)} | ${usd(cost.worstMonth)} | ${signedUsd(cost.moreUsageDelta)} / ${signedUsd(cost.lessUsageDelta)} | ${renewOf(plan)} | ${liveRank.get(plan.id)} | ${own} | ${sign(own - (i + 1))} |`;
  });
  return [
    "| Rank | Plan | Provider | Term (mo) | Cancellation fee | Ranked per month | Total | Months covered | Most expensive month | 20% more / 20% less usage (per month) | Renewable | Live rank (all plans) | Live rank (own list) | Moved up (+) / down (-) vs own list |",
    "|---:|---|---|---:|---:|---:|---|---|---:|---:|---:|---:|---:|---:|",
    ...rows,
  ].join("\n");
}

// ---------- 3. seasonal exposure by start month ----------
const avg = (v) => v.reduce((a, b) => a + b, 0) / v.length;
const exposure = (start, L) =>
  avg(Array.from({ length: L }, (_, i) => SEASON[(start + i) % 12]));
const TERMS = [3, 6, 12];
const minBy = Object.fromEntries(
  TERMS.map((L) => [L, Math.min(...MONTH_NAMES.map((_, m) => exposure(m, L)))]),
);
const exposureRows = MONTH_NAMES.map((name, m) => {
  const cols = TERMS.map((L) => {
    const e = exposure(m, L);
    return `${e.toFixed(4)} (${(e / minBy[L]).toFixed(2)}x)`;
  });
  return `| ${name} | ${cols.join(" | ")} |`;
});
const spread = (L) => {
  const all = MONTH_NAMES.map((_, m) => exposure(m, L));
  return Math.max(...all) / Math.min(...all);
};
const march3 = exposure(2, 3);
const july3 = exposure(6, 3);

// ---------- 4. big movers ----------
const movers = [];
for (const which of ["long", "short"]) {
  dollar[which].forEach(({ plan, cost }, i) => {
    const d = i + 1;
    const own = liveOwnRank.get(plan.id);
    movers.push({
      plan,
      cost,
      which,
      dollar: d,
      own,
      all: liveRank.get(plan.id),
      move: own - d,
    });
  });
}
const big = movers
  .filter((m) => Math.abs(m.move) > 10)
  .sort((a, b) => Math.abs(b.move) - Math.abs(a.move));
const bigVsAll = movers.filter((m) => Math.abs(m.all - m.dollar) > 10).length;

// A short mechanism line from the plan's own numbers. It states what differs
// between the two rankings; it is generated, so it is worth a read before use.
function why(m) {
  const b = liveBreakdown.get(m.plan.id);
  const p = m.plan.pricePerKwh;
  const rate500 = (p.at500 * 100).toFixed(1);
  const dollarsPerMonth = usd(m.cost.rankedPerMonth);
  if (m.move > 0) {
    // ranks better in dollars than in the live list
    if (b.slope === 0) {
      return `live scoring gives it 0 of 3/12 slope points (V-trap or hump price curve) and it falls to ${m.own}; in dollars it costs ${dollarsPerMonth}/mo (${rate500}¢ at 500 kWh), which ranks ${m.dollar} in its list.`;
    }
    if (b.flexibility < 6 || b.green < 3) {
      return `live scoring held it down with flexibility ${b.flexibility.toFixed(1)} and green ${b.green.toFixed(1)} (term ${m.plan.termMonths} mo, fee ${feeOf(m.plan)}); it costs only ${dollarsPerMonth}/mo.`;
    }
    return `live scoring prices a plan by its 500 kWh rate (${rate500}¢, S_price ${b.price.toFixed(1)}), but it costs ${dollarsPerMonth}/mo over its own term, cheaper than the plans above it in the live list.`;
  }
  // ranks worse in dollars
  if (b.flexibility >= 8 || b.green >= 8) {
    return `live scoring lifted it with flexibility ${b.flexibility.toFixed(1)} and green ${b.green.toFixed(1)} (term ${m.plan.termMonths} mo, fee ${feeOf(m.plan)}); dollars ignore those, and it costs ${dollarsPerMonth}/mo.`;
  }
  return `live scoring priced it by its 500 kWh rate (${rate500}¢, S_price ${b.price.toFixed(1)}), but over its own term it costs ${dollarsPerMonth}/mo, more than ${m.dollar - 1} cheaper plans in its list.`;
}

// ---------- the document ----------
const nonYearTerms = dollar.long.filter(
  ({ plan }) => plan.termMonths % 12 !== 0,
);
const lines = [];
const out = (s = "") => lines.push(s);

out(`# Dollar ranking vs current live scoring: ${tdu}`);
out();
out(
  `Generated ${new Date().toISOString()} by \`scripts/dollar-ranking-comparison.mjs\`. Nothing here is a product rule from BRIEF.md; it is the proposal in branch \`feat/dollar-ranking\`, set beside the scoring that is live today.`,
);
out();
out("## Data and assumptions");
out();
out(
  `- Blob file: \`${latest.pathname}\`, uploaded ${new Date(latest.uploadedAt).toISOString()} (file \`generatedAt\` ${file.generatedAt}).`,
);
out(
  `- ${stored.length} ranked plans + ${touStored.length} time-of-use plans in the file. Time-of-use plans are not ranked in either method. ${plans.length} ranked plans analysed; ${notCosted} could not be costed (missing price or term).`,
);
out(
  `- Usage: ${usage} kWh a month (the page's default). Start month: ${MONTH_NAMES[startMonth]} (${startMonth === currentStartMonth() ? "the current month" : "chosen"}). The short list changes with the start month (see section 3); the long list does not, because every long plan is priced on its first twelve months.`,
);
out(
  `- Dollar ranking: two separate lists (under 12 months, 12 months and longer). A short plan is priced as the average of its real monthly bills over its own term; a long plan, whatever its term, over its FIRST 12 months, so 12, 14, 18, 24 and 36-month plans are measured on the same twelve calendar months. The real term and the real total over it are still shown. No score, weights, normalisation of prices or risk term.`,
);
out(
  `- Live scoring: \`scorePlans\` in \`ranking.ts\`, one combined list, 5/12 price (500 kWh rate) + 3/12 slope + 3/12 flexibility + 1/12 green. Its order ${sameAsStored ? "matches" : "DIFFERS FROM"} the order stored in the file.`,
);
out(
  `- "Live rank (own list)" is the plan's position in the live order among plans of the same list (long or short), so it can be compared with the dollar rank like for like. "Live rank (all plans)" is its position in the single combined live list.`,
);
out(
  `- Fragility: each row shows ranked per month at 20% more and 20% less usage, as a difference from its own figure. It is information only and does not enter the ranking.- Cancellation fee: per-remaining-month fees are shown as the worst-case total (fee x (term - 1)), as in BRIEF.md.`,
);
out();
out("## 1 and 2. Top 10 of each list, with the live positions");
out();
out(`### Long list: 12 months and longer (${dollar.long.length} plans)`);
out();
out(topTable("long"));
out();
out(`### Short list: under 12 months (${dollar.short.length} plans)`);
out();
out(topTable("short"));
out();
out("## 3. Average seasonal exposure by start month");
out();
out(
  "Mean of the twelve EIA factors over the months a contract covers (1.00 = an average month). In brackets: that figure divided by the lowest start month for the same term.",
);
out();
out("| Start month | 3-month term | 6-month term | 12-month term |");
out("|---|---:|---:|---:|");
exposureRows.forEach((r) => out(r));
out();
out(
  `- A 3-month contract signed in July carries ${(july3 / march3).toFixed(2)}x the seasonal exposure of the same contract signed in March (${july3.toFixed(4)} vs ${march3.toFixed(4)}).`,
);
out(
  `- Best start month to worst, by term: 3 months ${spread(3).toFixed(2)}x, 6 months ${spread(6).toFixed(2)}x, 12 months ${spread(12).toFixed(5)}x.`,
);
out(
  `- The twelve factors are normalised to sum to exactly ${SEASON.reduce((a, b) => a + Math.round(b * 1e4), 0) / 1e4} (the published figures add up to 12.0001; only August moves, 1.4299 to 1.4298), so a whole number of years is flat.`,
);
out(
  `- ${nonYearTerms.length} of the ${dollar.long.length} plans in the long list have a term that is not a whole number of years (${[...new Set(nonYearTerms.map(({ plan }) => plan.termMonths))].sort((a, b) => a - b).join(", ") || "none"} months). They are now priced on their first twelve months like every other long plan, so the extra months no longer give them a calendar discount (table above).`,
);
out();
out(
  "Average seasonal exposure of a long contract signed in November, over its whole term (the figure the earlier version ranked on) against its first twelve months (the figure used now):",
);
out();
out(
  "| Term | Exposure over the whole term | Difference from a 12-month plan | Exposure over the first 12 months |",
);
out("|---:|---:|---:|---:|");
for (const L of [12, 13, 14, 15, 18, 24, 36]) {
  const e = exposure(10, L);
  out(
    `| ${L} months | ${e.toFixed(4)} | ${(Math.abs((e / exposure(10, 12) - 1) * 100) < 0.005 ? 0 : (e / exposure(10, 12) - 1) * 100).toFixed(2)}% | ${exposure(10, 12).toFixed(4)} |`,
  );
}
out();
out("## 4. Plans whose rank moves more than 10 places");
out();
out(
  `Movement = live rank in the plan's own list minus its dollar rank (positive = better in dollars). ${big.length} of ${movers.length} plans move more than 10 places on that basis; measured against the single combined live list instead, ${bigVsAll} do.`,
);
out();
if (big.length > 0) {
  out(
    "| Plan | Provider | Term | List | Dollar rank | Live rank (own list) | Moved | Why |",
  );
  out("|---|---|---:|---|---:|---:|---:|---|");
  for (const m of big) {
    out(
      `| ${cell(m.plan.planName)} | ${cell(m.plan.companyName)} | ${m.plan.termMonths} | ${m.which} | ${m.dollar} | ${m.own} | ${sign(m.move)} | ${cell(why(m))} |`,
    );
  }
  out();
  out(
    'The "Why" column is generated from each plan\'s own numbers by a fixed rule (slope penalty, flexibility or green points, or the 500 kWh rate versus the full cost), not written by hand. Read it before presenting.',
  );
} else {
  out("No plan moves more than 10 places.");
}
out();

out("## 5. How much the top of each list depends on the start month");
out();
out(
  "Cheapest plan of each list if the contract started in each month (same usage, same data). The long list is priced on the same twelve months whatever the start month, so its winner should not move; the short list is priced on each plan's own months, so it can.",
);
out();
out("| Start month | Long list #1 | Per month | Short list #1 | Per month |");
out("|---|---|---:|---|---:|");
const topByMonth = MONTH_NAMES.map((name, m) => {
  const l = rankByContractCost(plans, "long", usage, m)[0];
  const sh = rankByContractCost(plans, "short", usage, m)[0];
  out(
    `| ${name} | ${cell(l.plan.planName)} (${l.plan.termMonths} mo) | ${usd(l.cost.rankedPerMonth)} | ${cell(sh.plan.planName)} (${sh.plan.termMonths} mo) | ${usd(sh.cost.rankedPerMonth)} |`,
  );
  return { l: l.plan.id, s: sh.plan.id };
});
out();
out(
  `The long list has ${new Set(topByMonth.map((t) => t.l)).size} different #1 plan(s) across the twelve start months; the short list has ${new Set(topByMonth.map((t) => t.s)).size}.`,
);
out();

// ---------- 6. against the previous version (long list ranked on the own-term average) ----------
const prevLong = [...dollar.long].sort(
  (a, b) =>
    Math.round(a.cost.perMonth * 100) - Math.round(b.cost.perMonth * 100) ||
    plans.indexOf(a.plan) - plans.indexOf(b.plan),
);
const prevRank = new Map(prevLong.map(({ plan }, i) => [plan.id, i + 1]));
const moved = dollar.long
  .map(({ plan, cost }, i) => ({
    plan,
    cost,
    now: i + 1,
    before: prevRank.get(plan.id),
  }))
  .map((m) => ({ ...m, change: m.before - m.now }))
  .filter((m) => m.change !== 0)
  .sort((a, b) => Math.abs(b.change) - Math.abs(a.change) || a.now - b.now);
const prevShort = [...dollar.short].sort(
  (a, b) =>
    Math.round(a.cost.perMonth * 100) - Math.round(b.cost.perMonth * 100) ||
    plans.indexOf(a.plan) - plans.indexOf(b.plan),
);
const shortSame = prevShort.every(
  ({ plan }, i) => plan.id === dollar.short[i].plan.id,
);
out("## 6. What moved against the previous version");
out();
out(
  "The previous version ranked the long list on each plan's average over its OWN term; this one ranks it on the first twelve months. Positive = moved up now.",
);
out();
out(
  `- Short list: ${shortSame ? "identical order (it is still priced on each plan's own term)" : "ORDER CHANGED, which should not happen"}.`,
);
out(
  `- Long list: ${moved.length} of ${dollar.long.length} plans change rank; all ${dollar.long.filter(({ plan }) => plan.termMonths % 12 === 0).length} plans with a whole-year term (12, 24, 36) keep their relative order among themselves: ${(() => {
    const whole = (list) =>
      list
        .filter(({ plan }) => plan.termMonths % 12 === 0)
        .map(({ plan }) => plan.id)
        .join();
    return whole(prevLong) === whole(dollar.long) ? "yes" : "NO";
  })()}.`,
);
out();
out("Top 10 of the long list, then and now:");
out();
out("| Rank | Previous version | Now |");
out("|---:|---|---|");
for (let i = 0; i < 10; i++) {
  const a = prevLong[i];
  const b = dollar.long[i];
  out(
    `| ${i + 1} | ${cell(a.plan.planName)} (${a.plan.termMonths} mo, ${usd(a.cost.perMonth)}) | ${cell(b.plan.planName)} (${b.plan.termMonths} mo, ${usd(b.cost.rankedPerMonth)}) |`,
  );
}
out();
out("Every plan that moved, largest move first:");
out();
out(
  "| Plan | Provider | Term | Previous rank | Rank now | Moved | Per month before | Per month now |",
);
out("|---|---|---:|---:|---:|---:|---:|---:|");
for (const m of moved) {
  out(
    `| ${cell(m.plan.planName)} | ${cell(m.plan.companyName)} | ${m.plan.termMonths} | ${m.before} | ${m.now} | ${sign(m.change)} | ${usd(m.cost.perMonth)} | ${usd(m.cost.rankedPerMonth)} |`,
  );
}
out();

mkdirSync(resolve(root, "analysis"), { recursive: true });
const path = resolve(root, "analysis", "dollar-ranking-comparison.md");
writeFileSync(path, lines.join("\n") + "\n");
console.log(`WROTE ${path}`);
console.log(
  `blob ${latest.pathname} (${new Date(latest.uploadedAt).toISOString()}); ${plans.length} plans; long ${dollar.long.length}, short ${dollar.short.length}, not costed ${notCosted}; live order matches stored: ${sameAsStored}; movers >10: ${big.length}`,
);
