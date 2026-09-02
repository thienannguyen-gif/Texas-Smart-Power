import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Not using Vitest `globals`, so React Testing Library's automatic post-test
// cleanup isn't registered — do it here, or renders leak between tests.
afterEach(() => {
  cleanup();
});
