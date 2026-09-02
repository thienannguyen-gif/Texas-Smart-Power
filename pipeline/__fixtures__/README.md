# Test fixtures

Two kinds of file live here. Keep them straight.

## `plans.<tdu>.raw.json` — REAL captured responses (preferred)

Verbatim JSON from a real `plans` call to powertochoose.org, written by
`npm run capture-fixture`. **Never hand-edit these** and never create one by
hand — the whole point is that they are observed, not guessed
(`docs/student-build-guide.md` §4, §6). `CAPTURE-LOG.md` records the request,
date, and record count for each.

When a capture exists for a TDU, `npm run seed` uses it. Otherwise it falls
back to the synthetic sample below.

### Capturing

powertochoose.org is behind Cloudflare and returns `403` from many networks
(including this dev environment). Run the capture from somewhere it works:

```
npm run capture-fixture            # all six TDUs
npm run capture-fixture oncor      # just one
```

Options if your network is blocked: a phone hotspot, an instructor-run
capture, or paste the request from `docs/student-build-guide.md` §4 into
<https://reqbin.com/> and save the response array as `plans.<tdu>.raw.json`
by hand (this is the one allowed manual case — copy it exactly, change
nothing). **Do not bypass the block.**

After capturing, diff a file against `RawPlan` in
`frontend/src/types/plan.ts` and `architecture-blueprint.md` §5. If a field
name differs, the capture is right — fix the type and the blueprint.

## `plans.sample.json` — SYNTHETIC placeholder (fallback only)

Fabricated structural data (`PLACEHOLDER Power Co`, `SAMPLE — …`,
`example.invalid`). Used only to exercise plumbing when no real capture
exists:

- `normalizePlan` field mapping / missing-field handling
- `applyPipeline` wiring
- the cron job's Blob write + delete-old-runs path
- `api/plans/[tdu].ts` → frontend read path

It must **not** be used to validate domain rules (stability filter, ranking
weights, TOU detection — those need real data and `BRIEF.md`).

## How `npm run seed` picks a source

Per TDU: `plans.<tdu>.raw.json` if present → else `plans.sample.json`. The
seed output's `results[].source` says which was used (`captured:<tdu>` vs
`sample(synthetic)`). The header is honoured only when `VERCEL_ENV` is unset
or `development`; preview and production always fetch live.

- `npm run seed` → seed Blob from fixtures (captured, or synthetic fallback)
- `npm run seed -- --live` → attempt the real fetch instead
