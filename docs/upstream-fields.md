# Upstream field list (Power to Choose `plans` response)

**Status: OBSERVED, not DOCUMENTED.**

Observed 2026-10-18 from a live Vercel cron run of `/api/cron/fetch-plans` on
the **production deployment**, which logged the key names of the first raw plan
record it received (before normalization). This is **not taken from
documentation** — it is the first real look we have at the upstream response
shape. Only key _names_ were logged, never values, so the field list below says
nothing about what values look like. (`yrac_url` population was checked
separately — see "Confirmed by this observation".)

Limits of this observation:

- It is the first record of one response only. The upstream API omits fields
  freely (see `RawPlan` in `frontend/src/types/plan.ts`), so a field missing
  from this record may still appear on others, and a field listed here may be
  empty on many plans.
- Population counts and value formats (e.g. whether `new_customer` is a
  boolean, whether `yrac_url` is a full URL) are **not yet verified**.

## Fields, in the order returned (41)

| #   | Field                          | #   | Field                          |
| --- | ------------------------------ | --- | ------------------------------ |
| 0   | `plan_id`                      | 21  | `prepaid`                      |
| 1   | `zip_code`                     | 22  | `timeofuse`                    |
| 2   | `company_unique_id`            | 23  | `pricing_details`              |
| 3   | `company_id`                   | 24  | `fact_sheet`                   |
| 4   | `company_tdu_id`               | 25  | `terms_of_service`             |
| 5   | `company_tdu_name`             | 26  | `go_to_plan`                   |
| 6   | `company_name`                 | 27  | `promotions`                   |
| 7   | `company_logo`                 | 28  | `prepaid_url`                  |
| 8   | `website`                      | 29  | `yrac_url`                     |
| 9   | `plan_name`                    | 30  | `enroll_phone`                 |
| 10  | `plan_details`                 | 31  | `renewable_energy_id`          |
| 11  | `plan_type`                    | 32  | `renewable_energy_description` |
| 12  | `special_terms`                | 33  | `rating_total`                 |
| 13  | `rate_type`                    | 34  | `rating_count`                 |
| 14  | `term_value`                   | 35  | `jdp_rating`                   |
| 15  | `price_kwh500`                 | 36  | `jdp_rating_year`              |
| 16  | `price_kwh1000`                | 37  | `sort_key`                     |
| 17  | `price_kwh2000`                | 38  | `simple_plan`                  |
| 18  | `detail_kwh500`                | 39  | `new_customer`                 |
| 19  | `detail_kwh1000`               | 40  | `minimum_usage`                |
| 20  | `detail_kwh2000`               |     |                                |

## Compared with the repo's documented `RawPlan`

- All 28 fields documented in `RawPlan` / `architecture-blueprint.md` §5 were
  observed, under the same names.
- 13 observed fields are **not** in `RawPlan` or the blueprint:
  `company_unique_id`, `company_id`, `company_tdu_id`, `detail_kwh500`,
  `detail_kwh1000`, `detail_kwh2000`, `renewable_energy_id`, `rating_total`,
  `rating_count`, `jdp_rating`, `jdp_rating_year`, `sort_key`, `simple_plan`.
  `RawPlan` has not been updated for these; nothing reads them.

## Fields the normalizer reads (`pipeline/normalize.ts`)

`plan_id`, `plan_name`, `company_name`, `term_value`, `rate_type`,
`price_kwh500`, `price_kwh1000`, `price_kwh2000`, `pricing_details`,
`timeofuse`, `renewable_energy_description`, `prepaid`, `company_logo`,
`website`, `go_to_plan`, `fact_sheet`, `terms_of_service`, `yrac_url`,
`new_customer`, `enroll_phone`.

Observed but **not read**: `special_terms`, `promotions`, `prepaid_url`,
`minimum_usage`, and the 13 fields above.

## Confirmed by this observation

- **YRAC link:** the field is `yrac_url` (index 29). The normalizer's name was
  correct. After the cron run following deploy, the stored plans (Blob,
  generated 2026-10-18 14:15 UTC) have `yracUrl` populated on **854 of 854**
  plans (127 aep-central, 123 aep-north, 132 centerpoint, 79 lubbock, 132
  oncor, 261 tnmp). Not every value is a direct PDF: the lubbock sample is a
  viewer page (`eflviewer.gexaenergy.com/eflviewer.aspx?...prodcode=YRAC`).
- **Customer eligibility:** `new_customer` exists (index 39). Meaning,
  confirmed by the course instructor: `true` = the plan's promo rate is
  available to NEW customers only; an existing customer of that provider cannot
  get it when their current plan expires. In the instructor's reference app's
  data (a different pipeline, so not a raw capture) it is a plain boolean:
  119 of 139 Oncor plans true, 20 false. The raw upstream type has not been
  observed here, so the normalizer accepts a boolean, "true"/"false" or 1/0 and
  treats anything else as unknown (null). Our own stored plans carry it after
  the first ingestion run that follows this change.
