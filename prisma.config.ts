import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Accessed directly (not via the `env()` helper) so that commands that
    // don't need a real connection — like `prisma generate` during the
    // Docker build, before DATABASE_URL is injected — don't fail just
    // because the config file couldn't resolve it.
    url: process.env.DATABASE_URL ?? "",
  },
});
