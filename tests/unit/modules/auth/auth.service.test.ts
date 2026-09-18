import { describe, expect, it, beforeEach } from "vitest";
import { AuthService } from "@/modules/auth/auth.service";
import { hashPassword } from "@/core/security/password";
import { verifyAccessToken } from "@/core/security/jwt";
import { ConflictError, UnauthorizedError } from "@/core/errors";
import type { CreateUserInput, UserRepository } from "@/modules/users/user.repository.interface";
import type {
  CreateRefreshTokenInput,
  RefreshTokenRepository,
} from "@/modules/auth/refresh-token.repository.interface";
import type { RefreshToken, User } from "@/generated/prisma/client";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    email: "demo@learnx.dev",
    passwordHash: "hash",
    name: "Demo",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

class FakeUserRepository implements UserRepository {
  private users: User[] = [];

  seed(user: User) {
    this.users.push(user);
  }

  async findById(id: string): Promise<User | null> {
    return this.users.find((u) => u.id === id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find((u) => u.email === email) ?? null;
  }

  async create(input: CreateUserInput): Promise<User> {
    const user = makeUser({ id: `user-${this.users.length + 1}`, ...input });
    this.users.push(user);
    return user;
  }
}

class FakeRefreshTokenRepository implements RefreshTokenRepository {
  public created: CreateRefreshTokenInput[] = [];

  async create(input: CreateRefreshTokenInput): Promise<RefreshToken> {
    this.created.push(input);
    return {
      id: `rt-${this.created.length}`,
      tokenHash: input.tokenHash,
      userId: input.userId,
      expiresAt: input.expiresAt,
      createdAt: new Date(),
      revokedAt: null,
    };
  }

  async findByTokenHash(): Promise<RefreshToken | null> {
    return null;
  }

  async revoke(): Promise<void> {}
}

describe("AuthService", () => {
  let userRepository: FakeUserRepository;
  let refreshTokenRepository: FakeRefreshTokenRepository;
  let service: AuthService;

  beforeEach(() => {
    userRepository = new FakeUserRepository();
    refreshTokenRepository = new FakeRefreshTokenRepository();
    service = new AuthService(userRepository, refreshTokenRepository);
  });

  describe("register", () => {
    it("creates a user, hashes the password, and issues tokens", async () => {
      const result = await service.register({
        email: "new@learnx.dev",
        password: "correct-password",
        name: "New User",
      });

      expect(result.user.email).toBe("new@learnx.dev");
      expect(result.user.passwordHash).not.toBe("correct-password");
      expect(result.tokens.accessToken).toBeTruthy();
      expect(result.tokens.refreshToken).toBeTruthy();

      const payload = await verifyAccessToken(result.tokens.accessToken);
      expect(payload?.sub).toBe(result.user.id);
    });

    it("persists a hash of the refresh token, not the raw value", async () => {
      const result = await service.register({
        email: "new@learnx.dev",
        password: "correct-password",
        name: "New User",
      });

      expect(refreshTokenRepository.created).toHaveLength(1);
      expect(refreshTokenRepository.created[0].tokenHash).not.toBe(result.tokens.refreshToken);
      expect(refreshTokenRepository.created[0].userId).toBe(result.user.id);
    });

    it("throws ConflictError when the email is already registered", async () => {
      userRepository.seed(makeUser({ email: "taken@learnx.dev" }));

      await expect(
        service.register({
          email: "taken@learnx.dev",
          password: "correct-password",
          name: "Someone",
        }),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("login", () => {
    it("issues tokens when the password matches", async () => {
      const passwordHash = await hashPassword("correct-password");
      const user = makeUser({ email: "demo@learnx.dev", passwordHash });
      userRepository.seed(user);

      const result = await service.login({
        email: "demo@learnx.dev",
        password: "correct-password",
      });

      expect(result.user.id).toBe(user.id);
      expect(result.tokens.accessToken).toBeTruthy();
    });

    it("throws UnauthorizedError when the email doesn't exist", async () => {
      await expect(
        service.login({ email: "nobody@learnx.dev", password: "whatever" }),
      ).rejects.toThrow(UnauthorizedError);
    });

    it("throws UnauthorizedError when the password doesn't match", async () => {
      const passwordHash = await hashPassword("correct-password");
      userRepository.seed(makeUser({ email: "demo@learnx.dev", passwordHash }));

      await expect(
        service.login({ email: "demo@learnx.dev", password: "wrong-password" }),
      ).rejects.toThrow(UnauthorizedError);
    });

    it("uses the same error message for unknown email and wrong password", async () => {
      const passwordHash = await hashPassword("correct-password");
      userRepository.seed(makeUser({ email: "demo@learnx.dev", passwordHash }));

      const unknownEmailError = await service
        .login({ email: "nobody@learnx.dev", password: "whatever" })
        .catch((e) => e);
      const wrongPasswordError = await service
        .login({ email: "demo@learnx.dev", password: "wrong-password" })
        .catch((e) => e);

      expect(unknownEmailError.message).toBe(wrongPasswordError.message);
    });
  });
});
