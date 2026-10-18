import { useEffect, useState } from "react";
import { isTduId, TDU_LABELS, type TduId } from "./types/plan";
import type { UtilityArea } from "./types/zip";
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
  // Every area the active ZIP returned. More than one means a split ZIP: the
  // header then shows the chosen area, and "Change" re-opens the picker from
  // this list — independent of any later lookup for a different ZIP.
  const [activeAreas, setActiveAreas] = useState<UtilityArea[]>([]);
  const [choosingArea, setChoosingArea] = useState(false);

  const lookup = useZipLookup(submittedZip);
  const activeIsSplit = activeAreas.length > 1;

  function submitZip(zip: string) {
    setChoosingArea(false);
    // The ZIP already on screen, and it is split: re-open the area choice.
    if (zip === activeZip && activeIsSplit) setChoosingArea(true);
    if (zip !== submittedZip) setSubmittedZip(zip);
  }

  // Exactly one matching area → use it without making the user pick.
  useEffect(() => {
    if (
      lookup.status === "ready" &&
      lookup.areas.length === 1 &&
      isTduId(lookup.areas[0].code)
    ) {
      setTdu(lookup.areas[0].code);
      setActiveZip(lookup.zip);
      setActiveAreas(lookup.areas);
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

      {/* A newly looked-up split ZIP: pick its area. */}
      {lookup.status === "ready" &&
        lookup.areas.length > 1 &&
        lookup.zip !== activeZip &&
        !choosingArea && (
          <div className="rounded-2xl bg-white/80 p-4">
            <AreaPicker
              areas={lookup.areas}
              onSelect={(code) => {
                if (isTduId(code)) {
                  setTdu(code);
                  setActiveZip(lookup.zip);
                  setActiveAreas(lookup.areas);
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
          onSubmitZip={submitZip}
          areaSwitch={
            activeIsSplit
              ? {
                  currentCode: tdu,
                  options: activeAreas.map((area) => ({
                    code: area.code,
                    label: isTduId(area.code)
                      ? TDU_LABELS[area.code]
                      : area.name,
                  })),
                  choosing: choosingArea,
                  onChange: () => setChoosingArea(true),
                  onSelect: (code) => {
                    if (isTduId(code)) setTdu(code);
                    setChoosingArea(false);
                  },
                  onCancel: () => setChoosingArea(false),
                }
              : undefined
          }
          zipBusy={lookup.status === "loading"}
          zipStatus={lookupMessages}
        />
      ) : (
        <HeroLanding onSubmitZip={submitZip} busy={lookup.status === "loading"}>
          {lookupMessages}
        </HeroLanding>
      )}
    </div>
  );
}
