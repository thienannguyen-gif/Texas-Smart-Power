# Architecture blueprint — build your own copy from scratch

This is not a copy-paste guide. It documents the architecture decisions this
app makes, **verbatim** — the stack, the hosting model, exactly which
serverless functions exist and why, and the cron job — so you can hand this
file to an AI assistant (or read it yourself) and have it generate all the
code fresh in your own repository. You are not forking or cloning
`texas-smart-power-app`; you are building a new app that makes the same
architectural choices.

This file intentionally does **not** cover product/domain logic (the
stability filter formula, the ranking weights, TOU detection rules). That
comes from a separate pipeline: your instructor gives you raw source
material, you synthesize it into a structured spec using NotebookLM, and
you write the result into your own `BRIEF.md` — before you or an AI
assistant touches any ranking/filtering code. From then on, treat
`BRIEF.md` as the source of truth: re-read it fresh each time that code
changes, rather than relying on how you remember the rule, and don't let
an AI assistant guess a formula or constant that isn't written down there.

## 0. Get your own copy of this blueprint

This file lives in a starter repo your instructor maintains, containing
only reference docs like this one — no app code to accidentally build on
top of.

1. Open the starter repo's GitHub page (your instructor will give you the
   link).
2. Click the green **"Use this template"** button (top right, next to
   "Code") → **"Create a new repository."**
3. Choose your own account as the owner, name it, pick public/private,
   and create it.

This gives you a brand-new repository under your own account with one
clean commit — not a fork, no shared commit history with the instructor's
sample app or any other student's repo. (Comfortable with a terminal
instead? `gh repo create my-app --template <instructor>/<starter-repo> --clone`
does the same thing in one command.)

Then clone **your own new repo** (not the starter repo) locally:

```bash
git clone https://github.com/<you>/<your-new-repo>.git
cd <your-new-repo>
```

## 1. What you're setting up first

Before any code:

1. Use the Vercel project you already created and point it at your own GitHub
    repository. In the Vercel dashboard, open the project, go to **Settings →
    Git**, disconnect the currently connected repository if it is different,
    and connect your repository. Keep the project's root directory as `.`.
    Then link the local folder to that same existing project:
    ```bash
    npx vercel login
    npx vercel link
    ```
    Choose your account or team, choose **Link to an existing project**, and
    select the project you already created. This lets you deploy directly from
    the local folder with `npx vercel`, while pushes to the connected GitHub
    repository create automatic Vercel deployments.
2. Provision a **Vercel Blob** store on that project (Storage tab → Create
   Database → Blob → Public access), with the Development environment
   checked so your local machine can read/write it too.
3. Check the project's existing environment variables before creating any.
    In the Vercel dashboard, open **Settings → Environment Variables**, or
    run:
   ```bash
    npx vercel env ls
   ```
    Confirm that `CRON_SECRET` exists for Production and Development, and that
    the Blob variables exist for the environments where the app runs. Do not
    create another `CRON_SECRET` if it is already present. Only add a variable
    when the check shows it is missing for the required environment.
4. Pull your project's settings down locally:
   ```bash
   npx vercel env pull .env.local
   ```
   This command creates `.env.local` for you — you don't create it by
   hand — populated with everything the app needs to run locally (it's
   already covered by `.gitignore`, so it never gets committed). Without
   this step, `vercel dev` can't reach your Blob store
   and `npm run seed` (§8) fails immediately with a missing-`CRON_SECRET`
   error.

Everything below assumes all four of those exist.

## 2. Stack decisions

