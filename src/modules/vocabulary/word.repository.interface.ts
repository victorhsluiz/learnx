import type { Word } from "@/generated/prisma/client";
import type { Repository } from "@/core/database/repository";

export interface WordWriteInput {
  hanzi: string;
  pinyin: string;
  translation: string;
  notes?: string | null;
  learnedAt?: Date;
  lessonId?: string | null;
  tags: string[];
  partOfSpeech?: string | null;
}

export interface WordFilters {
  lessonId?: string;
  tag?: string;
  /** Case-insensitive search against the word's hanzi, pinyin, and translation. */
  q?: string;
  learnedAfter?: Date;
  learnedBefore?: Date;
}

export interface FindManyResult<T> {
  items: T[];
  total: number;
}

export interface WordRepository extends Repository<Word, WordWriteInput, Partial<WordWriteInput>> {
  findMany(
    userId: string,
    filters: WordFilters,
    pagination: { skip: number; take: number },
  ): Promise<FindManyResult<Word>>;
}
