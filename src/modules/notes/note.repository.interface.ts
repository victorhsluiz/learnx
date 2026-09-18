import type { Note } from "@/generated/prisma/client";
import type { Repository } from "@/core/database/repository";

export interface NoteWriteInput {
  title: string;
  contentMarkdown: string;
  lessonId?: string | null;
  tags: string[];
}

export interface NoteFilters {
  lessonId?: string;
  tag?: string;
  /** Case-insensitive search against both the note's title and content. */
  q?: string;
}

export interface FindManyResult<T> {
  items: T[];
  total: number;
}

export interface NoteRepository extends Repository<Note, NoteWriteInput, Partial<NoteWriteInput>> {
  findMany(
    userId: string,
    filters: NoteFilters,
    pagination: { skip: number; take: number },
  ): Promise<FindManyResult<Note>>;
}
