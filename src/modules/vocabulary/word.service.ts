import { NotFoundError, ValidationError } from "@/core/errors";
import type { PaginationParams } from "@/core/http/pagination";
import type { Word } from "@/generated/prisma/client";
import type { LessonRepository } from "@/modules/lessons/lesson.repository.interface";
import type { CreateWordDto, UpdateWordDto } from "./word.dto";
import type { FindManyResult, WordFilters, WordRepository } from "./word.repository.interface";

export class WordService {
  constructor(
    private readonly wordRepository: WordRepository,
    private readonly lessonRepository: LessonRepository,
  ) {}

  async list(
    userId: string,
    filters: WordFilters,
    pagination: PaginationParams,
  ): Promise<FindManyResult<Word>> {
    return this.wordRepository.findMany(userId, filters, pagination);
  }

  async getById(userId: string, id: string): Promise<Word> {
    const word = await this.wordRepository.findById(userId, id);
    if (!word) {
      throw new NotFoundError("Word not found");
    }
    return word;
  }

  async create(userId: string, input: CreateWordDto): Promise<Word> {
    await this.assertLessonBelongsToUser(userId, input.lessonId);
    return this.wordRepository.create(userId, input);
  }

  async update(userId: string, id: string, input: UpdateWordDto): Promise<Word> {
    await this.assertLessonBelongsToUser(userId, input.lessonId);
    return this.wordRepository.update(userId, id, input);
  }

  delete(userId: string, id: string): Promise<void> {
    return this.wordRepository.delete(userId, id);
  }

  /**
   * A word's lessonId must reference a lesson owned by the same user —
   * otherwise a word could be linked to (and leak the existence of)
   * another user's lesson. `undefined` means the field wasn't provided
   * (nothing to check); `null` explicitly clears the link and is also
   * skipped.
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
