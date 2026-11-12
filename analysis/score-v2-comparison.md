# Score v2 vs dollar ranking vs live scoring: oncor

Generated 2026-11-12T07:14:12.592Z by `scripts/score-v2-comparison.mjs`. This is the proposal in branch `feat/score-v2`, set beside `feat/dollar-ranking` and the scoring that is live today. Nothing here is a product rule from BRIEF.md (BRIEF.md still describes the live 5/3/3/1 scoring).

## Data and definitions

- Blob file: `plans/oncor-1794390141700.json`, uploaded 2026-11-11T09:42:22.000Z (file `generatedAt` 2026-11-11T09:42:21.700Z).
- 126 ranked plans + 5 time-of-use plans in the file; time-of-use plans are not ranked by any of the three. 126 ranked plans, 126 scored by v2.
- Usage 1000 kWh a month (the page's default). The dollar ranking's short list also depends on the start month (Nov, the current month); v2 has no seasonal factor.
- **Score v2**: (8 S_cost + 3 S_flex + 1 S_green) / 12. S_cost = 10 (cost_max - cost) / (cost_max - cost_min) over the plans shown, cost = the estimated monthly bill at 1000 kWh (the piecewise-linear cost curve through the three published prices, to the cent). S_flex = 0.5 S_term + 0.5 S_fee; S_term = 10 min(L, 12) / 12; S_fee = 10 (1 - fee / max_fee) with max_fee = $700.00 (the highest fee in the data). S_green = renewable % / 10. No S_slope, no seasonal factor.
- **feat/dollar-ranking**: two lists (under 12 months / 12 months and longer), each ordered by average monthly bill (long plans over their first 12 months, short plans over their own term). "Position" there is the rank inside the plan's own list.
- **Live scoring**: `scorePlans` in `ranking.ts`, one list, 5/12 price (500 kWh rate) + 3/12 slope + 3/12 flexibility (old term-point table) + 1/12 green.
- Equal bills are compared to the cent and ties keep the stored order.

## 1 and 2. Top 10 under score v2, with the same plans on the other two

| Rank (v2) | Plan | Provider | Term (mo) | Cancellation fee | Score | S_cost | S_term | S_fee | S_green | Monthly bill | feat/dollar-ranking | Live scoring |
|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|
| 1 | SmartGreen 3 | SMARTENERGY HOLDINGS LLC | 3 | none | 9.063 | 10.00 | 2.50 | 10.00 | 10.00 | $100.00 | short #2 | 1 |
| 2 | Gexa Eco Choice 3 | GEXA ENERGY | 3 | $150 | 8.706 | 9.87 | 2.50 | 7.86 | 10.00 | $101.00 | short #3 | 2 |
| 3 | Digital Choice 6 | RHYTHM | 6 | $100 | 8.308 | 8.67 | 5.00 | 8.57 | 10.00 | $110.00 | short #9 | 64 |
| 4 | No Bull 6 | Energy Texas | 6 | $100 | 8.308 | 8.67 | 5.00 | 8.57 | 10.00 | $110.00 | short #10 | 65 |
| 5 | Think Basic 3 | Think Energy | 3 | none | 8.260 | 9.73 | 2.50 | 10.00 | 2.50 | $102.00 | short #8 | 6 |
| 6 | Gexa Eco Choice 6 | GEXA ENERGY | 6 | $150 | 8.218 | 8.67 | 5.00 | 7.86 | 10.00 | $110.00 | short #11 | 3 |
| 7 | Companion Pro + Perks 3 | Companion Energy | 3 | $150 | 8.122 | 9.87 | 2.50 | 7.86 | 3.00 | $101.00 | short #4 | 4 |
| 8 | Frontier Power Saver 3 | FRONTIER UTILITIES | 3 | $150 | 8.122 | 9.87 | 2.50 | 7.86 | 3.00 | $101.00 | short #5 | 5 |
| 9 | Sustainable Living Bundle - 3 | JUST ENERGY | 3 | $175 | 8.100 | 10.00 | 2.50 | 7.50 | 2.20 | $100.00 | short #1 | 7 |
| 10 | Sustainable Lifestyle - 3 | AMIGO ENERGY | 3 | $175 | 8.011 | 9.87 | 2.50 | 7.50 | 2.20 | $101.00 | short #6 | 8 |

## 3. Term mix of the top 10

| Ranking | 3 months | 6 months | 12 months | Over 12 months | Other under 12 |
|---|---:|---:|---:|---:|---:|
| **Score v2** | 7 | 3 | 0 | 0 | 0 |
| Same formula with the OLD term-point table instead of S_term (control) | 8 | 2 | 0 | 0 | 0 |
| Live scoring | 8 | 1 | 1 | 0 | 0 |
| feat/dollar-ranking, long list | 0 | 0 | 7 | 3 | 0 |
| feat/dollar-ranking, short list | 8 | 2 | 0 | 0 | 0 |

- 12-month plans in the v2 top 10: **0**.
- 12-month plans in the top 10 of the control (same bill-only price factor, old term table): **0**.
- So S_term alone does NOT bring any 12-month plan into the top 10 when the price factor is the plain bill.
- Best 12-month plan under v2: Octo Simple 12 (Octopus Energy), rank #13, score 7.865 (S_cost 7.20, S_term 10.00, S_fee 7.86, S_green 10.00, bill $121.00); the cheapest bill of any plan is $100.00, the #1 plan's is $100.00 with S_term 2.50.
- The score gap between the best 3-month plan and the best 12-month plan: 1.197 points (3-month minus 12-month; positive = the 3-month plan is ahead).

## 4. Top 10 on one branch and outside the top 25 on the other

Compared: score v2 (one list) against feat/dollar-ranking (rank inside each plan's own list). The factor named is the one with the largest contribution to the move, measured in weighted score points.

| Plan | Provider | Term | Where | Which factor moved it |
|---|---|---:|---|---|
| True Value 24 | TRUE POWER | 24 | top 10 of the dollar long list (#2), v2 #33 | price (S_cost) is 1.46 points below the v2 top-10 average (S_cost 7.33, S_term 10.00, S_fee 5.71, S_green 1.50). |
| True Value 12 | TRUE POWER | 12 | top 10 of the dollar long list (#1), v2 #31 | price (S_cost) is 1.37 points below the v2 top-10 average (S_cost 7.47, S_term 10.00, S_fee 5.71, S_green 1.50). |
| Frontier Power Saver 12 | FRONTIER UTILITIES | 12 | top 10 of the dollar long list (#10), v2 #29 | price (S_cost) is 1.72 points below the v2 top-10 average (S_cost 6.93, S_term 10.00, S_fee 7.86, S_green 3.00). |
| TrueClassic 12 | AP GAS & ELECTRIC (TX) LLC | 12 | top 10 of the dollar long list (#4), v2 #28 | price (S_cost) is 1.55 points below the v2 top-10 average (S_cost 7.20, S_term 10.00, S_fee 8.21, S_green 0.60). |

- Top 10 of a dollar list and outside the v2 top 25: 4. Top 10 under v2 and outside the top 25 of the plan's dollar list: 0.

## Other things visible in the top 10

- Plans carrying the V-trap / hump badge in the v2 top 10: 2 (Digital Choice 6 #3, live scoring #64; No Bull 6 #4, live scoring #65). v2 has no slope term, so the badge no longer costs a plan 3 of 12 points.
- Plans in the top 10 with an identical score to another (sold under two brand names, same price and terms; the stored order separates them): Digital Choice 6 / No Bull 6; Companion Pro + Perks 3 / Frontier Power Saver 3.

