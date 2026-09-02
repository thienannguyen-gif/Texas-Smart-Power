import { useEffect, useState } from "react";
import type { UtilityArea } from "../types/zip";
import { lookupZip } from "../lib/api";

// States for the ZIP -> utility area lookup (build-guide §5, slice 2):
//   idle     — no ZIP submitted yet
//   loading  — lookup in flight
//   error    — request failed or returned an unexpected shape
//   notFound — lookup succeeded but no Texas utility area matched
//   ready    — one or more areas matched (caller shows a picker if > 1)
export type ZipLookupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "notFound"; zip: string }
  | { status: "ready"; zip: string; areas: UtilityArea[] };

export function useZipLookup(zip: string | null): ZipLookupState {
  const [state, setState] = useState<ZipLookupState>({ status: "idle" });

  useEffect(() => {
    if (zip === null) {
      setState({ status: "idle" });
      return;
    }

    const controller = new AbortController();
    setState({ status: "loading" });

    lookupZip(zip, controller.signal)
      .then((areas) => {
        if (controller.signal.aborted) return;
        setState(
          areas.length === 0
            ? { status: "notFound", zip }
            : { status: "ready", zip, areas },
        );
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        });
      });

    return () => controller.abort();
  }, [zip]);

  return state;
}
