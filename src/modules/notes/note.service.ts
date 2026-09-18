import { NotFoundError, ValidationError } from "@/core/errors";
import type { PaginationParams } from "@/core/http/pagination";
import type { Note } from "@/generated/prisma/client";
import type { LessonRepository } from "@/modules/lessons/lesson.repository.interface";
import type { CreateNoteDto, UpdateNoteDto } from "./note.dto";
import type { FindManyResult, NoteFilters, NoteRepository } from "./note.repository.interface";

export class NoteService {
  constructor(
    private readonly noteRepository: NoteRepository,
    private readonly lessonRepository: LessonRepository,
  ) {}

  async list(
    userId: string,
    filters: NoteFilters,
    pagination: PaginationParams,
  ): Promise<FindManyResult<Note>> {
    return this.noteRepository.findMany(userId, filters, pagination);
  }

  async getById(userId: string, id: string): Promise<Note> {
    const note = await this.noteRepository.findById(userId, id);
    if (!note) {
      throw new NotFoundError("Note not found");
    }
    return note;
  }

  async create(userId: string, input: CreateNoteDto): Promise<Note> {
    await this.assertLessonBelongsToUser(userId, input.lessonId);
    return this.noteRepository.create(userId, input);
  }

  async update(userId: string, id: string, input: UpdateNoteDto): Promise<Note> {
    await this.assertLessonBelongsToUser(userId, input.lessonId);
    return this.noteRepository.update(userId, id, input);
  }

  delete(userId: string, id: string): Promise<void> {
    return this.noteRepository.delete(userId, id);
  }

  /**
   * A note's lessonId must reference a lesson owned by the same user —
   * otherwise a note could be linked to (and leak the existence of)
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
