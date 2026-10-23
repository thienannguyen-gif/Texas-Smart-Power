/**
 * `value` if it is a web address (http or https), otherwise null. Links in the
 * plan data come from outside, so anything else (javascript:, data:, a bare
 * word) is never turned into a link.
 */
export function httpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

/** A tel: link for a phone number as written, or null if it has no digits. */
export function telHref(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/[^\d+]/g, "");
  return /\d/.test(digits) ? `tel:${digits}` : null;
}
