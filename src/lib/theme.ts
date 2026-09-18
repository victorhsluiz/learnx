import { createTheme } from "@mantine/core";

/**
 * Central Mantine theme override. Kept intentionally minimal for now —
 * extend colors, fonts and component defaults here as the UI grows.
 */
export const theme = createTheme({
  primaryColor: "blue",
  fontFamily: "var(--font-geist-sans), sans-serif",
  fontFamilyMonospace: "var(--font-geist-mono), monospace",
  headings: {
    fontFamily: "var(--font-geist-sans), sans-serif",
  },
});
