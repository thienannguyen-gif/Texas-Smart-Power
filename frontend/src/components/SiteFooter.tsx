// Small footer shown on every page, so the disclaimer is always reachable.
export function SiteFooter() {
  return (
    <footer className="px-4 py-6 text-center text-xs text-brand-navy/70">
      <a href="#disclaimer" className="inline-block px-2 py-2 underline">
        Disclaimer &amp; Terms of Use
      </a>
    </footer>
  );
}
