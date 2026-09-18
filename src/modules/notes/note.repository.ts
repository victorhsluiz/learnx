import type { Note, Prisma, PrismaClient } from "@/generated/prisma/client";
import { NotFoundError } from "@/core/errors";
import type {
  FindManyResult,
  NoteFilters,
  NoteRepository,
  NoteWriteInput,
} from "./note.repository.interface";

export class PrismaNoteRepository implements NoteRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(userId: string, id: string): Promise<Note | null> {
    return this.prisma.note.findFirst({ where: { id, userId } });
  }

  async create(userId: string, input: NoteWriteInput): Promise<Note> {
    return this.prisma.note.create({
      data: { ...input, userId },
    });
  }

  async update(userId: string, id: string, input: Partial<NoteWriteInput>): Promise<Note> {
    // See lesson.repository.ts for why updateMany (not update) is what
    // makes this scoped to the owning user at the database level.
    const result = await this.prisma.note.updateMany({
      where: { id, userId },
      data: input,
    });

    if (result.count === 0) {
      throw new NotFoundError("Note not found");
    }

    const updated = await this.findById(userId, id);
    if (!updated) {
      throw new NotFoundError("Note not found");
    }
    return updated;
  }

  async delete(userId: string, id: string): Promise<void> {
    const result = await this.prisma.note.deleteMany({ where: { id, userId } });
    if (result.count === 0) {
      throw new NotFoundError("Note not found");
    }
  }

  async findMany(
    userId: string,
    filters: NoteFilters,
    pagination: { skip: number; take: number },
  ): Promise<FindManyResult<Note>> {
    const where: Prisma.NoteWhereInput = {
      userId,
      ...(filters.lessonId ? { lessonId: filters.lessonId } : {}),
      ...(filters.tag ? { tags: { has: filters.tag } } : {}),
      ...(filters.q
        ? {
            OR: [
              { title: { contains: filters.q, mode: "insensitive" } },
              { contentMarkdown: { contains: filters.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.note.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.note.count({ where }),
    ]);

    return { items, total };
  }
}
