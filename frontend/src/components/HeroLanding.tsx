import type { ReactNode } from "react";
import { ZipForm } from "./ZipForm";
import { Skyline } from "./Skyline";

// The landing screen from the mockup: skyline backdrop, big wordmark, ZIP
// entry, tagline. `children` is where lookup states (loading / picker /
// not-found / error) render, below the form.
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
    <section className="relative overflow-hidden">
      <Skyline className="pointer-events-none absolute inset-x-0 bottom-0 h-44 w-full opacity-90 sm:h-64" />
      <div className="relative mx-auto max-w-3xl px-4 pt-12 pb-32 text-center sm:px-6 sm:pt-16 sm:pb-40">
        <h1 className="text-4xl font-extrabold tracking-tight text-brand-navy sm:text-7xl">
          Texas Smart Power
        </h1>
        <div className="mx-auto mt-8 max-w-2xl sm:mt-10">
          <ZipForm onSubmit={onSubmitZip} busy={busy} />
        </div>
        <p className="mt-6 text-lg font-bold text-white drop-shadow sm:text-xl">
          Your Power. Your Choice. Your Savings.
        </p>
        {children && (
          <div className="mx-auto mt-6 max-w-2xl text-left">{children}</div>
        )}
      </div>
    </section>
  );
}
