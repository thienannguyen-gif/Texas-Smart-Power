// Small footer shown on every page, so the disclaimer is always reachable.
export function SiteFooter({ dark = false }: { dark?: boolean }) {
  return (
    <footer
      className={`px-4 py-6 text-center text-xs ${
        dark ? "bg-bar text-bar-fg" : "text-ink-soft"
      }`}
    >
      <a href="#disclaimer" className="inline-block px-2 py-2 underline">
        Disclaimer &amp; Terms of Use
      </a>
    </footer>
  );
}
