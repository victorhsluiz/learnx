import { NotFoundError } from "@/core/errors";
import type { PaginationParams } from "@/core/http/pagination";
import type { Lesson } from "@/generated/prisma/client";
import type { CreateLessonDto, UpdateLessonDto } from "./lesson.dto";
import type {
  FindManyResult,
  LessonFilters,
  LessonRepository,
} from "./lesson.repository.interface";

export class LessonService {
  constructor(private readonly lessonRepository: LessonRepository) {}

  async list(
    userId: string,
    filters: LessonFilters,
    pagination: PaginationParams,
  ): Promise<FindManyResult<Lesson>> {
    return this.lessonRepository.findMany(userId, filters, pagination);
  }

  async getById(userId: string, id: string): Promise<Lesson> {
    const lesson = await this.lessonRepository.findById(userId, id);
    if (!lesson) {
      throw new NotFoundError("Lesson not found");
    }
    return lesson;
  }

  create(userId: string, input: CreateLessonDto): Promise<Lesson> {
    return this.lessonRepository.create(userId, input);
  }

  update(userId: string, id: string, input: UpdateLessonDto): Promise<Lesson> {
    return this.lessonRepository.update(userId, id, input);
  }

  delete(userId: string, id: string): Promise<void> {
    return this.lessonRepository.delete(userId, id);
  }

  /** Marks a lesson as watched: sets status to COMPLETED and records when. */
  markWatched(userId: string, id: string): Promise<Lesson> {
    return this.lessonRepository.markWatched(userId, id, new Date());
  }
}
