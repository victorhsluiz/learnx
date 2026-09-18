import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

/** Mirrors modules/lessons/lesson.mapper.ts's LessonResponse shape. */
export interface Lesson {
  id: string;
  title: string;
  type: "RECORDED" | "LIVE";
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  sourceUrl: string | null;
  scheduledAt: string | null;
  watchedAt: string | null;
  durationMinutes: number | null;
  tags: string[];
  position: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface LessonFilters {
  status?: Lesson["status"];
  type?: Lesson["type"];
  tag?: string;
  q?: string;
  page?: number;
}

export interface CreateLessonInput {
  title: string;
  type: Lesson["type"];
  status?: Lesson["status"];
  sourceUrl?: string;
  scheduledAt?: string;
  durationMinutes?: number;
  tags?: string[];
}

export type UpdateLessonInput = Partial<CreateLessonInput>;

const LESSONS_QUERY_KEY = "lessons" as const;

export function useLessons(filters: LessonFilters = {}) {
  return useQuery({
    queryKey: [LESSONS_QUERY_KEY, filters],
    queryFn: async () => {
      const { data, meta } = await apiClient.getWithMeta<Lesson[]>("/lessons", {
        searchParams: {
          status: filters.status,
          type: filters.type,
          tag: filters.tag,
          q: filters.q,
          page: filters.page,
        },
      });
      return { lessons: data, meta: meta as PaginationMeta | undefined };
    },
    placeholderData: (previous) => previous,
  });
}

function useInvalidateLessons() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [LESSONS_QUERY_KEY] });
}

export function useCreateLesson() {
  const invalidate = useInvalidateLessons();

  return useMutation({
    mutationFn: (input: CreateLessonInput) => apiClient.post<Lesson>("/lessons", input),
    onSuccess: invalidate,
  });
}

export function useUpdateLesson() {
  const invalidate = useInvalidateLessons();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateLessonInput }) =>
      apiClient.patch<Lesson>(`/lessons/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useDeleteLesson() {
  const invalidate = useInvalidateLessons();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete<void>(`/lessons/${id}`),
    onSuccess: invalidate,
  });
}

export function useMarkLessonWatched() {
  const invalidate = useInvalidateLessons();

  return useMutation({
    mutationFn: (id: string) => apiClient.post<Lesson>(`/lessons/${id}/watch`),
    onSuccess: invalidate,
  });
}
