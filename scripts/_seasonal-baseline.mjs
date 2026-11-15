// FROZEN COPY of the old seasonal dollar ranking. It is NOT the formula the app
// runs; it is the HISTORICAL BASELINE the analysis scripts compare against. It is
// what rankByContractCost (contractCost.ts) did before it dropped SEASON: each
// month of the contract is billed at usage x that calendar month's factor, and a
// long plan is judged on its first 12 months. The app now ranks on C(u0) alone
// (no season, no start month). Nothing under frontend/src imports this file.
// It is built on contractCost() and termListOf(), which still exist unchanged.
export function seasonalRanker({
  contractCost,
  termListOf,
  currentStartMonth,
}) {
  return function rankSeasonal(
    plans,
    list,
    usage,
    startMonth = currentStartMonth(),
  ) {
    const costed = [];
    plans.forEach((plan, index) => {
      if (termListOf(plan) !== list) return;
      const cost = contractCost(plan, usage, startMonth);
      if (cost !== null) costed.push({ plan, cost, index });
    });
    const cents = (c) => Math.round(c.rankedPerMonth * 100);
    return costed
      .sort((a, b) => cents(a.cost) - cents(b.cost) || a.index - b.index)
      .map(({ plan, cost }) => ({ plan, cost }));
  };
}
