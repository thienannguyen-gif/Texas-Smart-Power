# Student build guide

This guide explains how to turn research and product ideas into a working app
while keeping the architecture in `architecture-blueprint.md` fixed. The
student writes the product rules from their own research, then builds the app
in small, testable slices with an AI coding assistant.

The blueprint is the source of truth for the technical shape of the app. The
student's `BRIEF.md` is the source of truth for product behavior. Do not copy
the completed app as a shortcut: use it as a reference for the kinds of files,
contracts, and tests that the blueprint calls for.

## The build loop

Every feature follows the same loop:

1. Create or switch to a feature branch before editing.
2. State the behavior and its source of truth.
3. Ask the AI assistant to inspect the nearby files before proposing code.
4. Define the input, output, and failure cases.
5. Implement one small slice.
6. Run the narrowest useful test or typecheck.
7. Review the diff and commit the completed slice.

Do not ask an AI assistant to generate the entire application in one prompt.
That makes it difficult to tell whether a wrong result came from the product
rules, the data contract, the API, or the UI.

## 1. Turn research into Markdown

Start with the research, not the code. Gather the source material that defines
what the product should do: user problems, domain terms, data fields, business
rules, edge cases, and examples.

NotebookLM can help organize and compare the source material, but it is not
the source of truth. Whether it is used or not, separate:

- confirmed facts and their sources;
- proposed product decisions;
- examples and counterexamples;
- unresolved questions;
- numbers, thresholds, formulas, and units.

A useful NotebookLM request is:

> Synthesize these sources into a product build brief. Separate verified facts
> from proposed decisions and unresolved questions. Preserve every formula,
> threshold, unit, field name, and example exactly. For each rule, explain the
> input, output, edge cases, and source. Do not invent missing values.

Create `BRIEF.md` in the student's repository from the reviewed synthesis.
It should describe:

- what the app does and the primary user flow;
- the domain data model and units;
- filters, ranking, calculations, and display rules;
- edge cases and auditability requirements;
- decisions that are still open.

Before saving it, compare the Markdown against the original sources. Any
uncertain item stays marked as an open question. An AI assistant must ask about
an open question instead of choosing a plausible default.

Keep raw source notes separate if useful, for example in `docs/research-notes.md`.
`BRIEF.md` is the reviewed, implementation-ready version; it is not a dump of
unverified NotebookLM output.

### Convert research into rules

Before finalizing `BRIEF.md`, create a research-to-rule worksheet. This is the
bridge between source material and code. For each important finding, complete
one row:

| Research claim | Source | Product decision | Input | Output | Edge cases | Test example |
| --- | --- | --- | --- | --- | --- | --- |
| Exact claim from the research | Document, page, or interview | What the app should do | Fields or user action needed | Expected result | Missing or unusual cases | Concrete input and result |

Do not turn a research claim into code until the product decision is explicit.
If the input, output, or edge-case column cannot be completed, mark the row as
an open question and resolve it with the instructor.

For example, an illustrative rule might become:

```text
Research claim: A plan can look cheap at one usage level and expensive at another.
Product decision: Exclude a plan when its middle-tier price is higher or lower
than the surrounding tiers according to the approved stability rule.
Input: The plan's sampled usage prices.
Output: Include the plan or exclude it with a reason code.
Edge cases: Missing price values or a plan that matches more than one rule.
Test example: A plan with prices 10, 9, and 11 produces the approved exclusion reason.
```

The example is only a worksheet demonstration. The student's research and
`BRIEF.md` must define the real rule, formula, threshold, and reason code.

### Write acceptance criteria

Turn each approved worksheet row into one or more acceptance criteria before
asking the AI assistant to implement it. Acceptance criteria describe what a
person can verify; they are not implementation instructions.

Use this format:

```text
Feature: [short name]

Given [starting data or context]
When [user action or system event]
Then [observable result]
And [additional required result]
```

