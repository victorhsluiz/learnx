import { z } from "zod";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/core/http/pagination";

const noteFieldsSchema = {
  title: z.string().trim().min(1, "Title is required").max(200),
  contentMarkdown: z.string(),
  // Explicit null clears the lesson link; omitted leaves it untouched on
  // update (see updateNoteDto below) or unset on create.
  lessonId: z.string().min(1).nullable().optional(),
  tags: z.array(z.string().trim().min(1)),
};

export const createNoteDto = z.object({
  ...noteFieldsSchema,
  tags: noteFieldsSchema.tags.default([]),
});

export type CreateNoteDto = z.infer<typeof createNoteDto>;

// Built from the same field schemas without defaults, not via
// createNoteDto.partial() — see lesson.dto.ts for why: .partial() alone
// doesn't remove a field's own zod .default(...), which would otherwise
// silently reset `tags` to [] on any update that omits it.
export const updateNoteDto = z.object(noteFieldsSchema).partial();

export type UpdateNoteDto = z.infer<typeof updateNoteDto>;

export const listNotesQueryDto = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  lessonId: z.string().min(1).optional(),
  tag: z.string().trim().min(1).optional(),
  q: z.string().trim().min(1).optional(),
});

export type ListNotesQueryDto = z.infer<typeof listNotesQueryDto>;
