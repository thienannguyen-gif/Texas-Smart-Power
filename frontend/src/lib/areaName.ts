// Words that stay in capitals when an all-caps name is tidied up.
const KEEP_UPPER = new Set(["LLC", "LP", "LTD", "INC", "AEP", "TNMP", "TDU"]);

/**
 * The upstream sends utility names in capitals ("ONCOR ELECTRIC DELIVERY
 * COMPANY"). Show them as "Oncor Electric Delivery Company". A name that is
 * already mixed case is left exactly as it is.
 */
export function displayAreaName(raw: string): string {
  const name = raw.trim();
  if (name === "" || name !== name.toUpperCase()) return name;
  return name
    .split(/(\s+)/)
    .map((token) =>
      token
        .split("-")
        .map((part) => {
          if (KEEP_UPPER.has(part.replace(/[^A-Za-z]/g, ""))) return part;
          return part.toLowerCase().replace(/[a-z]/, (c) => c.toUpperCase());
        })
        .join("-"),
    )
    .join("");
}
