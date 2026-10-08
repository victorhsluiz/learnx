import type { PrismaClient, Word } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { ConflictError, NotFoundError } from "@/core/errors";
import type {
  FindManyResult,
  WordFilters,
  WordRepository,
  WordWriteInput,
} from "./word.repository.interface";

export class PrismaWordRepository implements WordRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(userId: string, id: string): Promise<Word | null> {
    return this.prisma.word.findFirst({ where: { id, userId } });
  }

  async create(userId: string, input: WordWriteInput): Promise<Word> {
    try {
      return await this.prisma.word.create({
        data: { ...input, userId },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictError("A word with this hanzi and pinyin already exists");
      }
      throw error;
    }
  }

  async update(userId: string, id: string, input: Partial<WordWriteInput>): Promise<Word> {
    // See lesson.repository.ts for why updateMany (not update) is what
    // makes this scoped to the owning user at the database level.
    let result;
    try {
      result = await this.prisma.word.updateMany({
        where: { id, userId },
        data: input,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictError("A word with this hanzi and pinyin already exists");
      }
      throw error;
    }

    if (result.count === 0) {
      throw new NotFoundError("Word not found");
    }

    const updated = await this.findById(userId, id);
    if (!updated) {
      throw new NotFoundError("Word not found");
    }
    return updated;
  }

  async delete(userId: string, id: string): Promise<void> {
    const result = await this.prisma.word.deleteMany({ where: { id, userId } });
    if (result.count === 0) {
      throw new NotFoundError("Word not found");
    }
  }

  async findMany(
    userId: string,
    filters: WordFilters,
    pagination: { skip: number; take: number },
  ): Promise<FindManyResult<Word>> {
    const where: Prisma.WordWhereInput = {
      userId,
      ...(filters.lessonId ? { lessonId: filters.lessonId } : {}),
      ...(filters.tag ? { tags: { has: filters.tag } } : {}),
      ...(filters.q
        ? {
            OR: [
              { hanzi: { contains: filters.q, mode: "insensitive" } },
              { pinyin: { contains: filters.q, mode: "insensitive" } },
              { translation: { contains: filters.q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(filters.learnedAfter || filters.learnedBefore
        ? {
            learnedAt: {
              ...(filters.learnedAfter ? { gte: filters.learnedAfter } : {}),
              ...(filters.learnedBefore ? { lte: filters.learnedBefore } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.word.findMany({
        where,
        orderBy: { learnedAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.word.count({ where }),
    ]);

    return { items, total };
  }
}
