import type { PrismaClient, StudyTask } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";
import type { StudyTaskStatus } from "@/generated/prisma/enums";
import { NotFoundError } from "@/core/errors";
import type {
  FindManyResult,
  StudyTaskFilters,
  StudyTaskRepository,
  StudyTaskWriteInput,
} from "./study-task.repository.interface";

export class PrismaStudyTaskRepository implements StudyTaskRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(userId: string, id: string): Promise<StudyTask | null> {
    return this.prisma.studyTask.findFirst({ where: { id, userId } });
  }

  async create(userId: string, input: StudyTaskWriteInput): Promise<StudyTask> {
    return this.prisma.studyTask.create({
      data: { ...input, userId },
    });
  }

  async update(
    userId: string,
    id: string,
    input: Partial<StudyTaskWriteInput>,
  ): Promise<StudyTask> {
    // See lesson.repository.ts for why updateMany (not update) is what
    // makes this scoped to the owning user at the database level.
    const result = await this.prisma.studyTask.updateMany({
      where: { id, userId },
      data: input,
    });

    if (result.count === 0) {
      throw new NotFoundError("Study task not found");
    }

    const updated = await this.findById(userId, id);
    if (!updated) {
      throw new NotFoundError("Study task not found");
    }
    return updated;
  }

  async delete(userId: string, id: string): Promise<void> {
    const result = await this.prisma.studyTask.deleteMany({ where: { id, userId } });
    if (result.count === 0) {
      throw new NotFoundError("Study task not found");
    }
  }

  async findMany(
    userId: string,
    filters: StudyTaskFilters,
    pagination: { skip: number; take: number },
  ): Promise<FindManyResult<StudyTask>> {
    const where: Prisma.StudyTaskWhereInput = {
      userId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            date: {
              ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
              ...(filters.dateTo ? { lte: filters.dateTo } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.studyTask.findMany({
        where,
        orderBy: { date: "asc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.studyTask.count({ where }),
    ]);

    return { items, total };
  }

  countByStatusAndDateRange(
    userId: string,
    status: StudyTaskStatus,
    from: Date,
    to: Date,
  ): Promise<number> {
    return this.prisma.studyTask.count({
      where: { userId, status, date: { gte: from, lte: to } },
    });
  }
}