Example:

```text
Feature: stability screening

Given a plan with complete sampled price data
When the ingestion pipeline evaluates the plan
Then the plan is included or excluded according to the BRIEF.md rule
And an excluded plan retains the approved reason code for audit display
```

Write criteria for the normal case, invalid or missing data, and important
boundary values. Link each criterion to its worksheet row or `BRIEF.md`
section. Later, use the criteria as the test plan and as the review checklist
for the AI-generated code. A feature is not complete merely because it builds;
its acceptance criteria must pass.

## 2. Review the architecture

Read `architecture-blueprint.md` completely before asking for code. Make a
one-page map of the fixed decisions. Complete section 1 of the blueprint
before writing application code: it contains the Vercel project, GitHub,
Blob, environment-variable, and `.env.local` setup instructions. Do not copy
those setup steps into this guide; use the blueprint as the single source for
them.

The fixed decisions are:

- React and Vite frontend in `frontend/`;
- TypeScript API functions in `api/`;
- shared processing code in `pipeline/`;
- Vercel Blob as the only datastore;
- Vercel Cron calling the ingestion function;
- one Vercel project serving the frontend, API, and cron route.

Then translate the map into an implementation checklist. The completed app is
an example of how these responsibilities can be separated:

```text
frontend/src/types/plan.ts       shared data contract
frontend/src/lib/                browser calculations and UI support
frontend/src/components/         user-facing workflow
api/zip-lookup.ts                upstream ZIP lookup proxy
api/plans/[tdu].ts               latest Blob data endpoint
api/cron/fetch-plans.ts          scheduled ingestion and Blob write
pipeline/                        independently testable shared processing
vercel.json                      build, output, and cron configuration
```

The names above are examples, not required filenames and not permission to
copy the completed app. The architecture is reusable; the upstream API,
identifiers, domain fields, formulas, thresholds, and display rules are
project-specific. The student's `BRIEF.md` decides what the product
calculates and displays.

Ask the AI assistant for a gap review with this prompt:

> Read `docs/architecture-blueprint.md` and `BRIEF.md`. Produce a file-level
> implementation checklist. For each item, name its owner, input contract,
> output contract, tests, and dependencies. Flag conflicts or missing product
> rules as questions. Do not write code yet.

Resolve the checklist before implementation starts. In particular, identify
which data types are shared by the frontend and the server pipeline so there is
one canonical contract rather than two drifting copies.

## 3. Create the project skeleton

Create the repository from the template and complete section 1 of the
blueprint first. That section explains how to connect the student's existing
Vercel project to GitHub, provision Blob, check existing environment
variables, and pull `.env.local`. This guide does not repeat those commands.

For the first coding pass, work locally with fixtures. The frontend should be
able to render before Blob and the live upstream service are involved.

Create the smallest valid project skeleton:

- root `package.json` and TypeScript configuration;
- `frontend/package.json`, Vite entry point, and frontend TypeScript config;
- `api/`, `pipeline/`, `scripts/`, and `vercel.json`;
- a test runner and test/typecheck scripts selected for the project;
- `.gitignore` entries for `.env*` and `.vercel`.

Ask the AI assistant to create only the skeleton, then run the install,
test, and empty-project checks. Do not add a database or a second hosting
service.

## 4. Observe data and define the shared contract

Before defining the application contract, capture representative upstream
responses in local fixtures. Document the actual request and response shape,
including identifiers, optional fields, units, and non-JSON or error
responses. Do not infer field names from a similar API.

If the upstream service is blocked in the student's country, do not try to
bypass the restriction and do not claim that the response was personally
verified. Use the documented API shape in blueprint section 5 when it applies
to this reference app, together with an instructor-provided fixture or a
sanitized response recording. Mark the fixture as documented rather than
observed. If the student's app uses a different service and no approved
fixture or contract exists, stop and ask the instructor for one instead of
inventing a payload. The adapter can still be implemented and tested locally;
live upstream verification can be recorded as an environment limitation.

