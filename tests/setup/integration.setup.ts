/**
 * Points the integration test project at TEST_DATABASE_URL instead of the
 * development DATABASE_URL, so integration tests never touch dev data.
 * Falls back to DATABASE_URL if TEST_DATABASE_URL isn't set.
 *
 * This must run before any module that reads env.DATABASE_URL (e.g.
 * core/database/prisma.ts) is imported by a test file.
 */
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
