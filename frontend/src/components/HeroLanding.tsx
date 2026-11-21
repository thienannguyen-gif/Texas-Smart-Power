import type { ReactNode } from "react";
import { ZipForm } from "./ZipForm";
import { EnergyTiles } from "./EnergyTiles";

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
        <EnergyTiles size="large" className="hidden md:grid" />
      </div>
    </section>
  );
}
