# Dollar ranking vs current live scoring: oncor

Generated 2026-11-12T06:54:05.993Z by `scripts/dollar-ranking-comparison.mjs`. Nothing here is a product rule from BRIEF.md; it is the proposal in branch `feat/dollar-ranking`, set beside the scoring that is live today.

## Data and assumptions

- Blob file: `plans/oncor-1794390141700.json`, uploaded 2026-11-11T09:42:22.000Z (file `generatedAt` 2026-11-11T09:42:21.700Z).
- 126 ranked plans + 5 time-of-use plans in the file. Time-of-use plans are not ranked in either method. 126 ranked plans analysed; 0 could not be costed (missing price or term).
- Usage: 1000 kWh a month (the page's default). Start month: Nov (the current month). The short list changes with the start month (see section 3); the long list does not, because every long plan is priced on its first twelve months.
- Dollar ranking: two separate lists (under 12 months, 12 months and longer). A short plan is priced as the average of its real monthly bills over its own term; a long plan, whatever its term, over its FIRST 12 months, so 12, 14, 18, 24 and 36-month plans are measured on the same twelve calendar months. The real term and the real total over it are still shown. No score, weights, normalisation of prices or risk term.
- Live scoring: `scorePlans` in `ranking.ts`, one combined list, 5/12 price (500 kWh rate) + 3/12 slope + 3/12 flexibility + 1/12 green. Its order matches the order stored in the file.
- "Live rank (own list)" is the plan's position in the live order among plans of the same list (long or short), so it can be compared with the dollar rank like for like. "Live rank (all plans)" is its position in the single combined live list.
- Fragility: each row shows ranked per month at 20% more and 20% less usage, as a difference from its own figure. It is information only and does not enter the ranking.- Cancellation fee: per-remaining-month fees are shown as the worst-case total (fee x (term - 1)), as in BRIEF.md.

## 1 and 2. Top 10 of each list, with the live positions

### Long list: 12 months and longer (79 plans)

| Rank | Plan | Provider | Term (mo) | Cancellation fee | Ranked per month | Total | Months covered | Most expensive month | 20% more / 20% less usage (per month) | Renewable | Live rank (all plans) | Live rank (own list) | Moved up (+) / down (-) vs own list |
|---:|---|---|---:|---:|---:|---|---|---:|---:|---:|---:|---:|---:|
| 1 | True Value 12 | TRUE POWER | 12 | $300 | $119.00 | $1,428.00 over 12 mo | Nov, Dec, Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct | $168.43 | +23 / -23 | 15% | 24 | 8 | +7 |
| 2 | True Value 24 | TRUE POWER | 24 | $300 | $120.00 | $2,880.00 over 24 mo | Nov to Oct, 24 months | $169.86 | +23 / -23 | 15% | 45 | 19 | +17 |
| 3 | Octo Simple 12 | Octopus Energy | 12 | $150 | $120.90 | $1,450.78 over 12 mo | Nov, Dec, Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct | $173.01 | +24 / -24 | 100% | 83 | 42 | +39 |
| 4 | TrueClassic 12 | AP GAS & ELECTRIC (TX) LLC | 12 | $125 | $121.00 | $1,452.00 over 12 mo | Nov, Dec, Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct | $171.29 | +23 / -23 | 6% | 19 | 5 | +1 |
| 5 | Octo Simple 14 | Octopus Energy | 14 | $200 | $121.10 | $1,642.60 over 14 mo | Nov to Dec, 14 months | $173.87 | +25 / -24 | 100% | 95 | 52 | +47 |
| 6 | No Bull 12 | Energy Texas | 12 | $220 | $121.20 | $1,454.43 over 12 mo | Nov, Dec, Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct | $173.87 | +24 / -24 | 100% | 91 | 48 | +42 |
| 7 | Digital Choice 12 | RHYTHM | 12 | $220 | $121.20 | $1,454.43 over 12 mo | Nov, Dec, Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct | $173.87 | +24 / -24 | 100% | 92 | 49 | +42 |
| 8 | No Gimmicks 18 | Budget Power | 18 | $125 | $122.10 | $2,076.03 over 18 mo | Nov to Apr, 18 months | $172.72 | +24 / -23 | 24% | 34 | 12 | +4 |
| 9 | Gexa Eco Choice 12 | GEXA ENERGY | 12 | $150 | $123.00 | $1,476.00 over 12 mo | Nov, Dec, Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct | $174.15 | +24 / -24 | 100% | 10 | 1 | -8 |
| 10 | Frontier Power Saver 12 | FRONTIER UTILITIES | 12 | $150 | $123.00 | $1,476.00 over 12 mo | Nov, Dec, Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct | $174.15 | +24 / -24 | 30% | 16 | 2 | -8 |

### Short list: under 12 months (47 plans)

| Rank | Plan | Provider | Term (mo) | Cancellation fee | Ranked per month | Total | Months covered | Most expensive month | 20% more / 20% less usage (per month) | Renewable | Live rank (all plans) | Live rank (own list) | Moved up (+) / down (-) vs own list |
|---:|---|---|---:|---:|---:|---|---|---:|---:|---:|---:|---:|---:|
| 1 | Sustainable Living Bundle - 3 | JUST ENERGY | 3 | $175 | $86.56 | $259.69 over 3 mo | Nov, Dec, Jan | $99.37 | +16 / -16 | 22% | 7 | 7 | +6 |
| 2 | SmartGreen 3 | SMARTENERGY HOLDINGS LLC | 3 | none | $86.71 | $260.12 over 3 mo | Nov, Dec, Jan | $99.37 | +15 / -16 | 100% | 1 | 1 | -1 |
| 3 | Gexa Eco Choice 3 | GEXA ENERGY | 3 | $150 | $86.83 | $260.49 over 3 mo | Nov, Dec, Jan | $100.33 | +17 / -17 | 100% | 2 | 2 | -1 |
| 4 | Companion Pro + Perks 3 | Companion Energy | 3 | $150 | $86.83 | $260.49 over 3 mo | Nov, Dec, Jan | $100.33 | +17 / -17 | 30% | 4 | 4 | 0 |
| 5 | Frontier Power Saver 3 | FRONTIER UTILITIES | 3 | $150 | $86.83 | $260.49 over 3 mo | Nov, Dec, Jan | $100.33 | +17 / -17 | 30% | 5 | 5 | 0 |
| 6 | Sustainable Lifestyle - 3 | AMIGO ENERGY | 3 | $175 | $87.42 | $262.25 over 3 mo | Nov, Dec, Jan | $100.36 | +16 / -16 | 22% | 8 | 8 | +2 |
| 7 | Sustainable Home Bundle - 3 | TARA ENERGY | 3 | $175 | $87.42 | $262.25 over 3 mo | Nov, Dec, Jan | $100.36 | +16 / -16 | 22% | 9 | 9 | +2 |
| 8 | Think Basic 3 | Think Energy | 3 | none | $88.42 | $265.25 over 3 mo | Nov, Dec, Jan | $101.36 | +16 / -16 | 25% | 6 | 6 | -2 |
| 9 | Digital Choice 6 | RHYTHM | 6 | $100 | $91.01 | $546.06 over 6 mo | Nov, Dec, Jan, Feb, Mar, Apr | $109.24 | +18 / -18 | 100% | 64 | 34 | +25 |
| 10 | No Bull 6 | Energy Texas | 6 | $100 | $91.01 | $546.06 over 6 mo | Nov, Dec, Jan, Feb, Mar, Apr | $109.24 | +18 / -18 | 100% | 65 | 35 | +25 |

## 3. Average seasonal exposure by start month

Mean of the twelve EIA factors over the months a contract covers (1.00 = an average month). In brackets: that figure divided by the lowest start month for the same term.

| Start month | 3-month term | 6-month term | 12-month term |
|---|---:|---:|---:|
| Jan | 0.8911 (1.11x) | 0.9102 (1.10x) | 1.0000 (1.00x) |
| Feb | 0.8008 (1.00x) | 0.9772 (1.18x) | 1.0000 (1.00x) |
| Mar | 0.8006 (1.00x) | 1.0672 (1.29x) | 1.0000 (1.00x) |
| Apr | 0.9293 (1.16x) | 1.1381 (1.38x) | 1.0000 (1.00x) |
| May | 1.1537 (1.44x) | 1.1726 (1.42x) | 1.0000 (1.00x) |
| Jun | 1.3337 (1.67x) | 1.1466 (1.39x) | 1.0000 (1.00x) |
| Jul | 1.3468 (1.68x) | 1.0898 (1.32x) | 1.0000 (1.00x) |
| Aug | 1.1916 (1.49x) | 1.0228 (1.24x) | 1.0000 (1.00x) |
| Sep | 0.9595 (1.20x) | 0.9329 (1.13x) | 1.0000 (1.00x) |
| Oct | 0.8328 (1.04x) | 0.8619 (1.04x) | 1.0000 (1.00x) |
| Nov | 0.8539 (1.07x) | 0.8274 (1.00x) | 1.0000 (1.00x) |
| Dec | 0.9062 (1.13x) | 0.8534 (1.03x) | 1.0000 (1.00x) |

- A 3-month contract signed in July carries 1.68x the seasonal exposure of the same contract signed in March (1.3468 vs 0.8006).
- Best start month to worst, by term: 3 months 1.68x, 6 months 1.42x, 12 months 1.00000x.
- The twelve factors are normalised to sum to exactly 12 (the published figures add up to 12.0001; only August moves, 1.4299 to 1.4298), so a whole number of years is flat.
- 10 of the 79 plans in the long list have a term that is not a whole number of years (13, 14, 15, 18 months). They are now priced on their first twelve months like every other long plan, so the extra months no longer give them a calendar discount (table above).

Average seasonal exposure of a long contract signed in November, over its whole term (the figure the earlier version ranked on) against its first twelve months (the figure used now):

| Term | Exposure over the whole term | Difference from a 12-month plan | Exposure over the first 12 months |
|---:|---:|---:|---:|
| 12 months | 1.0000 | 0.00% | 1.0000 |
| 13 months | 0.9795 | -2.05% | 1.0000 |
| 14 months | 0.9692 | -3.08% | 1.0000 |
| 15 months | 0.9708 | -2.92% | 1.0000 |
| 18 months | 0.9425 | -5.75% | 1.0000 |
| 24 months | 1.0000 | 0.00% | 1.0000 |
| 36 months | 1.0000 | 0.00% | 1.0000 |

## 4. Plans whose rank moves more than 10 places

Movement = live rank in the plan's own list minus its dollar rank (positive = better in dollars). 43 of 126 plans move more than 10 places on that basis; measured against the single combined live list instead, 88 do.

| Plan | Provider | Term | List | Dollar rank | Live rank (own list) | Moved | Why |
|---|---|---:|---|---:|---:|---:|---|
| Octo Simple 14 | Octopus Energy | 14 | long | 5 | 52 | +47 | live scoring gives it 0 of 3/12 slope points (V-trap or hump price curve) and it falls to 52; in dollars it costs $121.10/mo (12.0¢ at 500 kWh), which ranks 5 in its list. |
| No Bull 12 | Energy Texas | 12 | long | 6 | 48 | +42 | live scoring gives it 0 of 3/12 slope points (V-trap or hump price curve) and it falls to 48; in dollars it costs $121.20/mo (12.1¢ at 500 kWh), which ranks 6 in its list. |
| Digital Choice 12 | RHYTHM | 12 | long | 7 | 49 | +42 | live scoring gives it 0 of 3/12 slope points (V-trap or hump price curve) and it falls to 49; in dollars it costs $121.20/mo (12.1¢ at 500 kWh), which ranks 7 in its list. |
| Octo Simple 12 | Octopus Energy | 12 | long | 3 | 42 | +39 | live scoring gives it 0 of 3/12 slope points (V-trap or hump price curve) and it falls to 42; in dollars it costs $120.90/mo (12.0¢ at 500 kWh), which ranks 3 in its list. |
| Embrace Green 12 - New Customer Special | CleanSky Energy | 12 | long | 46 | 7 | -39 | live scoring lifted it with flexibility 9.5 and green 10.0 (term 12 mo, fee $75); dollars ignore those, and it costs $138.00/mo. |
| Digital Choice 24 | RHYTHM | 24 | long | 41 | 76 | +35 | live scoring gives it 0 of 3/12 slope points (V-trap or hump price curve) and it falls to 76; in dollars it costs $135.20/mo (13.5¢ at 500 kWh), which ranks 41 in its list. |
| No Bull 24 | Energy Texas | 24 | long | 42 | 77 | +35 | live scoring gives it 0 of 3/12 slope points (V-trap or hump price curve) and it falls to 77; in dollars it costs $135.20/mo (13.5¢ at 500 kWh), which ranks 42 in its list. |
| Daisy Green 12 | BKV Energy | 12 | long | 48 | 13 | -35 | live scoring lifted it with flexibility 8.4 and green 10.0 (term 12 mo, fee $220); dollars ignore those, and it costs $139.00/mo. |
| Octo Simple 18 | Octopus Energy | 18 | long | 44 | 74 | +30 | live scoring gives it 0 of 3/12 slope points (V-trap or hump price curve) and it falls to 74; in dollars it costs $136.10/mo (13.5¢ at 500 kWh), which ranks 44 in its list. |
| Pollution Free e-Plus 12 Choice | GREEN MOUNTAIN ENERGY COMPANY | 12 | long | 69 | 39 | -30 | live scoring lifted it with flexibility 8.9 and green 10.0 (term 12 mo, fee $150); dollars ignore those, and it costs $154.90/mo. |
| Think Clean 12 | Think Energy | 12 | long | 57 | 29 | -28 | live scoring lifted it with flexibility 8.6 and green 10.0 (term 12 mo, fee $200); dollars ignore those, and it costs $144.10/mo. |
| Embrace Green 24 - New Customer Special | CleanSky Energy | 24 | long | 53 | 27 | -26 | live scoring lifted it with flexibility 7.4 and green 10.0 (term 24 mo, fee $150); dollars ignore those, and it costs $142.00/mo. |
| Octo Simple 6 | Octopus Energy | 6 | short | 14 | 40 | +26 | live scoring gives it 0 of 3/12 slope points (V-trap or hump price curve) and it falls to 40; in dollars it costs $93.32/mo (11.2¢ at 500 kWh), which ranks 14 in its list. |
| Digital Choice 6 | RHYTHM | 6 | short | 9 | 34 | +25 | live scoring gives it 0 of 3/12 slope points (V-trap or hump price curve) and it falls to 34; in dollars it costs $91.01/mo (11.0¢ at 500 kWh), which ranks 9 in its list. |
| No Bull 6 | Energy Texas | 6 | short | 10 | 35 | +25 | live scoring gives it 0 of 3/12 slope points (V-trap or hump price curve) and it falls to 35; in dollars it costs $91.01/mo (11.0¢ at 500 kWh), which ranks 10 in its list. |
| SmartGreen 12 $200 Bill Credit | SMARTENERGY HOLDINGS LLC | 12 | long | 45 | 22 | -23 | live scoring lifted it with flexibility 8.4 and green 10.0 (term 12 mo, fee $220); dollars ignore those, and it costs $137.90/mo. |
| Saver 12 | Discount Power | 12 | long | 55 | 32 | -23 | live scoring lifted it with flexibility 8.9 and green 2.2 (term 12 mo, fee $150); dollars ignore those, and it costs $143.80/mo. |
| Octo Simple 3 | Octopus Energy | 3 | short | 16 | 39 | +23 | live scoring gives it 0 of 3/12 slope points (V-trap or hump price curve) and it falls to 39; in dollars it costs $95.49/mo (11.1¢ at 500 kWh), which ranks 16 in its list. |
| SoFed Better Rate - 36 | SOUTHERN FEDERAL POWER LLC | 36 | long | 28 | 50 | +22 | live scoring held it down with flexibility 5.7 and green 0.6 (term 36 mo, fee $249); it costs only $130.20/mo. |
| Digital Choice 36 | RHYTHM | 36 | long | 58 | 78 | +20 | live scoring gives it 0 of 3/12 slope points (V-trap or hump price curve) and it falls to 78; in dollars it costs $145.20/mo (14.5¢ at 500 kWh), which ranks 58 in its list. |
| No Bull 36 | Energy Texas | 36 | long | 59 | 79 | +20 | live scoring gives it 0 of 3/12 slope points (V-trap or hump price curve) and it falls to 79; in dollars it costs $145.20/mo (14.5¢ at 500 kWh), which ranks 59 in its list. |
| Daisy 12 | BKV Energy | 12 | long | 49 | 30 | -19 | live scoring lifted it with flexibility 8.4 and green 2.9 (term 12 mo, fee $220); dollars ignore those, and it costs $139.00/mo. |
| Digital Choice 3 | RHYTHM | 3 | short | 18 | 36 | +18 | live scoring gives it 0 of 3/12 slope points (V-trap or hump price curve) and it falls to 36; in dollars it costs $96.49/mo (11.3¢ at 500 kWh), which ranks 18 in its list. |
| No Bull 3 | Energy Texas | 3 | short | 19 | 37 | +18 | live scoring gives it 0 of 3/12 slope points (V-trap or hump price curve) and it falls to 37; in dollars it costs $96.49/mo (11.3¢ at 500 kWh), which ranks 19 in its list. |
| True Value 24 | TRUE POWER | 24 | long | 2 | 19 | +17 | live scoring held it down with flexibility 6.4 and green 1.5 (term 24 mo, fee $300); it costs only $120.00/mo. |
| PTC 12 Month - Postpaid | PAYLESS POWER | 12 | long | 61 | 44 | -17 | live scoring lifted it with flexibility 8.6 and green 2.6 (term 12 mo, fee $199); dollars ignore those, and it costs $150.00/mo. |
| Embrace Green 6 - New Customer Special | CleanSky Energy | 6 | short | 32 | 15 | -17 | live scoring lifted it with flexibility 8.6 and green 10.0 (term 6 mo, fee $50); dollars ignore those, and it costs $112.39/mo. |
| True Value 36 | TRUE POWER | 36 | long | 18 | 34 | +16 | live scoring held it down with flexibility 5.4 and green 1.5 (term 36 mo, fee $300); it costs only $129.00/mo. |
| Smart & Fixed - 36 | Ranchero Power | 36 | long | 27 | 43 | +16 | live scoring held it down with flexibility 6.2 and green 0.6 (term 36 mo, fee $179); it costs only $130.20/mo. |
| Stars and Stripes 36 | REVOLUTION ENERGY LLC | 36 | long | 40 | 56 | +16 | live scoring held it down with flexibility 4.8 and green 2.4 (term 36 mo, fee $375); it costs only $135.00/mo. |
| Chariot Choice 24 | CHARIOT ENERGY | 24 | long | 21 | 6 | -15 | live scoring lifted it with flexibility 7.8 and green 10.0 (term 24 mo, fee $99); dollars ignore those, and it costs $130.00/mo. |
| Think Clean 24 | Think Energy | 24 | long | 62 | 47 | -15 | live scoring lifted it with flexibility 7.1 and green 10.0 (term 24 mo, fee $200); dollars ignore those, and it costs $150.90/mo. |
| SmartGreen 9 $200 Bill Credit | SMARTENERGY HOLDINGS LLC | 9 | short | 38 | 23 | -15 | live scoring lifted it with flexibility 7.9 and green 10.0 (term 9 mo, fee $160); dollars ignore those, and it costs $123.14/mo. |
| Choose 15 | SPARK ENERGY LLC | 15 | long | 30 | 16 | -14 | live scoring lifted it with flexibility 8.8 and green 3.7 (term 15 mo, fee $100); dollars ignore those, and it costs $132.00/mo. |
| Chariot Choice 36 | CHARIOT ENERGY | 36 | long | 31 | 17 | -14 | live scoring lifted it with flexibility 6.8 and green 10.0 (term 36 mo, fee $99); dollars ignore those, and it costs $133.00/mo. |
| Essential Infusion 36 | INFUSE ENERGY | 36 | long | 39 | 53 | +14 | live scoring held it down with flexibility 4.8 and green 2.4 (term 36 mo, fee $375); it costs only $135.00/mo. |
| Pollution Free e-Plus 24 Choice | GREEN MOUNTAIN ENERGY COMPANY | 24 | long | 76 | 62 | -14 | live scoring lifted it with flexibility 6.4 and green 10.0 (term 24 mo, fee $295); dollars ignore those, and it costs $155.90/mo. |
| Choose 12 | SPARK ENERGY LLC | 12 | long | 22 | 9 | -13 | live scoring lifted it with flexibility 9.3 and green 3.7 (term 12 mo, fee $100); dollars ignore those, and it costs $130.00/mo. |
| Choose 12 | Texans Choice Power LLC | 12 | long | 23 | 10 | -13 | live scoring lifted it with flexibility 9.3 and green 3.7 (term 12 mo, fee $100); dollars ignore those, and it costs $130.00/mo. |
| Champ Saver-12 | CHAMPION ENERGY SERVICES LLC | 12 | long | 36 | 23 | -13 | live scoring lifted it with flexibility 8.9 and green 2.5 (term 12 mo, fee $150); dollars ignore those, and it costs $134.00/mo. |
| Smart Simple 10 | CIRRO ENERGY | 10 | short | 41 | 28 | -13 | live scoring lifted it with flexibility 8.3 and green 2.2 (term 10 mo, fee $95); dollars ignore those, and it costs $128.96/mo. |
| Smart Simple 36 | CIRRO ENERGY | 36 | long | 47 | 59 | +12 | live scoring held it down with flexibility 4.7 and green 2.2 (term 36 mo, fee $395); it costs only $138.80/mo. |
| Smart Simple 8 | CIRRO ENERGY | 8 | short | 30 | 19 | -11 | live scoring lifted it with flexibility 8.5 and green 2.2 (term 8 mo, fee $75); dollars ignore those, and it costs $109.40/mo. |

The "Why" column is generated from each plan's own numbers by a fixed rule (slope penalty, flexibility or green points, or the 500 kWh rate versus the full cost), not written by hand. Read it before presenting.

## 5. How much the top of each list depends on the start month

Cheapest plan of each list if the contract started in each month (same usage, same data). The long list is priced on the same twelve months whatever the start month, so its winner should not move; the short list is priced on each plan's own months, so it can.

| Start month | Long list #1 | Per month | Short list #1 | Per month |
|---|---|---:|---|---:|
| Jan | True Value 12 (12 mo) | $119.00 | Sustainable Living Bundle - 3 (3 mo) | $89.98 |
| Feb | True Value 12 (12 mo) | $119.00 | Sustainable Living Bundle - 3 (3 mo) | $81.67 |
| Mar | True Value 12 (12 mo) | $119.00 | Gexa Eco Choice 3 (3 mo) | $81.65 |
| Apr | True Value 12 (12 mo) | $119.00 | Sustainable Living Bundle - 3 (3 mo) | $93.50 |
| May | True Value 12 (12 mo) | $119.00 | SmartGreen 3 (3 mo) | $113.79 |
| Jun | True Value 12 (12 mo) | $119.00 | Gexa Eco Choice 6 (6 mo) | $125.54 |
| Jul | True Value 12 (12 mo) | $119.00 | Gexa Eco Choice 6 (6 mo) | $119.52 |
| Aug | True Value 12 (12 mo) | $119.00 | Gexa Eco Choice 6 (6 mo) | $112.41 |
| Sep | True Value 12 (12 mo) | $119.00 | SmartGreen 3 (3 mo) | $96.25 |
| Oct | True Value 12 (12 mo) | $119.00 | Sustainable Living Bundle - 3 (3 mo) | $84.62 |
| Nov | True Value 12 (12 mo) | $119.00 | Sustainable Living Bundle - 3 (3 mo) | $86.56 |
| Dec | True Value 12 (12 mo) | $119.00 | Sustainable Living Bundle - 3 (3 mo) | $91.37 |

The long list has 1 different #1 plan(s) across the twelve start months; the short list has 4.

## 6. What moved against the previous version

The previous version ranked the long list on each plan's average over its OWN term; this one ranks it on the first twelve months. Positive = moved up now.

- Short list: identical order (it is still priced on each plan's own term).
- Long list: 60 of 79 plans change rank; all 69 plans with a whole-year term (12, 24, 36) keep their relative order among themselves: yes.

Top 10 of the long list, then and now:

| Rank | Previous version | Now |
|---:|---|---|
| 1 | No Gimmicks 18 (18 mo, $115.33) | True Value 12 (12 mo, $119.00) |
| 2 | Octo Simple 14 (14 mo, $117.33) | True Value 24 (24 mo, $120.00) |
| 3 | True Value 12 (12 mo, $119.00) | Octo Simple 12 (12 mo, $120.90) |
| 4 | True Value 24 (24 mo, $120.00) | TrueClassic 12 (12 mo, $121.00) |
| 5 | Octo Simple 12 (12 mo, $120.90) | Octo Simple 14 (14 mo, $121.10) |
| 6 | TrueClassic 12 (12 mo, $121.00) | No Bull 12 (12 mo, $121.20) |
| 7 | No Bull 12 (12 mo, $121.20) | Digital Choice 12 (12 mo, $121.20) |
| 8 | Digital Choice 12 (12 mo, $121.20) | No Gimmicks 18 (18 mo, $122.10) |
| 9 | Gexa Eco Choice 12 (12 mo, $123.00) | Gexa Eco Choice 12 (12 mo, $123.00) |
| 10 | Frontier Power Saver 12 (12 mo, $123.00) | Frontier Power Saver 12 (12 mo, $123.00) |

Every plan that moved, largest move first:

| Plan | Provider | Term | Previous rank | Rank now | Moved | Per month before | Per month now |
|---|---|---:|---:|---:|---:|---:|---:|
| Octo Simple 18 | Octopus Energy | 18 | 17 | 44 | -27 | $128.18 | $136.10 |
| Stars and Stripes 18 | REVOLUTION ENERGY LLC | 18 | 15 | 33 | -18 | $125.81 | $133.00 |
| Choose 15 | SPARK ENERGY LLC | 15 | 18 | 30 | -12 | $128.26 | $132.00 |
| Saver 18 | Discount Power | 18 | 44 | 56 | -12 | $135.81 | $143.80 |
| Reliant Power On 18 | RELIANT | 18 | 60 | 68 | -8 | $145.59 | $153.90 |
| No Gimmicks 18 | Budget Power | 18 | 1 | 8 | -7 | $115.33 | $122.10 |
| Confident Renter 12 | Abundance Energy | 12 | 19 | 15 | +4 | $129.00 | $129.00 |
| Octo Simple 14 | Octopus Energy | 14 | 2 | 5 | -3 | $117.33 | $121.10 |
| No Gimmicks 24 | Budget Power | 24 | 20 | 17 | +3 | $129.00 | $129.00 |
| True Value 36 | TRUE POWER | 36 | 21 | 18 | +3 | $129.00 | $129.00 |
| Smart Simple 12 | CIRRO ENERGY | 12 | 22 | 19 | +3 | $129.80 | $129.80 |
| Straight Forward 12 | Abundance Energy | 12 | 23 | 20 | +3 | $129.90 | $129.90 |
| Chariot Choice 24 | CHARIOT ENERGY | 24 | 24 | 21 | +3 | $130.00 | $130.00 |
| Choose 12 | SPARK ENERGY LLC | 12 | 25 | 22 | +3 | $130.00 | $130.00 |
| Choose 12 | Texans Choice Power LLC | 12 | 26 | 23 | +3 | $130.00 | $130.00 |
| Essential Infusion 12 | INFUSE ENERGY | 12 | 27 | 24 | +3 | $130.00 | $130.00 |
| Stars and Stripes 12 | REVOLUTION ENERGY LLC | 12 | 28 | 25 | +3 | $130.00 | $130.00 |
| No Gimmicks 36 | Budget Power | 36 | 29 | 26 | +3 | $130.00 | $130.00 |
| Smart & Fixed - 36 | Ranchero Power | 36 | 30 | 27 | +3 | $130.20 | $130.20 |
| SoFed Better Rate - 36 | SOUTHERN FEDERAL POWER LLC | 36 | 31 | 28 | +3 | $130.20 | $130.20 |
| TOUCHDOWN 24 | VARSITY ENERGY LLC | 24 | 32 | 29 | +3 | $131.00 | $131.00 |
| PTC 12 Month - Postpaid | PAYLESS POWER | 12 | 64 | 61 | +3 | $150.00 | $150.00 |
| Think Clean 24 | Think Energy | 24 | 65 | 62 | +3 | $150.90 | $150.90 |
| True Value 12 | TRUE POWER | 12 | 3 | 1 | +2 | $119.00 | $119.00 |
| True Value 24 | TRUE POWER | 24 | 4 | 2 | +2 | $120.00 | $120.00 |
| Octo Simple 12 | Octopus Energy | 12 | 5 | 3 | +2 | $120.90 | $120.90 |
| TrueClassic 12 | AP GAS & ELECTRIC (TX) LLC | 12 | 6 | 4 | +2 | $121.00 | $121.00 |
| SoFed Digital Saver Plus - 12 | SOUTHERN FEDERAL POWER LLC | 12 | 16 | 14 | +2 | $127.00 | $127.00 |
| True Classic 14 | AP GAS & ELECTRIC (TX) LLC | 14 | 14 | 16 | -2 | $125.15 | $129.00 |
| Chariot Choice 36 | CHARIOT ENERGY | 36 | 33 | 31 | +2 | $133.00 | $133.00 |
| Essential Infusion 24 | INFUSE ENERGY | 24 | 34 | 32 | +2 | $133.00 | $133.00 |
| Straight Forward 36 | Abundance Energy | 36 | 45 | 43 | +2 | $136.10 | $136.10 |
| Autopay Texas 12 | DIRECT ENERGY | 12 | 66 | 64 | +2 | $151.90 | $151.90 |
| Reliant Power On 13 | RELIANT | 13 | 63 | 65 | -2 | $148.98 | $151.90 |
| No Bull 12 | Energy Texas | 12 | 7 | 6 | +1 | $121.20 | $121.20 |
| Digital Choice 12 | RHYTHM | 12 | 8 | 7 | +1 | $121.20 | $121.20 |
| Stars and Stripes 24 | REVOLUTION ENERGY LLC | 24 | 35 | 34 | +1 | $133.00 | $133.00 |
| Straight Forward 24 | Abundance Energy | 24 | 36 | 35 | +1 | $133.20 | $133.20 |
| Champ Saver-12 | CHAMPION ENERGY SERVICES LLC | 12 | 37 | 36 | +1 | $134.00 | $134.00 |
| TrueClassic 24 | AP GAS & ELECTRIC (TX) LLC | 24 | 38 | 37 | +1 | $134.00 | $134.00 |
| Smart Simple 24 | CIRRO ENERGY | 24 | 39 | 38 | +1 | $134.80 | $134.80 |
| Essential Infusion 36 | INFUSE ENERGY | 36 | 40 | 39 | +1 | $135.00 | $135.00 |
| Stars and Stripes 36 | REVOLUTION ENERGY LLC | 36 | 41 | 40 | +1 | $135.00 | $135.00 |
| Digital Choice 24 | RHYTHM | 24 | 42 | 41 | +1 | $135.20 | $135.20 |
| No Bull 24 | Energy Texas | 24 | 43 | 42 | +1 | $135.20 | $135.20 |
| SmartGreen 12 $200 Bill Credit | SMARTENERGY HOLDINGS LLC | 12 | 46 | 45 | +1 | $137.90 | $137.90 |
| Embrace Green 12 - New Customer Special | CleanSky Energy | 12 | 47 | 46 | +1 | $138.00 | $138.00 |
| Smart Simple 36 | CIRRO ENERGY | 36 | 48 | 47 | +1 | $138.80 | $138.80 |
| Daisy Green 12 | BKV Energy | 12 | 49 | 48 | +1 | $139.00 | $139.00 |
| Daisy 12 | BKV Energy | 12 | 50 | 49 | +1 | $139.00 | $139.00 |
| Champ Saver-24 | CHAMPION ENERGY SERVICES LLC | 24 | 51 | 50 | +1 | $140.00 | $140.00 |
| Daisy 24 | BKV Energy | 24 | 52 | 51 | +1 | $140.00 | $140.00 |
| SmartGreen 24 $200 Bill Credit | SMARTENERGY HOLDINGS LLC | 24 | 53 | 52 | +1 | $140.90 | $140.90 |
| Embrace Green 24 - New Customer Special | CleanSky Energy | 24 | 54 | 53 | +1 | $142.00 | $142.00 |
| Ranchero Fixed Prime - 48 | Ranchero Power | 48 | 55 | 54 | +1 | $143.20 | $143.20 |
| Saver 12 | Discount Power | 12 | 56 | 55 | +1 | $143.80 | $143.80 |
| Saver 24 | Discount Power | 24 | 61 | 60 | +1 | $147.80 | $147.80 |
| Autopay Texas 13 | DIRECT ENERGY | 13 | 62 | 63 | -1 | $148.00 | $150.90 |
| Reliant Power On 12 Plan | RELIANT | 12 | 67 | 66 | +1 | $152.90 | $152.90 |
| Autopay Texas 24 | DIRECT ENERGY | 24 | 68 | 67 | +1 | $152.90 | $152.90 |

