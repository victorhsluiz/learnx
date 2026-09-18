import type { Lesson } from "@/generated/prisma/client";

export interface LessonResponse {
  id: string;
  title: string;
  type: string;
  status: string;
  sourceUrl: string | null;
  scheduledAt: string | null;
  watchedAt: string | null;
  durationMinutes: number | null;
  tags: string[];
  position: number | null;
  createdAt: string;
  updatedAt: string;
}

export function toLessonResponse(lesson: Lesson): LessonResponse {
  return {
    id: lesson.id,
    title: lesson.title,
    type: lesson.type,
    status: lesson.status,
    sourceUrl: lesson.sourceUrl,
    scheduledAt: lesson.scheduledAt?.toISOString() ?? null,
    watchedAt: lesson.watchedAt?.toISOString() ?? null,
    durationMinutes: lesson.durationMinutes,
    tags: lesson.tags,
    position: lesson.position,
    createdAt: lesson.createdAt.toISOString(),
    updatedAt: lesson.updatedAt.toISOString(),
  };
}
