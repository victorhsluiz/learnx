import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Testing Library's auto-cleanup relies on the test globals being
// registered on the global object (e.g. via Vitest's `globals: true`),
// which this project doesn't enable. Register it explicitly instead, so
// each test starts from a clean DOM.
afterEach(() => {
  cleanup();
});

// jsdom doesn't implement matchMedia, but Mantine's color scheme detection
// calls it on mount. Stub it out so any test rendering a Mantine component
// (directly or via MantineProvider) doesn't crash.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