| Layer               | Choice                                                      | Why                                                                                                                                                                                                                                                |
| ------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Language            | TypeScript everywhere (frontend, API, shared pipeline code) | One language across the whole app; `tsc --noEmit` catches broken calls before they ship — this matters a lot when an AI assistant is writing the code, since a hallucinated function/field fails typecheck instead of failing silently at runtime. |
| Frontend framework  | React 18                                                    | —                                                                                                                                                                                                                                                  |
| Frontend build tool | Vite                                                        | Fast local dev server, and its dev server can be run _inside_ `vercel dev` (see §7) rather than as a separate process.                                                                                                                             |
| Backend runtime     | Node.js, as Vercel Serverless Functions (`@vercel/node`)    | No separate backend server/host to manage — functions live in `/api` and deploy with the same `vercel` command as the frontend.                                                                                                                    |
| Hosting             | A single Vercel project                                     | One project serves the static frontend build, the `/api` functions, and the cron job together — one deploy, one domain, one dashboard.                                                                                                             |
| Data storage        | Vercel Blob only                                            | No database. The app's entire read/write surface is JSON files in Blob. This keeps the architecture to exactly one moving part for storage — don't add Postgres/Prisma/etc. unless your app's requirements genuinely outgrow file storage.         |
| Styling             | Tailwind CSS (via `@tailwindcss/vite`)                      | —                                                                                                                                                                                                                                                  |

## 3. Repo layout

Two `package.json`s in one repo, not a full monorepo tool (no Turborepo/Nx):

```
/                     — root: API functions + shared pipeline code + tooling
  api/                — Vercel serverless functions (file-based routing)
  pipeline/           — plain TS modules shared by API functions (data
                        processing logic that isn't itself an HTTP handler)
  scripts/            — local dev/seed scripts (not deployed)
  package.json        — root deps (@vercel/blob, @vercel/node), typecheck script
  vercel.json          — ties the two halves together (see §7)
  tsconfig.json        — root TS config, covers api/ + pipeline/
frontend/             — the Vite + React app, deployed as static output
  src/
  package.json        — frontend-only deps (react, vite, tailwind, @vercel/analytics)
  tsconfig.json
```

Root `npm run typecheck` runs `tsc --noEmit` on the root config **and**
`npm --prefix frontend run typecheck` — both halves are checked, in one
command, on every commit (see §9).

## 4. The serverless functions (exactly two, plus the cron)

Vercel turns files under `/api` into routes automatically — no router
library, no `express`. This app has exactly three functions, each with a
distinct job. Don't add a fourth without a clear reason; don't merge these
into one without a clear reason either — each exists because it does a
specific thing the frontend or the browser cannot do itself.

### `api/zip-lookup.ts` — proxy an external API that blocks the browser

- **Route:** `POST /api/zip-lookup`
- **Why it exists:** the upstream utility-lookup API has no CORS headers, so
  the browser can't call it directly — the request must be relayed through
  a server the browser trusts (this function).
- **What it does:** takes `{ zip }` from the request body, POSTs it to the
  upstream service, maps the upstream's internal company ID to this app's
  own short utility-area codes via a small lookup table, and returns
  `{ companies: [{ code, name }] }`.
- **Design note:** this function does _not_ read or write Blob. It's a pure
  proxy/translation step — stateless, no storage involved.

### `api/plans/[tdu].ts` — serve the latest data file for one area

- **Route:** `GET /api/plans/:tdu` (dynamic route segment, `[tdu].ts` is
  Vercel's file-based-routing syntax for a path parameter)
- **Why it exists:** the browser never talks to Blob directly or to the
  external plan-data API directly — it always goes through this function,
  which knows how to find "the current data" for a given area.
- **What it does:** validates `tdu` against a fixed allow-list, lists all
  Blob objects with a `plans/{tdu}-` prefix, picks whichever has the newest
  `uploadedAt`, and issues a **307 redirect** to that blob's URL (it does not
  proxy the bytes itself — the client follows the redirect straight to Blob).
- **Design note — why filenames aren't fixed:** each nightly cron run writes
  to a brand-new, timestamped filename instead of overwriting one fixed
  path. Blob's public URLs are edge-cached for a long time, and overwriting
  a fixed path doesn't invalidate copies already cached elsewhere — clients
  could keep getting pre-refresh data indefinitely. Writing a new path every
  run and resolving "newest" at request time sidesteps that entirely: a
  given URL only ever serves one generation's content, so long caching on
  the object itself is safe.

### `api/cron/fetch-plans.ts` — the nightly ingestion job

- **Route:** `POST /api/cron/fetch-plans`, invoked by Vercel Cron (not
  meant to be called directly by the frontend)
- **Auth:** checks `Authorization: Bearer <CRON_SECRET>` and rejects
  anything else with 401. `CRON_SECRET` is a Vercel env var you generate
  yourself (§1, step 3) — Vercel's cron invoker sends it automatically on
  scheduled runs; you'd use the same header to trigger it manually while
  testing.
