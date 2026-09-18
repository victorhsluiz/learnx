import { ConflictError, UnauthorizedError } from "@/core/errors";
import { hashPassword, verifyPassword } from "@/core/security/password";
import { generateRefreshToken, signAccessToken, REFRESH_TOKEN_TTL_MS } from "@/core/security/jwt";
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
