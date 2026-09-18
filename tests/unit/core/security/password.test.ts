import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/core/security/password";

describe("password hashing", () => {
  it("hashes a password to a bcrypt hash different from the plaintext", async () => {
    const hash = await hashPassword("correct-password");

    expect(hash).not.toBe("correct-password");
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  it("verifies the correct password against its hash", async () => {
    const hash = await hashPassword("correct-password");

    await expect(verifyPassword("correct-password", hash)).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("correct-password");

    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });

  it("produces different hashes for the same password (random salt)", async () => {
    const [hashA, hashB] = await Promise.all([
      hashPassword("same-password"),
      hashPassword("same-password"),
    ]);

    expect(hashA).not.toBe(hashB);
  });
});