- **What it does, per data-area:**
  1. Fetches raw data from the external source for that area.
  2. Maps each raw record into the app's internal schema.
  3. Runs it through whatever domain pipeline your app needs (this project's
     pipeline lives in `pipeline/` — see your own `BRIEF.md` for what it
     actually computes; that logic is out of scope for this file).
  4. Writes one JSON file to Blob per area, at a new timestamped path.
  5. Deletes that area's previous run(s) from Blob, now that the new one is
     live — keeps storage from growing forever.
- **Why cron instead of computing this per-request:** the source computation
  is expensive enough (and the upstream data changes slowly enough) that
  doing it once nightly and serving a static result is far cheaper than
  recomputing it on every page load.

## 5. The Power to Choose API contract

This section is an exception to "architecture, not domain logic" (§10). Power
to Choose has no public API documentation — there's no way to reason your
way to the correct field names or IDs, only to observe them. Leaving this
out would force an AI assistant regenerating this code to invent a shape
that's superficially plausible and factually wrong. So unlike the ranking
formula or the TDU list, this one payload contract is included verbatim,
because "verbatim" is the only way it can be correct.

If your own app's version calls a _different_ upstream API, replace this
whole section with that API's actual observed shape — don't leave this
one in place as a stand-in.

### ZIP → utility lookup (`api/zip-lookup.ts`'s upstream call)

```ts
// Request
POST https://www.powertochoose.org/en-us/service/v1/
headers: {
  "content-type": "application/json",
  "Cookie": "PowerToChoose.CurrentLanguage=en-US",
}
body: {
  method: "TduCompaniesByZip",
  zip_code: string,
  include_details: false,
  language: 0,
}

// Response: JSON array
interface PowerToChooseUtilityResponse {
  company_id?: string;
  company_name?: string;
}
```

`company_id` is an opaque upstream ID, not a usable code on its own — it's
mapped to this app's own short TDU codes via a fixed table (six entries, one
per Texas utility area this app supports):

```ts
const COMPANY_ID_TO_TDU: Record<string, string> = {
  ELSQL01DB1245281100004: "centerpoint",
  ELSQL01DB1245538000024: "lubbock",
  ELSQL01DB1245281100006: "oncor",
  ELSQL01DB1245281100002: "aep-central",
  ELSQL01DB1245281100003: "aep-north",
  ELSQL01DB1245281100008: "tnmp",
};
```

A ZIP can map to more than one entry (some ZIPs span two utility
territories) — the response is an array for exactly that reason, and the
frontend shows a picker when it has more than one item.

### Plan data (`api/cron/fetch-plans.ts`'s upstream call)

Same endpoint, different `method`, and no `Cookie` header this time — that
asymmetry is real, not an oversight to "fix":

```ts
// Request
POST https://www.powertochoose.org/en-us/service/v1/
headers: { "content-type": "application/json" }
body: {
  method: "plans",
  zip_code: string,       // one anchor ZIP per TDU, see below
  company_tdu_id: "",
  company_unique_id: "",
  plan_mo_from: "",
  plan_mo_to: "",
  estimated_use: 1000,
  plan_type: "1",
  rating_total: "",
  include_details: true,
  language: 0,
  min_usage_plan: "off",
}

// Response: JSON array
interface PowerToChoosePlanResponse {
  plan_id?: number;
  zip_code?: string;
  company_name?: string;
  company_logo?: string;
  website?: string;
  company_tdu_name?: string;
  plan_name?: string;
  plan_details?: string;
  plan_type?: number;
  rate_type?: string;
  term_value?: number;
  price_kwh500?: number;
  price_kwh1000?: number;
  price_kwh2000?: number;
  pricing_details?: string;
  timeofuse?: boolean;
  renewable_energy_description?: string;
  special_terms?: string;
  fact_sheet?: string;
  terms_of_service?: string;
  go_to_plan?: string;
  yrac_url?: string;
  enroll_phone?: string;
  promotions?: string;
  prepaid?: boolean;
  prepaid_url?: string;
  new_customer?: boolean;
  minimum_usage?: boolean;
}
```

