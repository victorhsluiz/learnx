import { created, ok } from "@/core/http";
import { loginDto, registerDto } from "./auth.dto";
import { toUserResponse } from "./auth.mapper";
import type { AuthService } from "./auth.service";
import { setAuthCookies } from "./auth.cookies";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
}
