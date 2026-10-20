import { useEffect, useState } from "react";

// The only "routing" the app needs: the current location hash ("#disclaimer",
// or "" for the main screen). A hash route works without server rewrites and
// still gives the page its own link and a working Back button.
export function useHashRoute(): string {
  const [hash, setHash] = useState(() => window.location.hash);

  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    window.addEventListener("hashchange", sync);
    sync();
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return hash;
}
