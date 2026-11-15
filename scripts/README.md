# scripts/

One-off analysis and maintenance scripts. None of them is part of the app.

## Power to Choose cannot be called from the dev environment

`powertochoose.org` answers **HTTP 403** (a Cloudflare page, not JSON) to
requests from the dev machine. Observed 2026-11-16 with one read-only request
for Oncor's anchor ZIP. Do not work around it (no VPN, no proxy, no header
tricks): `pipeline/__fixtures__/README.md` says the same about captures.

So any analysis of the **raw** Power to Choose data has to come from the
deployed job:

- The nightly job logs one line per TDU, `[ingest-stats] {...}`, with how many
  plans it received, how many have all three anchor prices and a term, how many
  have a cancellation fee or a renewable % the app cannot read, and the first
  five raw `pricingDetails` strings of the unreadable-fee plans
  (`pipeline/ingest-stats.ts`). Read them in Vercel > Logs. The same numbers are
  in the job's JSON response under `results[].stats`.
- The files in Vercel Blob hold the **processed** plans only, so they cannot
  answer questions about what the job left out.
