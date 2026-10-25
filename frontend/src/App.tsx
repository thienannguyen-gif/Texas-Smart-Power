import { useEffect, useState } from "react";
import { isTduId, TDU_LABELS, type TduId } from "./types/plan";
import { displayAreaName } from "./lib/areaName";
import type { UtilityArea } from "./types/zip";
import { useZipLookup } from "./hooks/useZipLookup";
import { SiteHeader } from "./components/SiteHeader";
import { HeroLanding } from "./components/HeroLanding";
import { AreaPicker } from "./components/AreaPicker";
import { PlansView } from "./components/PlansView";
import type { AreaChoice } from "./components/AreaCard";
import { DisclaimerPage } from "./components/DisclaimerPage";
import { SiteFooter } from "./components/SiteFooter";
import { useHashRoute } from "./hooks/useHashRoute";

export default function App() {
  // submittedZip drives the lookup; activeZip is the ZIP whose area (tdu) the
  // plan list is showing. They differ while a new ZIP is being looked up, so
  // the page keeps showing the old plans until the new area is confirmed.
  const [submittedZip, setSubmittedZip] = useState<string | null>(null);
  const [tdu, setTdu] = useState<TduId | null>(null);
  const [activeZip, setActiveZip] = useState("");
  // Every area the active ZIP returned. More than one means a split ZIP: the
  // header then shows an area select built from this list — independent of any
  // later lookup for a different ZIP.
  const [activeAreas, setActiveAreas] = useState<UtilityArea[]>([]);

  const lookup = useZipLookup(submittedZip);
  const onDisclaimer = useHashRoute() === "#disclaimer";
  const activeIsSplit = activeAreas.length > 1;

  function submitZip(zip: string) {
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
        <p role="status" className="text-ink-soft">
          Looking up your area…
        </p>
      )}

      {lookup.status === "error" && (
        <div
          role="alert"
          className="rounded-2xl border-2 border-danger-line bg-danger-soft p-4 text-danger"
        >
          <p className="font-bold">Couldn’t look up that ZIP.</p>
          <p className="mt-1 text-sm">{lookup.error}</p>
        </div>
      )}

      {lookup.status === "notFound" && (
        <p className="rounded-2xl bg-surface/70 p-4 text-ink-soft">
          No Texas utility area found for ZIP{" "}
          <span className="font-semibold">{lookup.zip}</span>. Double-check the
          digits.
        </p>
      )}

      {/* A newly looked-up split ZIP, before any plans are showing: pick its
          area here. Once the plans page is up, its header card does this. */}
      {!tdu &&
        lookup.status === "ready" &&
        lookup.areas.length > 1 &&
        lookup.zip !== activeZip && (
          <div className="rounded-2xl bg-surface/80 p-4">
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
          <p className="rounded-2xl bg-surface/70 p-4 text-ink-soft">
            That ZIP didn’t match a utility area this app supports.
          </p>
        )}
    </>
  );

  const areaOptions = (areas: UtilityArea[]) =>
    areas.map((area) => ({
      code: area.code,
      label: isTduId(area.code) ? TDU_LABELS[area.code] : area.name,
      fullName: area.name,
    }));

  // The header's area card: a freshly searched split ZIP asks for its area; a
  // split ZIP whose area is already chosen shows the choice and lets it change.
  const pendingAreas =
    lookup.status === "ready" &&
    lookup.areas.length > 1 &&
    lookup.zip !== activeZip
      ? lookup.areas
      : null;
  let areaChoice: AreaChoice | undefined;
  if (pendingAreas) {
    areaChoice = {
      options: areaOptions(pendingAreas),
      currentCode: null,
      awaiting: true,
      onSelect: (code) => {
        if (isTduId(code)) {
          setTdu(code);
          setActiveZip(lookup.status === "ready" ? lookup.zip : activeZip);
          setActiveAreas(pendingAreas);
        }
      },
    };
  } else if (activeIsSplit && tdu) {
    areaChoice = {
      options: areaOptions(activeAreas),
      currentCode: tdu,
      awaiting: false,
      onSelect: (code) => {
        if (isTduId(code)) setTdu(code);
      },
    };
  }

  // "Service area <name>" in the header: the utility whose plans are showing.
  const serviceAreaName = tdu
    ? activeAreas.find((area) => area.code === tdu)?.name
    : undefined;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {onDisclaimer && <DisclaimerPage />}

      {/* Hidden, not unmounted, while the disclaimer is open, so the ZIP,
          usage and filters are all still there when the user comes back. */}
      <div hidden={onDisclaimer} className="flex-1">
        {tdu ? (
          <PlansView
            tdu={tdu}
            zip={activeZip}
            onSubmitZip={submitZip}
            serviceArea={
              serviceAreaName ? displayAreaName(serviceAreaName) : undefined
            }
            areaChoice={areaChoice}
            zipBusy={lookup.status === "loading"}
            zipStatus={lookupMessages}
          />
        ) : (
          <HeroLanding
            onSubmitZip={submitZip}
            busy={lookup.status === "loading"}
          >
            {lookupMessages}
          </HeroLanding>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}
