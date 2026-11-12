# Dollar ranking vs current live scoring: oncor

Generated 2026-11-12T06:15:11.224Z by `scripts/dollar-ranking-comparison.mjs`. Nothing here is a product rule from BRIEF.md; it is the proposal in branch `feat/dollar-ranking`, set beside the scoring that is live today.

## Data and assumptions

- Blob file: `plans/oncor-1794390141700.json`, uploaded 2026-11-11T09:42:22.000Z (file `generatedAt` 2026-11-11T09:42:21.700Z).
- 126 ranked plans + 5 time-of-use plans in the file. Time-of-use plans are not ranked in either method. 126 ranked plans analysed; 0 could not be costed (missing price or term).
- Usage: 1000 kWh a month (the page's default). Start month: Nov (the current month). The short list changes with the start month (see section 3); the long list changes only for terms that are not whole years.
- Dollar ranking: sum of the real monthly bills over the plan's own term, sorted by per-month cost, two separate lists (under 12 months, 12 months and longer). No score, weights, normalisation or risk term.
- Live scoring: `scorePlans` in `ranking.ts`, one combined list, 5/12 price (500 kWh rate) + 3/12 slope + 3/12 flexibility + 1/12 green. Its order matches the order stored in the file.
- "Live rank (own list)" is the plan's position in the live order among plans of the same list (long or short), so it can be compared with the dollar rank like for like. "Live rank (all plans)" is its position in the single combined live list.
- Cancellation fee: per-remaining-month fees are shown as the worst-case total (fee x (term - 1)), as in BRIEF.md.

## 1 and 2. Top 10 of each list, with the live positions

### Long list: 12 months and longer (79 plans)

| Rank | Plan | Provider | Term (mo) | Cancellation fee | Per month | Total | Months covered | Most expensive month | Renewable | Live rank (all plans) | Live rank (own list) | Moved up (+) / down (-) vs own list |
|---:|---|---|---:|---:|---:|---|---|---:|---:|---:|---:|---:|
| 1 | No Gimmicks 18 | Budget Power | 18 | $125 | $115.34 | $2,076.04 over 18 mo | Nov to Apr, 18 months | $172.73 | 24% | 34 | 12 | +11 |
| 2 | Octo Simple 14 | Octopus Energy | 14 | $200 | $117.33 | $1,642.61 over 14 mo | Nov to Dec, 14 months | $173.88 | 100% | 95 | 52 | +50 |
| 3 | True Value 12 | TRUE POWER | 12 | $300 | $119.00 | $1,428.01 over 12 mo | Nov, Dec, Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct | $168.44 | 15% | 24 | 8 | +5 |
| 4 | True Value 24 | TRUE POWER | 24 | $300 | $120.00 | $2,880.02 over 24 mo | Nov to Oct, 24 months | $169.87 | 15% | 45 | 19 | +15 |
| 5 | Octo Simple 12 | Octopus Energy | 12 | $150 | $120.90 | $1,450.80 over 12 mo | Nov, Dec, Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct | $173.02 | 100% | 83 | 42 | +37 |
| 6 | TrueClassic 12 | AP GAS & ELECTRIC (TX) LLC | 12 | $125 | $121.00 | $1,452.01 over 12 mo | Nov, Dec, Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct | $171.30 | 6% | 19 | 5 | -1 |
| 7 | No Bull 12 | Energy Texas | 12 | $220 | $121.20 | $1,454.45 over 12 mo | Nov, Dec, Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct | $173.88 | 100% | 91 | 48 | +41 |
| 8 | Digital Choice 12 | RHYTHM | 12 | $220 | $121.20 | $1,454.45 over 12 mo | Nov, Dec, Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct | $173.88 | 100% | 92 | 49 | +41 |
| 9 | Gexa Eco Choice 12 | GEXA ENERGY | 12 | $150 | $123.00 | $1,476.01 over 12 mo | Nov, Dec, Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct | $174.16 | 100% | 10 | 1 | -8 |
| 10 | Frontier Power Saver 12 | FRONTIER UTILITIES | 12 | $150 | $123.00 | $1,476.01 over 12 mo | Nov, Dec, Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct | $174.16 | 30% | 16 | 2 | -8 |

### Short list: under 12 months (47 plans)

| Rank | Plan | Provider | Term (mo) | Cancellation fee | Per month | Total | Months covered | Most expensive month | Renewable | Live rank (all plans) | Live rank (own list) | Moved up (+) / down (-) vs own list |
|---:|---|---|---:|---:|---:|---|---|---:|---:|---:|---:|---:|
| 1 | Sustainable Living Bundle - 3 | JUST ENERGY | 3 | $175 | $86.56 | $259.69 over 3 mo | Nov, Dec, Jan | $99.37 | 22% | 7 | 7 | +6 |
| 2 | SmartGreen 3 | SMARTENERGY HOLDINGS LLC | 3 | none | $86.71 | $260.12 over 3 mo | Nov, Dec, Jan | $99.37 | 100% | 1 | 1 | -1 |
| 3 | Gexa Eco Choice 3 | GEXA ENERGY | 3 | $150 | $86.83 | $260.49 over 3 mo | Nov, Dec, Jan | $100.33 | 100% | 2 | 2 | -1 |
| 4 | Companion Pro + Perks 3 | Companion Energy | 3 | $150 | $86.83 | $260.49 over 3 mo | Nov, Dec, Jan | $100.33 | 30% | 4 | 4 | 0 |
| 5 | Frontier Power Saver 3 | FRONTIER UTILITIES | 3 | $150 | $86.83 | $260.49 over 3 mo | Nov, Dec, Jan | $100.33 | 30% | 5 | 5 | 0 |
| 6 | Sustainable Lifestyle - 3 | AMIGO ENERGY | 3 | $175 | $87.42 | $262.25 over 3 mo | Nov, Dec, Jan | $100.36 | 22% | 8 | 8 | +2 |
| 7 | Sustainable Home Bundle - 3 | TARA ENERGY | 3 | $175 | $87.42 | $262.25 over 3 mo | Nov, Dec, Jan | $100.36 | 22% | 9 | 9 | +2 |
| 8 | Think Basic 3 | Think Energy | 3 | none | $88.42 | $265.25 over 3 mo | Nov, Dec, Jan | $101.36 | 25% | 6 | 6 | -2 |
| 9 | Digital Choice 6 | RHYTHM | 6 | $100 | $91.01 | $546.06 over 6 mo | Nov, Dec, Jan, Feb, Mar, Apr | $109.24 | 100% | 64 | 34 | +25 |
| 10 | No Bull 6 | Energy Texas | 6 | $100 | $91.01 | $546.06 over 6 mo | Nov, Dec, Jan, Feb, Mar, Apr | $109.24 | 100% | 65 | 35 | +25 |

## 3. Average seasonal exposure by start month

Mean of the twelve EIA factors over the months a contract covers (1.00 = an average month). In brackets: that figure divided by the lowest start month for the same term.

| Start month | 3-month term | 6-month term | 12-month term |
|---|---:|---:|---:|
| Jan | 0.8911 (1.11x) | 0.9102 (1.10x) | 1.0000 (1.00x) |
| Feb | 0.8008 (1.00x) | 0.9772 (1.18x) | 1.0000 (1.00x) |
| Mar | 0.8006 (1.00x) | 1.0672 (1.29x) | 1.0000 (1.00x) |
| Apr | 0.9293 (1.16x) | 1.1381 (1.38x) | 1.0000 (1.00x) |
| May | 1.1537 (1.44x) | 1.1726 (1.42x) | 1.0000 (1.00x) |
| Jun | 1.3338 (1.67x) | 1.1466 (1.39x) | 1.0000 (1.00x) |
| Jul | 1.3469 (1.68x) | 1.0898 (1.32x) | 1.0000 (1.00x) |
| Aug | 1.1916 (1.49x) | 1.0228 (1.24x) | 1.0000 (1.00x) |
| Sep | 0.9595 (1.20x) | 0.9329 (1.13x) | 1.0000 (1.00x) |
| Oct | 0.8328 (1.04x) | 0.8619 (1.04x) | 1.0000 (1.00x) |
| Nov | 0.8539 (1.07x) | 0.8274 (1.00x) | 1.0000 (1.00x) |
| Dec | 0.9062 (1.13x) | 0.8534 (1.03x) | 1.0000 (1.00x) |

- A 3-month contract signed in July carries 1.68x the seasonal exposure of the same contract signed in March (1.3469 vs 0.8006).
- Best start month to worst, by term: 3 months 1.68x, 6 months 1.42x, 12 months 1.00000x.
- The twelve factors sum to 12.0001, not exactly 12, so a 12-month term is flat to within about 0.001%, not exactly flat.
- 10 of the 79 plans in the long list have a term that is not a whole number of years (13, 14, 15, 18 months). Their per-month figure carries some seasonal bias that depends on the start month, like a short plan, though a smaller one.

## 4. Plans whose rank moves more than 10 places

Movement = live rank in the plan's own list minus its dollar rank (positive = better in dollars). 46 of 126 plans move more than 10 places on that basis; measured against the single combined live list instead, 89 do.

| Plan | Provider | Term | List | Dollar rank | Live rank (own list) | Moved | Why |
|---|---|---:|---|---:|---:|---:|---|
| Octo Simple 18 | Octopus Energy | 18 | long | 17 | 74 | +57 | live scoring gives it 0 of 3/12 slope points (V-trap or hump price curve) and it falls to 74; in dollars it costs $128.18/mo (13.5¢ at 500 kWh), which ranks 17 in its list. |
| Octo Simple 14 | Octopus Energy | 14 | long | 2 | 52 | +50 | live scoring gives it 0 of 3/12 slope points (V-trap or hump price curve) and it falls to 52; in dollars it costs $117.33/mo (12.0¢ at 500 kWh), which ranks 2 in its list. |
| No Bull 12 | Energy Texas | 12 | long | 7 | 48 | +41 | live scoring gives it 0 of 3/12 slope points (V-trap or hump price curve) and it falls to 48; in dollars it costs $121.20/mo (12.1¢ at 500 kWh), which ranks 7 in its list. |
| Digital Choice 12 | RHYTHM | 12 | long | 8 | 49 | +41 | live scoring gives it 0 of 3/12 slope points (V-trap or hump price curve) and it falls to 49; in dollars it costs $121.20/mo (12.1¢ at 500 kWh), which ranks 8 in its list. |
| Embrace Green 12 - New Customer Special | CleanSky Energy | 12 | long | 47 | 7 | -40 | live scoring lifted it with flexibility 9.5 and green 10.0 (term 12 mo, fee $75); dollars ignore those, and it costs $138.00/mo. |
| Octo Simple 12 | Octopus Energy | 12 | long | 5 | 42 | +37 | live scoring gives it 0 of 3/12 slope points (V-trap or hump price curve) and it falls to 42; in dollars it costs $120.90/mo (12.0¢ at 500 kWh), which ranks 5 in its list. |
| Daisy Green 12 | BKV Energy | 12 | long | 49 | 13 | -36 | live scoring lifted it with flexibility 8.4 and green 10.0 (term 12 mo, fee $220); dollars ignore those, and it costs $139.00/mo. |
| Digital Choice 24 | RHYTHM | 24 | long | 42 | 76 | +34 | live scoring gives it 0 of 3/12 slope points (V-trap or hump price curve) and it falls to 76; in dollars it costs $135.20/mo (13.5¢ at 500 kWh), which ranks 42 in its list. |
| No Bull 24 | Energy Texas | 24 | long | 43 | 77 | +34 | live scoring gives it 0 of 3/12 slope points (V-trap or hump price curve) and it falls to 77; in dollars it costs $135.20/mo (13.5¢ at 500 kWh), which ranks 43 in its list. |
| Pollution Free e-Plus 12 Choice | GREEN MOUNTAIN ENERGY COMPANY | 12 | long | 69 | 39 | -30 | live scoring lifted it with flexibility 8.9 and green 10.0 (term 12 mo, fee $150); dollars ignore those, and it costs $154.90/mo. |
| Think Clean 12 | Think Energy | 12 | long | 57 | 29 | -28 | live scoring lifted it with flexibility 8.6 and green 10.0 (term 12 mo, fee $200); dollars ignore those, and it costs $144.10/mo. |
| Embrace Green 24 - New Customer Special | CleanSky Energy | 24 | long | 54 | 27 | -27 | live scoring lifted it with flexibility 7.4 and green 10.0 (term 24 mo, fee $150); dollars ignore those, and it costs $142.00/mo. |
| Octo Simple 6 | Octopus Energy | 6 | short | 14 | 40 | +26 | live scoring gives it 0 of 3/12 slope points (V-trap or hump price curve) and it falls to 40; in dollars it costs $93.32/mo (11.2¢ at 500 kWh), which ranks 14 in its list. |
| Digital Choice 6 | RHYTHM | 6 | short | 9 | 34 | +25 | live scoring gives it 0 of 3/12 slope points (V-trap or hump price curve) and it falls to 34; in dollars it costs $91.01/mo (11.0¢ at 500 kWh), which ranks 9 in its list. |
| No Bull 6 | Energy Texas | 6 | short | 10 | 35 | +25 | live scoring gives it 0 of 3/12 slope points (V-trap or hump price curve) and it falls to 35; in dollars it costs $91.01/mo (11.0¢ at 500 kWh), which ranks 10 in its list. |
| SmartGreen 12 $200 Bill Credit | SMARTENERGY HOLDINGS LLC | 12 | long | 46 | 22 | -24 | live scoring lifted it with flexibility 8.4 and green 10.0 (term 12 mo, fee $220); dollars ignore those, and it costs $137.90/mo. |
| Saver 12 | Discount Power | 12 | long | 56 | 32 | -24 | live scoring lifted it with flexibility 8.9 and green 2.2 (term 12 mo, fee $150); dollars ignore those, and it costs $143.80/mo. |
| Octo Simple 3 | Octopus Energy | 3 | short | 16 | 39 | +23 | live scoring gives it 0 of 3/12 slope points (V-trap or hump price curve) and it falls to 39; in dollars it costs $95.49/mo (11.1¢ at 500 kWh), which ranks 16 in its list. |
| Stars and Stripes 18 | REVOLUTION ENERGY LLC | 18 | long | 15 | 37 | +22 | live scoring held it down with flexibility 6.7 and green 2.4 (term 18 mo, fee $250); it costs only $125.81/mo. |
| Chariot Choice 24 | CHARIOT ENERGY | 24 | long | 27 | 6 | -21 | live scoring lifted it with flexibility 7.8 and green 10.0 (term 24 mo, fee $99); dollars ignore those, and it costs $130.00/mo. |
| Daisy 12 | BKV Energy | 12 | long | 50 | 30 | -20 | live scoring lifted it with flexibility 8.4 and green 2.9 (term 12 mo, fee $220); dollars ignore those, and it costs $139.00/mo. |
| Digital Choice 36 | RHYTHM | 36 | long | 58 | 78 | +20 | live scoring gives it 0 of 3/12 slope points (V-trap or hump price curve) and it falls to 78; in dollars it costs $145.20/mo (14.5¢ at 500 kWh), which ranks 58 in its list. |
| No Bull 36 | Energy Texas | 36 | long | 59 | 79 | +20 | live scoring gives it 0 of 3/12 slope points (V-trap or hump price curve) and it falls to 79; in dollars it costs $145.20/mo (14.5¢ at 500 kWh), which ranks 59 in its list. |
| PTC 12 Month - Postpaid | PAYLESS POWER | 12 | long | 64 | 44 | -20 | live scoring lifted it with flexibility 8.6 and green 2.6 (term 12 mo, fee $199); dollars ignore those, and it costs $150.00/mo. |
| Choose 12 | SPARK ENERGY LLC | 12 | long | 28 | 9 | -19 | live scoring lifted it with flexibility 9.3 and green 3.7 (term 12 mo, fee $100); dollars ignore those, and it costs $130.00/mo. |
| Choose 12 | Texans Choice Power LLC | 12 | long | 29 | 10 | -19 | live scoring lifted it with flexibility 9.3 and green 3.7 (term 12 mo, fee $100); dollars ignore those, and it costs $130.00/mo. |
| SoFed Better Rate - 36 | SOUTHERN FEDERAL POWER LLC | 36 | long | 31 | 50 | +19 | live scoring held it down with flexibility 5.7 and green 0.6 (term 36 mo, fee $249); it costs only $130.20/mo. |
| Chariot Choice 36 | CHARIOT ENERGY | 36 | long | 35 | 17 | -18 | live scoring lifted it with flexibility 6.8 and green 10.0 (term 36 mo, fee $99); dollars ignore those, and it costs $133.00/mo. |
| Think Clean 24 | Think Energy | 24 | long | 65 | 47 | -18 | live scoring lifted it with flexibility 7.1 and green 10.0 (term 24 mo, fee $200); dollars ignore those, and it costs $150.90/mo. |
| Digital Choice 3 | RHYTHM | 3 | short | 18 | 36 | +18 | live scoring gives it 0 of 3/12 slope points (V-trap or hump price curve) and it falls to 36; in dollars it costs $96.49/mo (11.3¢ at 500 kWh), which ranks 18 in its list. |
| No Bull 3 | Energy Texas | 3 | short | 19 | 37 | +18 | live scoring gives it 0 of 3/12 slope points (V-trap or hump price curve) and it falls to 37; in dollars it costs $96.49/mo (11.3¢ at 500 kWh), which ranks 19 in its list. |
| Embrace Green 6 - New Customer Special | CleanSky Energy | 6 | short | 32 | 15 | -17 | live scoring lifted it with flexibility 8.6 and green 10.0 (term 6 mo, fee $50); dollars ignore those, and it costs $112.39/mo. |
| Stars and Stripes 36 | REVOLUTION ENERGY LLC | 36 | long | 40 | 56 | +16 | live scoring held it down with flexibility 4.8 and green 2.4 (term 36 mo, fee $375); it costs only $135.00/mo. |
| True Value 24 | TRUE POWER | 24 | long | 4 | 19 | +15 | live scoring held it down with flexibility 6.4 and green 1.5 (term 24 mo, fee $300); it costs only $120.00/mo. |
| SmartGreen 9 $200 Bill Credit | SMARTENERGY HOLDINGS LLC | 9 | short | 38 | 23 | -15 | live scoring lifted it with flexibility 7.9 and green 10.0 (term 9 mo, fee $160); dollars ignore those, and it costs $123.14/mo. |
| True Value 36 | TRUE POWER | 36 | long | 20 | 34 | +14 | live scoring held it down with flexibility 5.4 and green 1.5 (term 36 mo, fee $300); it costs only $129.00/mo. |
| Champ Saver-12 | CHAMPION ENERGY SERVICES LLC | 12 | long | 37 | 23 | -14 | live scoring lifted it with flexibility 8.9 and green 2.5 (term 12 mo, fee $150); dollars ignore those, and it costs $134.00/mo. |
| Pollution Free e-Plus 24 Choice | GREEN MOUNTAIN ENERGY COMPANY | 24 | long | 76 | 62 | -14 | live scoring lifted it with flexibility 6.4 and green 10.0 (term 24 mo, fee $295); dollars ignore those, and it costs $155.90/mo. |
| Smart & Fixed - 36 | Ranchero Power | 36 | long | 30 | 43 | +13 | live scoring held it down with flexibility 6.2 and green 0.6 (term 36 mo, fee $179); it costs only $130.20/mo. |
| Smart Simple 10 | CIRRO ENERGY | 10 | short | 41 | 28 | -13 | live scoring lifted it with flexibility 8.3 and green 2.2 (term 10 mo, fee $95); dollars ignore those, and it costs $128.96/mo. |
| Essential Infusion 36 | INFUSE ENERGY | 36 | long | 41 | 53 | +12 | live scoring held it down with flexibility 4.8 and green 2.4 (term 36 mo, fee $375); it costs only $135.00/mo. |
| No Gimmicks 18 | Budget Power | 18 | long | 1 | 12 | +11 | live scoring held it down with flexibility 7.6 and green 2.4 (term 18 mo, fee $125); it costs only $115.34/mo. |
| Smart Simple 36 | CIRRO ENERGY | 36 | long | 48 | 59 | +11 | live scoring held it down with flexibility 4.7 and green 2.2 (term 36 mo, fee $395); it costs only $138.80/mo. |
| Autopay Texas 12 | DIRECT ENERGY | 12 | long | 66 | 55 | -11 | live scoring lifted it with flexibility 8.9 and green 2.2 (term 12 mo, fee $150); dollars ignore those, and it costs $151.90/mo. |
| Reliant Power On 12 Plan | RELIANT | 12 | long | 68 | 57 | -11 | live scoring lifted it with flexibility 8.9 and green 2.2 (term 12 mo, fee $150); dollars ignore those, and it costs $152.90/mo. |
| Smart Simple 8 | CIRRO ENERGY | 8 | short | 30 | 19 | -11 | live scoring lifted it with flexibility 8.5 and green 2.2 (term 8 mo, fee $75); dollars ignore those, and it costs $109.40/mo. |

The "Why" column is generated from each plan's own numbers by a fixed rule (slope penalty, flexibility or green points, or the 500 kWh rate versus the full cost), not written by hand. Read it before presenting.

## 5. How much the top of each list depends on the start month

Cheapest plan of each list if the contract started in each month (same usage, same data). A plan whose term is not a whole number of years can move with the calendar.

| Start month | Long list #1 | Per month | Short list #1 | Per month |
|---|---|---:|---|---:|
| Jan | No Gimmicks 18 (18 mo) | $118.58 | Sustainable Living Bundle - 3 (3 mo) | $89.98 |
| Feb | Octo Simple 14 (14 mo) | $118.30 | Sustainable Living Bundle - 3 (3 mo) | $81.67 |
| Mar | Octo Simple 14 (14 mo) | $116.84 | Sustainable Living Bundle - 3 (3 mo) | $81.65 |
| Apr | Octo Simple 14 (14 mo) | $117.71 | Sustainable Living Bundle - 3 (3 mo) | $93.50 |
| May | True Value 12 (12 mo) | $119.00 | SmartGreen 3 (3 mo) | $113.79 |
| Jun | True Value 12 (12 mo) | $119.00 | Gexa Eco Choice 6 (6 mo) | $125.54 |
| Jul | True Value 12 (12 mo) | $119.00 | Gexa Eco Choice 6 (6 mo) | $119.52 |
| Aug | True Value 12 (12 mo) | $119.00 | Gexa Eco Choice 6 (6 mo) | $112.42 |
| Sep | True Value 12 (12 mo) | $119.00 | SmartGreen 3 (3 mo) | $96.25 |
| Oct | No Gimmicks 18 (18 mo) | $116.68 | Sustainable Living Bundle - 3 (3 mo) | $84.62 |
| Nov | No Gimmicks 18 (18 mo) | $115.34 | Sustainable Living Bundle - 3 (3 mo) | $86.56 |
| Dec | No Gimmicks 18 (18 mo) | $116.35 | Sustainable Living Bundle - 3 (3 mo) | $91.37 |

The long list has 3 different #1 plan(s) across the twelve start months; the short list has 3.

