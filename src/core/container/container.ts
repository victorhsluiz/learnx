import { prisma } from "@/core/database/prisma";
import { PrismaUserRepository } from "@/modules/users/user.repository";
import { PrismaRefreshTokenRepository } from "@/modules/auth/refresh-token.repository";
import { AuthService } from "@/modules/auth/auth.service";
import { AuthController } from "@/modules/auth/auth.controller";
import { PrismaLessonRepository } from "@/modules/lessons/lesson.repository";
import { LessonService } from "@/modules/lessons/lesson.service";
import { LessonController } from "@/modules/lessons/lesson.controller";
import { PrismaNoteRepository } from "@/modules/notes/note.repository";
import { NoteService } from "@/modules/notes/note.service";
import { NoteController } from "@/modules/notes/note.controller";

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
const authController = new AuthController(authService, userRepository);

const lessonRepository = new PrismaLessonRepository(prisma);
const lessonService = new LessonService(lessonRepository);
const lessonController = new LessonController(lessonService);

const noteRepository = new PrismaNoteRepository(prisma);
const noteService = new NoteService(noteRepository, lessonRepository);
const noteController = new NoteController(noteService);

export const container = {
  prisma,
  authController,
  lessonController,
  noteController,
};
