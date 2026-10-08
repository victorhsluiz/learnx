import { z } from "zod";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/core/http/pagination";
import { StudyTaskStatus } from "@/generated/prisma/enums";

const studyTaskFieldsSchema = {
  title: z.string().trim().min(1, "Title is required").max(200),
  type: z.string().trim().min(1, "Type is required").max(50),
  date: z.coerce.date(),
  status: z.enum(StudyTaskStatus),
  estimatedMinutes: z.number().int().positive().nullable().optional(),
  actualMinutes: z.number().int().positive().nullable().optional(),
  // Explicit null clears the lesson link; omitted leaves it untouched on
  // update (see updateStudyTaskDto below) or unset on create.
  lessonId: z.string().min(1).nullable().optional(),
};

export const createStudyTaskDto = z.object({
  ...studyTaskFieldsSchema,
  status: studyTaskFieldsSchema.status.default("PENDING"),
});

export type CreateStudyTaskDto = z.infer<typeof createStudyTaskDto>;

// Built from the same field schemas without defaults, not via
// createStudyTaskDto.partial() — see lesson.dto.ts for why: .partial()
// alone doesn't remove a field's own zod .default(...), which would
// otherwise silently reset `status` on any update that omits it.
export const updateStudyTaskDto = z.object(studyTaskFieldsSchema).partial();

export type UpdateStudyTaskDto = z.infer<typeof updateStudyTaskDto>;

export const listStudyTasksQueryDto = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  status: z.enum(StudyTaskStatus).optional(),
  type: z.string().trim().min(1).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export type ListStudyTasksQueryDto = z.infer<typeof listStudyTasksQueryDto>;
