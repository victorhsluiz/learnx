import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

/**
 * Seeds a single demo user so the app has something to log in with right
 * after `prisma migrate dev`. Safe to run multiple times: upserts by email
 * instead of failing on unique constraint violations.
 *
 * The password hash below corresponds to the plaintext "learnx-demo123"
 * (bcrypt, cost 10). It is only ever used in development/test databases.
 */
const DEMO_USER = {
  email: "demo@learnx.dev",
  name: "Demo User",
  passwordHash: "$2b$10$0njtok66lT/hq6J9oG47.ux4Qw9ka7l9oBABAq.V5PXRd2k6QTltG",
};

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    const user = await prisma.user.upsert({
      where: { email: DEMO_USER.email },
      update: {},
      create: DEMO_USER,
    });

    console.log(`Seeded demo user: ${user.email} (${user.id})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});
