import { useEffect, useState } from "react";
import { isTduId, type TduId } from "./types/plan";
import { useZipLookup } from "./hooks/useZipLookup";
import { SiteHeader } from "./components/SiteHeader";
import { HeroLanding } from "./components/HeroLanding";
import { AreaPicker } from "./components/AreaPicker";
import { PlansView } from "./components/PlansView";

export default function App() {
  // submittedZip drives the lookup; activeZip is the ZIP whose area (tdu) the
  // plan list is showing. They differ while a new ZIP is being looked up, so
  // the page keeps showing the old plans until the new area is confirmed.
  const [submittedZip, setSubmittedZip] = useState<string | null>(null);
  const [tdu, setTdu] = useState<TduId | null>(null);
  const [activeZip, setActiveZip] = useState("");

  const lookup = useZipLookup(submittedZip);

  // Exactly one matching area → use it without making the user pick.
  useEffect(() => {
    if (
      lookup.status === "ready" &&
      lookup.areas.length === 1 &&
      isTduId(lookup.areas[0].code)
    ) {
      setTdu(lookup.areas[0].code);
      setActiveZip(lookup.zip);
    }
  }, [lookup]);

  // Lookup feedback, shown under the ZIP form on the landing page and under
  // the ZIP bar once plans are showing.
  const lookupMessages = (
    <>
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
          <span className="font-semibold">{lookup.zip}</span>. Double-check the
          digits.
        </p>
      )}

      {lookup.status === "ready" &&
        lookup.areas.length > 1 &&
        lookup.zip !== activeZip && (
          <div className="rounded-2xl bg-white/80 p-4">
            <AreaPicker
              areas={lookup.areas}
              onSelect={(code) => {
                if (isTduId(code)) {
                  setTdu(code);
                  setActiveZip(lookup.zip);
                }
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
    </>
  );

  return (
    <div className="min-h-screen">
      <SiteHeader />

      {tdu ? (
        <PlansView
          tdu={tdu}
          zip={activeZip}
          onSubmitZip={setSubmittedZip}
          zipBusy={lookup.status === "loading"}
          zipStatus={lookupMessages}
        />
      ) : (
        <HeroLanding
          onSubmitZip={setSubmittedZip}
          busy={lookup.status === "loading"}
        >
          {lookupMessages}
        </HeroLanding>
      )}
    </div>
  );
}
