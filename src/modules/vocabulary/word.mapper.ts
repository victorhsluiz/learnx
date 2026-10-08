import type { Word } from "@/generated/prisma/client";

export interface WordResponse {
  id: string;
  hanzi: string;
  pinyin: string;
  translation: string;
  notes: string | null;
  learnedAt: string;
  lessonId: string | null;
  tags: string[];
  partOfSpeech: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toWordResponse(word: Word): WordResponse {
  return {
    id: word.id,
    hanzi: word.hanzi,
    pinyin: word.pinyin,
    translation: word.translation,
    notes: word.notes,
    learnedAt: word.learnedAt.toISOString(),
    lessonId: word.lessonId,
    tags: word.tags,
    partOfSpeech: word.partOfSpeech,
    createdAt: word.createdAt.toISOString(),
    updatedAt: word.updatedAt.toISOString(),
  };
}
