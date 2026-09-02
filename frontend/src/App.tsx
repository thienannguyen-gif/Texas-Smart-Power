import { useEffect, useState } from "react";
import { isTduId, type TduId } from "./types/plan";
import { useZipLookup } from "./hooks/useZipLookup";
import { SiteHeader } from "./components/SiteHeader";
import { HeroLanding } from "./components/HeroLanding";
import { AreaPicker } from "./components/AreaPicker";
import { PlansView } from "./components/PlansView";

export default function App() {
  const [submittedZip, setSubmittedZip] = useState<string | null>(null);
  const [tdu, setTdu] = useState<TduId | null>(null);

  // Pause the lookup once an area is chosen.
  const lookup = useZipLookup(tdu ? null : submittedZip);

  // Exactly one matching area → use it without making the user pick.
  const readyAreas = lookup.status === "ready" ? lookup.areas : null;
  useEffect(() => {
    if (readyAreas && readyAreas.length === 1 && isTduId(readyAreas[0].code)) {
      setTdu(readyAreas[0].code);
    }
  }, [readyAreas]);

  function reset() {
    setTdu(null);
    setSubmittedZip(null);
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />

      {tdu ? (
        <PlansView tdu={tdu} zip={submittedZip ?? ""} onChangeZip={reset} />
      ) : (
        <HeroLanding
          onSubmitZip={setSubmittedZip}
          busy={lookup.status === "loading"}
        >
          {lookup.status === "loading" && (
            <p role="status" className="text-brand-navy/80">
              Looking up your area…
            </p>
          )}

          {lookup.status === "error" && (
            <div
              role="alert"
              className="rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-red-800"
            >
              <p className="font-bold">Couldn’t look up that ZIP.</p>
              <p className="mt-1 text-sm">{lookup.error}</p>
            </div>
          )}

          {lookup.status === "notFound" && (
            <p className="rounded-2xl bg-white/70 p-4 text-brand-navy/80">
              No Texas utility area found for ZIP{" "}
              <span className="font-semibold">{lookup.zip}</span>. Double-check
              the digits.
            </p>
          )}

          {lookup.status === "ready" && lookup.areas.length > 1 && (
            <div className="rounded-2xl bg-white/80 p-4">
              <AreaPicker
                areas={lookup.areas}
                onSelect={(code) => {
                  if (isTduId(code)) setTdu(code);
                }}
              />
            </div>
          )}

          {lookup.status === "ready" &&
            lookup.areas.length === 1 &&
            !isTduId(lookup.areas[0].code) && (
              <p className="rounded-2xl bg-white/70 p-4 text-brand-navy/80">
                That ZIP didn’t match a utility area this app supports.
              </p>
            )}
        </HeroLanding>
      )}
    </div>
  );
}