### Optional: validate the request and response with ReqBin

When the service is reachable and the instructor permits direct testing, use
<https://reqbin.com/> to validate the documented request and response before
writing the adapter. ReqBin sends the request from its service, so it may work
even when the student's local network cannot reach the upstream service, but it
is not guaranteed to bypass regional restrictions.

In ReqBin, choose `POST`, paste this URL, and add the `Content-Type` header:

```text
https://www.powertochoose.org/en-us/service/v1/
Content-Type: application/json
```

To test ZIP-to-TDU lookup, also add the documented cookie header and use a
non-sensitive test ZIP:

```text
Cookie: PowerToChoose.CurrentLanguage=en-US
```

```json
{
   "method": "TduCompaniesByZip",
   "zip_code": "75201",
   "include_details": false,
   "language": 0
}
```

To test plan retrieval, remove the cookie header and use the plan request body
from blueprint section 5. Start with one documented anchor ZIP, such as
`75201`:

```json
{
   "method": "plans",
   "zip_code": "75201",
   "company_tdu_id": "",
   "company_unique_id": "",
   "plan_mo_from": "",
   "plan_mo_to": "",
   "estimated_use": 1000,
   "plan_type": "1",
   "rating_total": "",
   "include_details": true,
   "language": 0,
   "min_usage_plan": "off"
}
```

Check the HTTP status, response content type, and whether the response is the
documented JSON array. Compare field names, optional fields, identifiers, and
units against blueprint section 5. Save a sanitized response as a local test
fixture with the request, date, and source recorded. Never paste API keys,
secrets, personal information, or private customer data into ReqBin. If the
request fails, use the documented contract and an approved fixture instead;
do not change the application contract to match an error page.

Then define the normalized TypeScript interfaces from the observed response
or documented fixture and the reviewed `BRIEF.md`. Keep raw upstream data
separate from the application's normalized data, and decide how missing,
malformed, and optional fields are represented.

Add tests for:

- valid records;
- absent optional fields;
- invalid or incomplete records;
- the serialized JSON shape written to Blob.

This normalized contract is the agreement between the cron job and the
frontend. Treat a change to it as an integration change: update both sides and
their tests.

## 5. Build the frontend in visible slices

Implement the user workflow in this order:

1. Render the application shell and a loading, empty, and error state.
2. Implement ZIP entry and the utility/TDU selection state.
3. Add the plan data hook using the planned `/api/plans/:tdu` contract.
4. Render one plan card from fixture data before connecting live data.
5. Add the bill simulator using the exact interpolation rule in `BRIEF.md`.
6. Add ranking, preference filters, and audit information.
7. Add details and external enrollment links.

Keep the UI working against a small fixture while the API is unfinished. This
lets the student validate the user experience without hiding backend bugs
behind a blank page.

For each slice, ask:

> Implement only this frontend slice. Read `BRIEF.md` first. Use existing
> types and conventions. Do not invent a domain rule. Include loading, empty,
> error, and success states, then add focused tests for the calculation or
> state transition you changed.

## 6. Build the API boundaries

Implement the API routes one at a time, starting with the route that has the
least dependency depth:

1. `api/zip-lookup.ts`: validate the request, call the upstream service, map
   the confirmed upstream identifiers, and return the frontend contract.
2. `api/plans/[tdu].ts`: validate the TDU, list the matching Blob objects,
   select the newest generated file, and issue the documented `307` redirect
   to its public Blob URL. It does not proxy the JSON body directly.
3. Error handling: cover invalid input, upstream non-JSON responses, timeouts,
   empty results, and Blob failures.