The three price fields (`price_kwh500`/`1000`/`2000`) are the entire reason
the stability filter in BRIEF.md is possible — the upstream API already
prices each plan at three usage levels, so catching a plan that's cheap at
one level and expensive at another doesn't require estimating anything,
just comparing fields that are already there.

Each TDU is queried with one fixed "anchor" ZIP known to sit entirely
inside that utility's territory (not a split-territory ZIP, which would
mix another TDU's plans into the wrong file):

```ts
const ZIP_CODES_BY_TDU: Record<TduId, string> = {
  oncor: "75201",
  centerpoint: "77002",
  "aep-central": "78401",
  "aep-north": "79601",
  tnmp: "75067",
  lubbock: "79424",
};
```

**Not covered here:** how `cancellationFee` gets parsed out of
`pricing_details` — domain logic, not API shape (see intro).

**Both calls guard against non-JSON responses** — wrap the upstream
`response.text()` in a `try { JSON.parse(...) }` and fall back gracefully
(empty list, or passing the raw error text through) rather than letting a
malformed/error response crash the function. Any external API you call
that isn't guaranteed to return clean JSON on every request needs the same
guard.

## 6. Sharing code between the two TypeScript projects

The API side (root `tsconfig.json`) and the frontend (`frontend/tsconfig.json`)
are two separate TypeScript compilations — root's `tsconfig.json` explicitly
`exclude`s `frontend`. But some logic (the ranking formula, in this app) must
run in **both** places: once nightly on the server (`api/cron/fetch-plans.ts`,
scoring the freshly-fetched data) and once in the browser (re-scoring when
the user moves a usage slider, without waiting on a new server round-trip).
Duplicating that formula in two files is how it silently drifts out of sync.

The fix: the real implementation lives in exactly one place —
`frontend/src/lib/ranking.ts` — and the root-side module is a re-export
shim, nothing more:

```ts
// pipeline/ranking.ts
export * from "../frontend/src/lib/ranking";
```

This works even though root's `tsconfig.json` excludes `frontend`, because
`exclude` only keeps files out of the _initial_ root-file set matched by
`include` — it does not stop TypeScript from following a relative import
into an excluded directory once some included file (like `pipeline/ranking.ts`
here) reaches into it. The imported file still gets fully type-checked; it's
just not a compilation _root_ on its own.

Same pattern applies to shared data types: `api/plans/[tdu].ts` and
`api/cron/fetch-plans.ts` both import `Plan`/`TduDataFile`/`TduId` straight
from `frontend/src/types/plan.ts` rather than a duplicated copy in `pipeline/`
or root.

**When building your own version:** decide once, up front, which domain
logic needs to run on both sides. If any does, put the real implementation
under `frontend/src/lib/` (or `frontend/src/types/` for shared types) and
re-export it from a root-side module — don't let an AI assistant write two
independent copies because it's working through one file at a time.

## 7. Wiring it together: `vercel.json`

```json
{
  "installCommand": "npm install && npm install --prefix frontend",
  "buildCommand": "npm run build --prefix frontend",
  "devCommand": "npm --prefix frontend run dev",
  "outputDirectory": "frontend/dist",
  "crons": [{ "path": "/api/cron/fetch-plans", "schedule": "0 9 * * *" }]
}
```

- `installCommand`/`buildCommand` install and build **both** halves of the
  repo (root has no build step of its own; the frontend does).
- `devCommand` matters more than it looks: `vercel dev` needs to know how to
  start your frontend's dev server. Point it at the frontend's own `vite`
  script directly. If you leave this out, `vercel dev` falls back to running
  the root `npm run dev` script — and if that script itself calls
  `vercel dev` (see §8), you get infinite recursive self-invocation.
- `crons` is what actually schedules the ingestion job — without this
  entry, the cron function file exists but nothing ever calls it in
  production. Cron schedules run in UTC.

## 8. Local dev: one process, one port, plus a seed script

