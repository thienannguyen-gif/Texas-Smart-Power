// Shared data contract between the ingestion cron job (api/cron/fetch-plans.ts)
// and the browser. Per docs/architecture-blueprint.md §6, the canonical copy
// lives here under frontend/src/ and the API side imports it directly rather
// than keeping a second copy.
//
// SCOPE: this file describes only the *normalized upstream* shape. Ranking
// scores and parsed fees are derived by the ingestion pipeline without changing
// this stored plan shape; other computed fields remain separate.

/** The six Texas utility areas this app supports (blueprint §5). */
export const TDU_IDS = [
  "oncor",
  "centerpoint",
  "aep-central",
  "aep-north",
  "tnmp",
  "lubbock",
] as const;

export type TduId = (typeof TDU_IDS)[number];

/** Short display names for the area pills (the upstream names are long and
 *  all-caps, e.g. "ONCOR ELECTRIC DELIVERY COMPANY"). Display only. */
export const TDU_LABELS: Record<TduId, string> = {
  oncor: "Oncor",
  centerpoint: "CenterPoint",
  "aep-central": "AEP Texas Central",
  "aep-north": "AEP Texas North",
  tnmp: "TNMP",
  lubbock: "Lubbock",
};

export function isTduId(value: string): value is TduId {
  return (TDU_IDS as readonly string[]).includes(value);
}

/**
 * One raw plan record as returned by the Power to Choose `plans` call.
 * Every field is optional — the upstream API omits fields freely.
 *
 * PROVENANCE: transcribed from docs/architecture-blueprint.md §5 — the
 * *documented* contract, NOT a response anyone on this project has observed
 * (powertochoose.org is Cloudflare-blocked from our environment). Per the
 * build guide §4 this is the allowed fallback, but it must be reconciled
 * against a real capture: run `npm run capture-fixture` from an unblocked
 * network, then diff pipeline/__fixtures__/plans.<tdu>.raw.json against this
 * interface. If a field name differs, the capture wins — fix this and the
 * blueprint, don't bend the capture. Do not add fields from a similar-looking
 * API.
 */
export interface RawPlan {
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
  /** CENTS per kWh at 500 / 1000 / 2000 kWh (normalize.ts converts to dollars). */
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

/** Price of a plan at the three usage levels the upstream API samples. */
export interface TieredPrice {
  /** $/kWh when billed at 500 kWh/month. */
  at500: number | null;
  /** $/kWh when billed at 1000 kWh/month. */
  at1000: number | null;
  /** $/kWh when billed at 2000 kWh/month. */
  at2000: number | null;
}

/**
 * A plan after normalization: upstream fields only, coerced to stable types,
 * with `null` standing in for missing/blank values.
 */
export interface Plan {
  /** upstream `plan_id` */
  id: number;
  planName: string;
  companyName: string;
  /** contract length in months (`term_value`) */
  termMonths: number | null;
  /** e.g. "Fixed", "Variable", "Indexed" (`rate_type`) */
  rateType: string | null;
  /** the stability-filter inputs, straight from the API */
  pricePerKwh: TieredPrice;
  /** free-text field; the cancellation fee is buried in here. Parsing it is a
   *  BRIEF.md rule, so this stays raw for now. */
  pricingDetails: string | null;
  isTimeOfUse: boolean;
  renewableDescription: string | null;
  prepaid: boolean;
  companyLogo: string | null;
  website: string | null;
  goToPlanUrl: string | null;
  factSheetUrl: string | null;
  termsUrl: string | null;
  /** "Your Rights as a Customer" document (upstream `yrac_url`). Optional
   *  because data stored before this field was ingested does not have it. */
  yracUrl?: string | null;
  /**
   * Upstream `new_customer`. true: the plan's promo rate is for NEW customers
   * only (an existing customer of the provider cannot get it when their plan
   * expires). false: not restricted that way. null: unknown. Optional because
   * data stored before this field was ingested does not have it.
   */
  newCustomer?: boolean | null;
  enrollPhone: string | null;
}

/** The JSON document written to Blob, one per TDU per cron run. */
export interface TduDataFile {
  tdu: TduId;
  /** ISO timestamp of the run that produced this file */
  generatedAt: string;
  /** How many plans are in `plans` (the ranked ones; time-of-use plans are not counted). */
  planCount: number;
  /** Scored and ranked, best first. Never contains a time-of-use plan. */
  plans: Plan[];
  /**
   * Time-of-use plans, kept out of the ranking (docs/BRIEF.md): sorted by their
   * flat reference rate, cheapest first. Optional because files written before
   * this existed have no such list (their time-of-use plans sit in `plans`).
   */
  timeOfUsePlans?: Plan[];
}