Use observed or explicitly documented upstream payloads and the blueprint's
documented contracts. For this reference app, the Power to Choose request
shapes, cookie difference, identifier mapping, anchor ZIPs, and non-JSON
response handling are documented in blueprint section 5. A different app must
replace those examples with its own approved API documentation or fixture.
Do not invent field names or identifier mappings. Test handlers with fixtures
and mocked upstream responses before connecting them to the frontend.

## 7. Build and test the pipeline and cron job

Implement `api/cron/fetch-plans.ts` only after the data contract and API
boundaries exist. Build it as a visible sequence:

1. Fetch the confirmed upstream data for each supported area.
2. Parse and normalize records into the shared TypeScript contract.
3. Apply the product rules from `BRIEF.md`.
4. Retain excluded records and their reason codes when the brief requires it.
5. Write a timestamped JSON output to Vercel Blob.
6. Remove obsolete output only after the new output is successfully written.

Put independently testable calculations in `pipeline/` or the canonical
frontend library, following the blueprint's sharing rule. The cron handler
should coordinate work; it should not hide all domain logic inside one large
function.

Protect the cron route with the existing `CRON_SECRET`. Confirm the variable
with `npx vercel env ls`; do not create a duplicate secret. Use the local seed
script and `vercel dev` to exercise the same HTTP route before waiting for the
nightly schedule. The Blob variables must also exist for the environments in
which the app runs.

Test at least:

- successful ingestion for one area;
- malformed upstream data;
- an upstream failure without deleting the previous Blob output;
- authentication failure;
- filtering and ranking examples from `BRIEF.md`;
- the generated JSON being readable by the plan endpoint.

## 8. Integrate in vertical slices

After each backend slice, connect one real frontend path and verify it locally:

```text
ZIP input -> zip lookup -> TDU selection -> plan endpoint -> plan list
cron route -> normalized data -> Blob -> plan endpoint -> plan list
usage slider -> interpolation -> displayed bill and any brief-defined score changes
```

Use browser checks for visible states and automated tests for calculations,
contracts, and route behavior. When a test fails, identify which boundary
failed before changing code. Do not adjust a formula just to make a snapshot
pass. For the reference app, confirm from `BRIEF.md` that the simulator's
1,000 kWh display default is separate from the ranking basis, that the slider
does not silently recompute frozen score components, that excluded plans keep
reason codes, and that TOU plans are handled separately from ranked plans.
Other projects must verify their own equivalent rules instead.

For a concrete local browser check, run `vercel dev`, open the printed local
URL, and exercise a valid input, invalid input, empty results, loading state,
and error state. If the project has a seed script, run it in a second terminal
before testing the live plan path. Record the tested input and observed result
in the slice review.

## 9. Validate before deployment

Before every merge, run the repository's formatting, typecheck, and test
commands. Also verify:

- no secrets or `.env` files are tracked;
- `vercel.json` points to the frontend build output;
- the production and development environment variables exist;
- the cron schedule and route match;
- the production branch is the intended GitHub branch;
- the Vercel project is connected to the student's repository.

The `vercel.json` file must also match the blueprint: its install command,
build command, development command, frontend output directory, and cron route
must all be present and point to the student's actual project structure. The
development command matters because it prevents `vercel dev` from starting a
second or recursive frontend process.

Deploy a preview first. Exercise ZIP lookup, plan loading, the simulator, and
error states against the preview URL. Only then merge to `main` and verify the
production deployment, Blob output, and cron history in Vercel. Confirm that
automatic deployments come from the intended GitHub branch and that cron is
enabled for Production.

## 10. What the AI assistant should never decide alone

Stop and ask the student or instructor when any of these are missing or
contradictory:

- a formula, threshold, weight, unit, or fee interpretation;
- whether a plan is shown, filtered, or merely flagged;
- the meaning of an upstream field or identifier;
- the environment where a secret is required;
- whether a schema change is backward-compatible;
- whether a failed external request should show cached or empty data.

The student's job is to supply or approve product decisions. The AI assistant's
job is to help implement and verify those decisions within the blueprint.
