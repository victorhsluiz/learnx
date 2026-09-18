import { ConflictError, NotFoundError, UnauthorizedError } from "@/core/errors";
import { hashPassword, verifyPassword } from "@/core/security/password";
import {
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
  REFRESH_TOKEN_TTL_MS,
} from "@/core/security/jwt";
import type { UserRepository } from "@/modules/users/user.repository.interface";
import type { RefreshTokenRepository } from "./refresh-token.repository.interface";
import type { LoginDto, RegisterDto } from "./auth.dto";
import type { User } from "@/generated/prisma/client";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: User;
  tokens: AuthTokens;
}

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async register(input: RegisterDto): Promise<AuthResult> {
    const existing = await this.userRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError("An account with this email already exists");
    }

    const passwordHash = await hashPassword(input.password);
    const user = await this.userRepository.create({
      email: input.email,
      passwordHash,
      name: input.name,
    });

    const tokens = await this.issueTokens(user.id);
    return { user, tokens };
  }

  async login(input: LoginDto): Promise<AuthResult> {
    const user = await this.userRepository.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const passwordMatches = await verifyPassword(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const tokens = await this.issueTokens(user.id);
    return { user, tokens };
  }

  /**
   * Rotates a refresh token: verifies it's a known, unexpired, unrevoked
   * token, revokes it, and issues a fresh access+refresh pair.
   *
   * Reuse detection: if the presented token matches a *revoked* record
   * (rather than one that simply doesn't exist), that means either the
   * client is replaying an old token after already rotating past it, or
   * the token was stolen and used by an attacker after the legitimate
   * client rotated it. Either way, treat it as a compromise signal and
   * revoke the current record again defensively (a no-op if it's already
   * revoked) — with the base schema, that's the strongest signal
   * available without full token-family tracking, which is left as a
   * documented improvement (see docs/roadmap.md).
   */
  async refresh(rawRefreshToken: string): Promise<AuthResult> {
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const stored = await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (!stored) {
      throw new UnauthorizedError("Invalid refresh token");
    }

    if (stored.revokedAt) {
      throw new UnauthorizedError("Refresh token has already been used");
    }

    if (stored.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedError("Refresh token has expired");
    }

    await this.refreshTokenRepository.revoke(stored.id);

    const user = await this.userRepository.findById(stored.userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const tokens = await this.issueTokens(user.id);
    return { user, tokens };
  }

  /** Revokes a refresh token so it can no longer be used to rotate/refresh a session. */
  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const stored = await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (stored && !stored.revokedAt) {
      await this.refreshTokenRepository.revoke(stored.id);
    }
  }

  private async issueTokens(userId: string): Promise<AuthTokens> {
    const accessToken = await signAccessToken(userId);
    const { token: refreshToken, tokenHash } = generateRefreshToken();

    await this.refreshTokenRepository.create({
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    });

    return { accessToken, refreshToken };
  }
}
