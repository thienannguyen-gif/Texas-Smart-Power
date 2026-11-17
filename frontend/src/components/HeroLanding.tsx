import type { ReactNode } from "react";
import { ZipForm } from "./ZipForm";

// The landing screen: a dark green cover with the three-line headline, the ZIP
// entry, and a grid of energy tiles on the right (decorative, hidden from
// screen readers and on phones). `children` is where lookup states (loading /
// picker / not-found / error) render, below the form, on a white panel.
export function HeroLanding({
  onSubmitZip,
  busy,
  children,
}: {
  onSubmitZip: (zip: string) => void;
  busy: boolean;
  children?: ReactNode;
}) {
  return (
    <section className="bg-bar text-bar-fg">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1fr_auto] md:py-20">
        <div className="max-w-xl">
          <h1 className="text-5xl leading-[1.05] font-extrabold tracking-tight sm:text-6xl">
            <span className="block text-white">Your power.</span>{" "}
            <span className="block text-white">Your choice.</span>{" "}
            <span className="block text-gold">Your savings.</span>
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-bar-fg">
            Every electricity plan in your area, pulled from{" "}
            <strong className="font-semibold text-white">
              Power to Choose
            </strong>{" "}
            and ranked by your real monthly cost
          </p>
          <div className="mt-6 max-w-md">
            <ZipForm onSubmit={onSubmitZip} busy={busy} />
          </div>
          {children && (
            <div className="mt-6 max-w-md rounded-xl bg-surface p-4 text-left text-ink empty:hidden">
              {children}
            </div>
          )}
        </div>
        <EnergyTiles />
      </div>
    </section>
  );
}

const ICON = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

// Nine tiles, 3 x 3: sun, circle, wind turbine / quarter, home, bolt /
// quarter, plug, blank.
function EnergyTiles() {
  const tile = "h-24 w-24 lg:h-28 lg:w-28";
  const box = `${tile} grid place-items-center rounded-2xl`;
  const icon = "h-10 w-10";
  return (
    <div aria-hidden="true" className="hidden grid-cols-3 gap-3 md:grid">
      <div className={`${box} bg-gold text-bar`}>
        <svg viewBox="0 0 24 24" className={icon} {...ICON}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      </div>
      <div className={`${tile} rounded-full bg-brand`} />
      <div className={`${box} bg-white text-bar`}>
        <svg viewBox="0 0 24 24" className={icon} {...ICON}>
          <path d="M12 12v10M12 12 9 3M12 12l8 3M12 12l-7 5" />
          <circle cx="12" cy="12" r="1" />
        </svg>
      </div>
      <div className={`${tile} rounded-tl-[100%] bg-[#7fd1b0]`} />
      <div className={`${box} bg-white text-bar`}>
        <svg viewBox="0 0 24 24" className={icon} {...ICON}>
          <path d="M3 11 12 4l9 7M5 10v10h14V10" />
          <path d="m13 11-3 4h4l-3 4" />
        </svg>
      </div>
      <div className={`${box} bg-brand text-gold`}>
        <svg viewBox="0 0 24 24" className={icon} {...ICON}>
          <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
        </svg>
      </div>
      <div className={`${tile} rounded-tr-[100%] bg-[#d4a43c]`} />
      <div className={`${box} bg-[#7fd1b0] text-bar`}>
        <svg viewBox="0 0 24 24" className={icon} {...ICON}>
          <path d="M9 2v5M15 2v5M6 7h12v4a6 6 0 0 1-12 0zM12 17v5" />
        </svg>
      </div>
      <div className={`${tile} rounded-2xl bg-white/10`} />
    </div>
  );
}
