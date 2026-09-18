import { created, noContent, ok, requireUser, getRequestCookie } from "@/core/http";
import { UnauthorizedError, NotFoundError } from "@/core/errors";
import { loginDto, registerDto } from "./auth.dto";
import { toUserResponse } from "./auth.mapper";
import type { AuthService } from "./auth.service";
import { REFRESH_TOKEN_COOKIE, clearAuthCookies, setAuthCookies } from "./auth.cookies";
import type { UserRepository } from "@/modules/users/user.repository.interface";

export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userRepository: UserRepository,
  ) {}

  async register(request: Request): Promise<Response> {
    const body = registerDto.parse(await request.json());
    const { user, tokens } = await this.authService.register(body);

    const response = created({ user: toUserResponse(user) });
    return setAuthCookies(response, tokens);
  }

  async login(request: Request): Promise<Response> {
    const body = loginDto.parse(await request.json());
    const { user, tokens } = await this.authService.login(body);

    const response = ok({ user: toUserResponse(user) });
    return setAuthCookies(response, tokens);
  }

  async me(request: Request): Promise<Response> {
    const authenticated = await requireUser(request);
    const user = await this.userRepository.findById(authenticated.id);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    return ok({ user: toUserResponse(user) });
  }

  async refresh(request: Request): Promise<Response> {
    const rawRefreshToken = this.getRefreshTokenCookie(request);
    const { user, tokens } = await this.authService.refresh(rawRefreshToken);

    const response = ok({ user: toUserResponse(user) });
    return setAuthCookies(response, tokens);
  }

  async logout(request: Request): Promise<Response> {
    const rawRefreshToken = getRequestCookie(request, REFRESH_TOKEN_COOKIE);

    if (rawRefreshToken) {
      await this.authService.logout(rawRefreshToken);
    }

    const response = noContent();
    return clearAuthCookies(response);
  }

  private getRefreshTokenCookie(request: Request): string {
    const value = getRequestCookie(request, REFRESH_TOKEN_COOKIE);

    if (!value) {
      throw new UnauthorizedError("Missing refresh token");
    }

    return value;
  }
}
