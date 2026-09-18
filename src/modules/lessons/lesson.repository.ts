import type { Lesson, Prisma, PrismaClient } from "@/generated/prisma/client";
import { NotFoundError } from "@/core/errors";
import type {
  FindManyResult,
  LessonFilters,
  LessonRepository,
  LessonWriteInput,
} from "./lesson.repository.interface";

export class PrismaLessonRepository implements LessonRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(userId: string, id: string): Promise<Lesson | null> {
    return this.prisma.lesson.findFirst({ where: { id, userId } });
  }

  async create(userId: string, input: LessonWriteInput): Promise<Lesson> {
    return this.prisma.lesson.create({
      data: { ...input, userId },
    });
  }

  async update(userId: string, id: string, input: Partial<LessonWriteInput>): Promise<Lesson> {
    // updateMany + a follow-up read (instead of `update`) is what makes
    // this scoped: `update`'s `where` only accepts unique fields (id
    // here), so it would happily update a lesson belonging to a
    // different user if given their id. `updateMany` accepts an
    // arbitrary where clause, so { id, userId } together is enforced by
    // the database, not just checked in application code afterwards.
    const result = await this.prisma.lesson.updateMany({
      where: { id, userId },
      data: input,
    });

    if (result.count === 0) {
      throw new NotFoundError("Lesson not found");
    }

    const updated = await this.findById(userId, id);
    if (!updated) {
      throw new NotFoundError("Lesson not found");
    }
    return updated;
  }

  async delete(userId: string, id: string): Promise<void> {
    const result = await this.prisma.lesson.deleteMany({ where: { id, userId } });
    if (result.count === 0) {
      throw new NotFoundError("Lesson not found");
    }
  }

  async findMany(
    userId: string,
    filters: LessonFilters,
    pagination: { skip: number; take: number },
  ): Promise<FindManyResult<Lesson>> {
    const where: Prisma.LessonWhereInput = {
      userId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.tag ? { tags: { has: filters.tag } } : {}),
      ...(filters.q ? { title: { contains: filters.q, mode: "insensitive" } } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.lesson.findMany({
        where,
        orderBy: [{ position: "asc" }, { createdAt: "desc" }],
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.lesson.count({ where }),
    ]);

    return { items, total };
  }

  async markWatched(userId: string, id: string, watchedAt: Date): Promise<Lesson> {
    const result = await this.prisma.lesson.updateMany({
      where: { id, userId },
      data: { status: "COMPLETED", watchedAt },
    });

    if (result.count === 0) {
      throw new NotFoundError("Lesson not found");
    }

    const updated = await this.findById(userId, id);
    if (!updated) {
      throw new NotFoundError("Lesson not found");
    }
    return updated;
  }
}
