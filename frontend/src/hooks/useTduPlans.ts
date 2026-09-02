import { useEffect, useState } from "react";
import type { TduDataFile, TduId } from "../types/plan";
import { fetchTduPlans } from "../lib/api";

// Four states the shell renders (build-guide §5, slice 1):
//   loading  — request in flight
//   error    — request failed or returned an unexpected shape
//   empty    — request succeeded, but this area has no plans
//   success  — request succeeded with at least one plan
export type PlansState =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "empty"; tdu: TduId }
  | { status: "success"; data: TduDataFile };

export function useTduPlans(tdu: TduId): PlansState {
  const [state, setState] = useState<PlansState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });

    fetchTduPlans(tdu, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setState(
          data.plans.length === 0
            ? { status: "empty", tdu }
            : { status: "success", data },
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
  }, [tdu]);

  return state;
}
