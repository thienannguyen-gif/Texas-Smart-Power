// Small footer shown on every page, so the disclaimer is always reachable.
export function SiteFooter() {
  return (
    <footer className="border-t border-line-soft">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <a
          href="#disclaimer"
          className="inline-block py-2 text-sm text-brand underline"
        >
          Disclaimer &amp; Terms of Use
        </a>
      </div>
    </footer>
  );
}
