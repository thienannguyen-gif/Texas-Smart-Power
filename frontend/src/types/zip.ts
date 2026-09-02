// Shared contract with api/zip-lookup.ts (see docs/architecture-blueprint.md
// §4–5). That endpoint takes { zip }, maps the upstream utility IDs to this
// app's short TDU codes, and returns them as { code, name }.
//
// `code` is typed as string, not TduId, because it arrives over the network —
// validate it with isTduId (from ./plan) before using it as a TduId.

export interface UtilityArea {
  code: string;
  name: string;
}

export interface ZipLookupResponse {
  companies: UtilityArea[];
}