`npm run dev` (root) runs `node scripts/dev.mjs` rather than calling
`vercel dev` directly from `package.json`. That indirection exists for one
specific reason: `vercel dev`'s own Development Command setting (the
`devCommand` in `vercel.json`, §7) already starts the frontend's Vite dev
server internally and proxies it through the same port — spawning a
_second_, independent Vite process alongside it (watching the same files)
previously collided on Windows and crashed with a libuv assertion. The
wrapper script's only job is to spawn exactly one `vercel dev` process:

```js
// scripts/dev.mjs
import { spawn, execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";

const api = spawn(npxCommand, ["vercel", "dev", "--listen", "3000"], {
  cwd: rootDir,
  stdio: "inherit",
  shell: true,
});

api.on("exit", (code) => {
  if (code && code !== 0) {
    console.error(`[api] exited with code ${code}`);
    process.exit(code);
  }
});

// On Windows, api is spawned with shell: true (needed to resolve npx.cmd),
// so child.kill() only terminates the intermediate cmd.exe wrapper — the
// real vercel/vite node.exe processes are left running as orphans.
// taskkill /T walks the whole process tree instead.
function killTree(child) {
  if (process.platform === "win32") {
    try {
      execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"]);
    } catch {
      // already exited
    }
  } else {
    child.kill("SIGINT");
  }
}

process.on("SIGINT", () => {
  killTree(api);
  process.exit(0);
});
```

The `killTree` function is the part worth not skipping: on Windows,
`shell: true` is required to resolve `npx.cmd`, but it means the spawned
process is actually `cmd.exe` running `npx`, which in turn runs `vercel`,
which in turn runs Vite — a chain of processes. A plain `child.kill()` only
kills the top `cmd.exe` link, leaving the real `vercel`/`vite` processes
running invisibly in the background after Ctrl+C. If you skip this, Windows
users on your own project will see mysteriously-already-in-use ports the
next time they run `npm run dev`, with no obvious cause.

A second script, `npm run seed`, exists so you're not stuck waiting for the
nightly cron schedule to populate Blob for the first time. It calls the
**local dev server's own cron endpoint** over HTTP — it isn't a shortcut
that bypasses the pipeline, it exercises the exact same code path the real
cron job does, just triggered on demand instead of on a schedule:

```js
// scripts/seed.mjs
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env.local");

let envContent;
try {
  envContent = readFileSync(envPath, "utf8");
} catch {
  console.error("Could not find .env.local in the project root.");
  console.error("Run `npx vercel env pull .env.local` first.");
  process.exit(1);
}

const match = envContent.match(/^CRON_SECRET="?([^"\n]+)"?$/m);
if (!match) {
  console.error("CRON_SECRET not found in .env.local.");
  process.exit(1);
}

const cronSecret = match[1];

let response;
try {
  response = await fetch("http://localhost:3000/api/cron/fetch-plans", {
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
} catch (error) {
  console.error(
    "Could not reach http://localhost:3000 — is `npm run dev` running in another terminal?"
  );
  process.exit(1);
}

const body = await response.json().catch(() => null);
if (!response.ok) {
  console.error(`Seed failed (HTTP ${response.status}):`, body);
  process.exit(1);
}

console.log("Done:", body);
```

Two details worth keeping if you write your own version: it reads
`CRON_SECRET` out of `.env.local` with a regex rather than a dotenv
dependency (one less package for something this small), and it fails loudly
with a specific, actionable message at each step (missing file, missing
var, unreachable server, non-2xx response) rather than a bare stack trace —
worth doing for anything a non-technical student will run directly.

## 9. Guardrails worth carrying over

- **Pre-commit hook** (Husky): runs Prettier, then `npm run typecheck`
  (both halves) on every commit. This is the single biggest catch for
  AI-generated code — a call to a function or field that doesn't exist
  fails typecheck before it reaches `main`.
- **Branch discipline:** never commit straight to `main`. Branch first,
  push, review, merge.
- **A domain source-of-truth file**, BRIEF.md-style: write non-obvious
  business rules down in one file and have your AI assistant re-read it
  before touching that code, rather than recalling it from earlier in the
  conversation.

## 10. What this file deliberately leaves out

- Domain logic — ranking/filtering formulas, cancellation-fee parsing, and
  any other rule about _what to do_ with fetched data. Not architecture;
  see the intro and BRIEF.md.
- UI component structure — a design decision, not an infrastructure one.
