import { prisma } from "@/core/database/prisma";
import { PrismaUserRepository } from "@/modules/users/user.repository";
import { PrismaRefreshTokenRepository } from "@/modules/auth/refresh-token.repository";
import { AuthService } from "@/modules/auth/auth.service";
import { AuthController } from "@/modules/auth/auth.controller";

/**
 * Composition root: the single place where concrete implementations are
 * wired to the interfaces they satisfy, and where services/controllers are
 * constructed with their dependencies injected via the constructor.
 *
 * Route handlers pull ready-to-use controllers from here instead of
 * instantiating repositories/services/controllers themselves. This keeps
 * the dependency direction correct (controller -> service -> repository
 * interface) and makes it possible to swap an implementation (e.g. a fake
 * repository in tests) in one place.
 */
const userRepository = new PrismaUserRepository(prisma);
const refreshTokenRepository = new PrismaRefreshTokenRepository(prisma);

const authService = new AuthService(userRepository, refreshTokenRepository);
const authController = new AuthController(authService);

export const container = {
  prisma,
  authController,
};
