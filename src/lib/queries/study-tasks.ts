import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { PaginationMeta } from "@/lib/queries/lessons";

/** Mirrors modules/schedule/study-task.mapper.ts's StudyTaskResponse shape. */
export interface StudyTask {
  id: string;
  title: string;
  type: string;
  date: string;
  status: "PENDING" | "DONE" | "SKIPPED";
  estimatedMinutes: number | null;
  actualMinutes: number | null;
  lessonId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudyTaskFilters {
  status?: StudyTask["status"];
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
}

export interface CreateStudyTaskInput {
  title: string;
  type: string;
  date: string;
  status?: StudyTask["status"];
  estimatedMinutes?: number | null;
  actualMinutes?: number | null;
  lessonId?: string | null;
}

export type UpdateStudyTaskInput = Partial<CreateStudyTaskInput>;

const STUDY_TASKS_QUERY_KEY = "study-tasks" as const;

export function useStudyTasks(filters: StudyTaskFilters = {}) {
  return useQuery({
    queryKey: [STUDY_TASKS_QUERY_KEY, filters],
    queryFn: async () => {
      const { data, meta } = await apiClient.getWithMeta<StudyTask[]>("/study-tasks", {
        searchParams: {
          status: filters.status,
          type: filters.type,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          page: filters.page,
        },
      });
      return { studyTasks: data, meta: meta as PaginationMeta | undefined };
    },
    placeholderData: (previous) => previous,
  });
}

function useInvalidateStudyTasks() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [STUDY_TASKS_QUERY_KEY] });
}

export function useCreateStudyTask() {
  const invalidate = useInvalidateStudyTasks();

  return useMutation({
    mutationFn: (input: CreateStudyTaskInput) => apiClient.post<StudyTask>("/study-tasks", input),
    onSuccess: invalidate,
  });
}

export function useUpdateStudyTask() {
  const invalidate = useInvalidateStudyTasks();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateStudyTaskInput }) =>
      apiClient.patch<StudyTask>(`/study-tasks/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useDeleteStudyTask() {
  const invalidate = useInvalidateStudyTasks();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete<void>(`/study-tasks/${id}`),
    onSuccess: invalidate,
  });
}

/**
 * Thin convenience mutation for the inline "mark done"/"mark skipped" UI
 * actions. Duplicates useUpdateStudyTask's mutationFn shape but with a
 * narrower (id, status) signature — there is no dedicated mark-done
 * endpoint; this just calls the same generic PATCH under the hood (see
 * schedule-plan.md's "reuse the generic PATCH" decision).
 */
export function useMarkStudyTaskStatus() {
  const invalidate = useInvalidateStudyTasks();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: StudyTask["status"] }) =>
      apiClient.patch<StudyTask>(`/study-tasks/${id}`, { status }),
    onSuccess: invalidate,
  });
}
