import { NotFoundError, ValidationError } from "@/core/errors";
import type { PaginationParams } from "@/core/http/pagination";
import type { StudyTask } from "@/generated/prisma/client";
import type { LessonRepository } from "@/modules/lessons/lesson.repository.interface";
import type { CreateStudyTaskDto, UpdateStudyTaskDto } from "./study-task.dto";
import type {
  FindManyResult,
  StudyTaskFilters,
  StudyTaskRepository,
} from "./study-task.repository.interface";

export class StudyTaskService {
  constructor(
    private readonly studyTaskRepository: StudyTaskRepository,
    private readonly lessonRepository: LessonRepository,
  ) {}

  async list(
    userId: string,
    filters: StudyTaskFilters,
    pagination: PaginationParams,
  ): Promise<FindManyResult<StudyTask>> {
    return this.studyTaskRepository.findMany(userId, filters, pagination);
  }

  async getById(userId: string, id: string): Promise<StudyTask> {
    const studyTask = await this.studyTaskRepository.findById(userId, id);
    if (!studyTask) {
      throw new NotFoundError("Study task not found");
    }
    return studyTask;
  }

  async create(userId: string, input: CreateStudyTaskDto): Promise<StudyTask> {
    await this.assertLessonBelongsToUser(userId, input.lessonId);
    return this.studyTaskRepository.create(userId, input);
  }

  async update(userId: string, id: string, input: UpdateStudyTaskDto): Promise<StudyTask> {
    await this.assertLessonBelongsToUser(userId, input.lessonId);
    return this.studyTaskRepository.update(userId, id, input);
  }

  delete(userId: string, id: string): Promise<void> {
    return this.studyTaskRepository.delete(userId, id);
  }

  /**
   * A study task's lessonId must reference a lesson owned by the same
   * user — otherwise a task could be linked to (and leak the existence
   * of) another user's lesson. `undefined` means the field wasn't
   * provided (nothing to check); `null` explicitly clears the link and
   * is also skipped.
   */
  private async assertLessonBelongsToUser(
    userId: string,
    lessonId: string | null | undefined,
  ): Promise<void> {
    if (!lessonId) {
      return;
    }

    const lesson = await this.lessonRepository.findById(userId, lessonId);
    if (!lesson) {
      throw new ValidationError("lessonId does not reference an existing lesson");
    }
  }
}
