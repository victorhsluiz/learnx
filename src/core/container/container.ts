import { prisma } from "@/core/database/prisma";

/**
 * Composition root: the single place where concrete implementations are
 * wired to the interfaces they satisfy, and where services are constructed
 * with their dependencies injected via the constructor.
 *
 * Controllers pull ready-to-use services from here instead of
 * instantiating repositories/services themselves. This keeps the
 * dependency direction correct (controller -> service -> repository
 * interface) and makes it possible to swap an implementation (e.g. a fake
 * repository in tests) in one place.
 *
 * This is intentionally empty for now — modules register their services
 * here as they're built. Example of the pattern once a module exists:
 *
 *   import { PrismaWordRepository } from "@/modules/words/word.repository";
 *   import { WordService } from "@/modules/words/word.service";
 *
 *   const wordRepository = new PrismaWordRepository(prisma);
 *   export const wordService = new WordService(wordRepository);
 */
export const container = {
  prisma,
};
