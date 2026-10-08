import type { StudyTask } from "@/generated/prisma/client";

export interface StudyTaskResponse {
  id: string;
  title: string;
  type: string;
  date: string;
  status: string;
  estimatedMinutes: number | null;
  actualMinutes: number | null;
  lessonId: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toStudyTaskResponse(studyTask: StudyTask): StudyTaskResponse {
  return {
    id: studyTask.id,
    title: studyTask.title,
    type: studyTask.type,
    date: studyTask.date.toISOString(),
    status: studyTask.status,
    estimatedMinutes: studyTask.estimatedMinutes,
    actualMinutes: studyTask.actualMinutes,
    lessonId: studyTask.lessonId,
    createdAt: studyTask.createdAt.toISOString(),
    updatedAt: studyTask.updatedAt.toISOString(),
  };
}
