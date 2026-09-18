import "dotenv/config";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

const root = import.meta.dirname;

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          setupFiles: ["tests/setup/integration.setup.ts"],
          // Integration tests share a single real database, and several
          // suites use broad cleanup (deleteMany) between tests. Running
          // test files in parallel workers lets one file's cleanup wipe
          // rows another file is mid-test with, so they run sequentially
          // in a single process instead.
          fileParallelism: false,
        },
      },
      {
        extends: true,
        plugins: [react()],
        test: {
          name: "ui",
          environment: "jsdom",
          include: ["tests/ui/**/*.test.{ts,tsx}"],
          setupFiles: ["tests/setup/ui.setup.ts"],
        },
      },
    ],
  },
  resolve: {
    alias: {
      "@": path.join(root, "src"),
    },
  },
});
