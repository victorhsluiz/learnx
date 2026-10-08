import type { StudyTask } from "@/generated/prisma/client";
import type { StudyTaskStatus } from "@/generated/prisma/enums";
import type { Repository } from "@/core/database/repository";

export interface StudyTaskWriteInput {
  title: string;
  type: string;
  date: Date;
  status: StudyTaskStatus;
  estimatedMinutes?: number | null;
  actualMinutes?: number | null;
  lessonId?: string | null;
}

export interface StudyTaskFilters {
  status?: StudyTaskStatus;
  type?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface FindManyResult<T> {
  items: T[];
  total: number;
}

export interface StudyTaskRepository extends Repository<
  StudyTask,
  StudyTaskWriteInput,
  Partial<StudyTaskWriteInput>
> {
  findMany(
    userId: string,
    filters: StudyTaskFilters,
    pagination: { skip: number; take: number },
  ): Promise<FindManyResult<StudyTask>>;
  /** Count of tasks with the given status and `date` within [from, to] (inclusive). */
  countByStatusAndDateRange(
    userId: string,
    status: StudyTaskStatus,
    from: Date,
    to: Date,
  ): Promise<number>;
}
