Product Build Brief: Texas Smart Power Application

1. EXECUTIVE SUMMARY & PROJECT MISSION

The Texas retail electric provider (REP) market exists as a predatory landscape of gimmick-tiered pricing and intentional opacity. Providers routinely leverage convoluted rate structures—including minimum usage fees and hidden "humps"—to obscure the effective cost of power, creating a system where consumer comparison is functionally impossible. The Texas Smart Power application establishes a strategic competitive moat through "objective simplification," distilling market volatility into a transparent, actionable data set [i].

The project mission is the delivery of a singular, objective 12-point ranking system that prioritizes absolute consumer financial clarity over provider marketing narratives [i]. By implementing a standardized scoring engine, we shift the "Power of Choice" from the REP to the consumer, drastically reducing decision fatigue by replacing marketing-heavy rhetoric with empirical truth. This brief details the technical architecture and mathematical rigor required to maintain this system as the definitive source of truth in the Texas energy market.

2. SYSTEM ARCHITECTURE & DATA FLOW

To achieve sub-second latency and near-zero operational overhead, the application utilizes a "Database-less" architecture. By shifting from traditional relational databases to a pre-compiled data model stored via Vercel Blob Storage, the system ensures high availability for volatile retail pricing data while minimizing compute costs [i].

Real-Time User Interaction

The client-side experience is optimized for speed, following a specific sequence to circumvent environmental constraints:

* ZIP Validation: Users enter a location, triggered via a proxy service at /api/zip-lookup.
* TDU Resolution: The system resolves the Transmission and Distribution Utility (TDU) through a server-side call to the external Power to Choose API (TduCompaniesByZip). This server-side execution is a critical design decision to bypass browser-side CORS constraints [i].
* Static Plan Retrieval: The client fetches pre-compiled, pre-ranked JSON datasets directly from Vercel Blob Storage via /api/plans/:tdu. This eliminates on-the-fly ranking calculations during the user session [i].
* Frontend Rendering: The final interface is rendered within a Vite React SPA, providing a high-performance, responsive environment for plan filtering.

Automated Pipeline & Data Refreshes

The backend logic is designed to maintain data integrity in a market where prices fluctuate hourly:

* Vercel Cron Scheduler: An automated job executes twice daily at /api/cron/fetch-plans to capture retail fluctuations [i].
* Ranking Library Execution: The pipeline follows a Fetch \rightarrow Filter \rightarrow TOU Check \rightarrow Ranking Library sequence. Crucially, the 12-point score is calculated server-side during this phase rather than at the request level.
* Blob Persistence: The engine generates six static plans/{tdu}.json files, uploading them to Vercel Blob Storage to serve as the application's read-only data source [i].

This architecture ensures that the complex mathematical engine documented below is executed in a controlled, server-side environment to ensure score consistency across all user devices.

3. THE TEXAS SMART POWER RANKING FORMULA

Consumer trust in the Texas market is built on mathematical grounding. A weighted multi-variable equation is strategically superior to simple "price-per-kWh" sorting, as it identifies and penalizes predatory pricing "gimmicks" that appear attractive in standard sorting but result in inflated bills.

The Master Scaling Equation

The final 12-point score is derived from four weighted components:

Score = \left(\frac{5}{12} \times S_{price}\right) + \left(\frac{3}{12} \times S_{slope}\right) + \left(\frac{3}{12} \times S_{flex}\right) + \left(\frac{1}{12} \times S_{green}\right)

Component 1: Price Score (S_{price})

The price score is normalized to a 0–10 scale based on the pricing floor (P_{min}) and ceiling (P_{max}) of the specific ZIP code. This ensures a plan's value is relative to its immediate market competitors rather than a state average [i].

Component 2: Slope & Gimmick Analysis (S_{slope})

The S_{slope} component acts as a binary "predatory check." If a pricing structure utilizes tiered gimmicks to lure consumers, the slope score is forcibly set to zero:

