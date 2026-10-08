import type { Lesson } from "@/generated/prisma/client";
import type { LessonStatus, LessonType } from "@/generated/prisma/enums";
import type { Repository } from "@/core/database/repository";

export interface LessonWriteInput {
  title: string;
  type: LessonType;
  status: LessonStatus;
  sourceUrl?: string;
  scheduledAt?: Date;
  durationMinutes?: number;
  tags: string[];
  position?: number;
}

export interface LessonFilters {
  status?: LessonStatus;
  type?: LessonType;
  tag?: string;
  /** Case-insensitive search against the lesson title. */
  q?: string;
}

export interface FindManyResult<T> {
  items: T[];
  total: number;
}

export interface LessonRepository extends Repository<
  Lesson,
  LessonWriteInput,
  Partial<LessonWriteInput>
> {
  findMany(
    userId: string,
    filters: LessonFilters,
    pagination: { skip: number; take: number },
  ): Promise<FindManyResult<Lesson>>;
  /** Sets status to COMPLETED and records `watchedAt`, scoped to the owning user. */
  markWatched(userId: string, id: string, watchedAt: Date): Promise<Lesson>;
  /** Count of lessons with the given status. */
  countByStatus(userId: string, status: LessonStatus): Promise<number>;
}
