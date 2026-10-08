import { z } from "zod";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/core/http/pagination";

const wordFieldsSchema = {
  hanzi: z.string().trim().min(1, "Hanzi is required"),
  pinyin: z.string().trim().min(1, "Pinyin is required"),
  translation: z.string().trim().min(1, "Translation is required"),
  notes: z.string().trim().min(1).nullable().optional(),
  learnedAt: z.coerce.date(),
  // Explicit null clears the lesson link; omitted leaves it untouched on
  // update (see updateWordDto below) or unset on create.
  lessonId: z.string().min(1).nullable().optional(),
  tags: z.array(z.string().trim().min(1)),
  partOfSpeech: z.string().trim().min(1).nullable().optional(),
};

export const createWordDto = z.object({
  ...wordFieldsSchema,
  learnedAt: wordFieldsSchema.learnedAt.default(() => new Date()),
  tags: wordFieldsSchema.tags.default([]),
});

export type CreateWordDto = z.infer<typeof createWordDto>;

// Built from the same field schemas without defaults, not via
// createWordDto.partial() — see lesson.dto.ts for why: .partial() alone
// doesn't remove a field's own zod .default(...), which would otherwise
// silently reset `learnedAt`/`tags` on any update that omits them.
export const updateWordDto = z.object(wordFieldsSchema).partial();

export type UpdateWordDto = z.infer<typeof updateWordDto>;

export const listWordsQueryDto = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  lessonId: z.string().min(1).optional(),
  tag: z.string().trim().min(1).optional(),
  q: z.string().trim().min(1).optional(),
  learnedAfter: z.coerce.date().optional(),
  learnedBefore: z.coerce.date().optional(),
});

export type ListWordsQueryDto = z.infer<typeof listWordsQueryDto>;