S_{slope} = \begin{cases} 0 & \text{if } (P_{1000} < P_{2000}) \lor (P_{1000} > P_{500}) \\ 10 & \text{otherwise} \end{cases}

The detection of a "V-Trap" (P_{1000} < P_{2000}) or a "Hump" (P_{1000} > P_{500}) signifies a non-linear rate designed to penalize users for under-consumption or over-consumption [i].

Component 3: Flexibility & Risk (S_{flex})

This component evaluates the strategic risk of the contract. Financial risk is defined as the total cost to exit a contract:

Risk = \begin{cases} Fee_{flat} & \text{if flat fee} \\ Term \times Fee_{month} & \text{if monthly fee} \end{cases}

Plans are capped at a maximum risk of Fee_{max} = \$395.00 [i]. Points are awarded based on term length:

Contract Term	Points
12 months	10
13–15 months	9
< 12 months	8
18–24 months	7
36 months	5
> 36 months	3

Source: Internal Ranking Logic [i]

Component 4: Environmental Impact (S_{green})

The renewable energy percentage (0–100%) is scaled linearly to a 0–10 point value, contributing to the final score as a secondary tie-breaker [i].

Empirical Validation

The following table demonstrates the formula applied to live market data from CenterPoint Energy (77002).

Plan Name	Term	1k kWh Price	S_{slope} Penalty	Calculated Score
Champ Saver-12	12mo	12.8¢	No	9.4
Think Clean 12	12mo	13.9¢	No	8.8
SFE RewardsPlus - 24	24mo	13.4¢	No	8.2
Digital Choice 36	36mo	13.1¢	Yes	5.1
Basics PTC - 60	60mo	14.9¢	No	4.2

Validation Analysis: Think Clean 12 (13.9¢) scores significantly higher than Basics PTC - 60 (14.9¢) despite a similar price point because it captures maximum points for S_{flex} (12mo vs 60mo) and S_{green} (100% vs 31%). Digital Choice 36 receives a penalty because P_{1000} (13.1¢) < P_{2000} (13.2¢), identifying a predatory V-Trap [i].

4. VERIFIED PRODUCT DECISIONS

The design philosophy of "Minimalist Precision" dictates that user comprehension is improved by removing traditional metrics that cause cognitive friction.

Finalized UI/UX Category List

* Data Freshness: Automatic twice-daily updates synchronized with retail market volatility [i].
* Navigation: A dedicated left-sidebar filter architecture for desktop users and a sticky top-navigation bar for mobile optimization [i].
* Numeric Input Integration: Traditional horizontal sliders have been replaced with a direct numeric kWh input field. This allows users to test the formula against precise usage levels (e.g., 750 or 800 kWh) where gimmick rates often trigger [i].
* Visual Noise Reduction: Explicit removal of Pricing History Charts and the "Price per kWh" titles. These elements are frequently misinterpreted; they are replaced by the "Estimated Total Bill" to focus on the consumer's actual cash outlay [i].
* Future Features: Evaluation of a support Chatbot for real-time user assistance [i].

5. UNRESOLVED QUESTIONS & OPEN RISKS

The transition to production requires final architecture hardening to ensure the ranking library is resilient to edge-case data.

Risk Inventory

1. Usage Level Validation: We must confirm that the 12-point score remains mathematically sound at non-standard intervals (e.g., 750 kWh). If a user inputs these values, the S_{slope} logic must still successfully identify V-Traps occurring between the 1000 and 2000 tiers [i].
2. Library Hardening: Final validation of the core ranking library is required to ensure no pricing edge cases result in unintended score inflation.
3. Communication Strategy: Completion of the 2-minute strategic pitch highlighting the technical merits of the 12-point score [i].
4. Local Environment Synchronization: Verification that the local development environment is perfectly synchronized with the Vercel production environment, adhering strictly to the requirements in README.md [i].
