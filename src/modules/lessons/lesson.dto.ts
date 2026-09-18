import { z } from "zod";
import { LessonStatus, LessonType } from "@/generated/prisma/enums";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/core/http/pagination";

const lessonFieldsSchema = {
  title: z.string().trim().min(1, "Title is required").max(200),
  type: z.enum(LessonType),
  status: z.enum(LessonStatus),
  sourceUrl: z.string().trim().url("sourceUrl must be a valid URL").optional(),
  scheduledAt: z.coerce.date().optional(),
  durationMinutes: z.number().int().positive().optional(),
  tags: z.array(z.string().trim().min(1)),
  position: z.number().int().optional(),
};

export const createLessonDto = z.object({
  ...lessonFieldsSchema,
  status: lessonFieldsSchema.status.default("PENDING"),
  tags: lessonFieldsSchema.tags.default([]),
});

export type CreateLessonDto = z.infer<typeof createLessonDto>;

// Deliberately built from the same field schemas without defaults (rather
// than createLessonDto.partial()) — .partial() only makes fields
// optional, it doesn't remove a field's own .default(...). With defaults
// still attached, an update payload that omits `status`/`tags` would
// have them silently reset to "PENDING"/[] instead of leaving the
// existing value untouched.
export const updateLessonDto = z.object(lessonFieldsSchema).partial();

export type UpdateLessonDto = z.infer<typeof updateLessonDto>;

export const listLessonsQueryDto = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  status: z.enum(LessonStatus).optional(),
  type: z.enum(LessonType).optional(),
  tag: z.string().trim().min(1).optional(),
  q: z.string().trim().min(1).optional(),
});

export type ListLessonsQueryDto = z.infer<typeof listLessonsQueryDto>;
