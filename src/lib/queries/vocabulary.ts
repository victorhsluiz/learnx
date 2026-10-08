import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { PaginationMeta } from "@/lib/queries/lessons";

/** Mirrors modules/vocabulary/word.mapper.ts's WordResponse shape. */
export interface Word {
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

export interface WordFilters {
  lessonId?: string;
  tag?: string;
  q?: string;
  learnedAfter?: string;
  learnedBefore?: string;
  page?: number;
}

export interface CreateWordInput {
  hanzi: string;
  pinyin: string;
  translation: string;
  notes?: string | null;
  learnedAt?: string;
  lessonId?: string | null;
  tags?: string[];
  partOfSpeech?: string | null;
}

export type UpdateWordInput = Partial<CreateWordInput>;

const WORDS_QUERY_KEY = "words" as const;

export function useWords(filters: WordFilters = {}) {
  return useQuery({
    queryKey: [WORDS_QUERY_KEY, filters],
    queryFn: async () => {
      const { data, meta } = await apiClient.getWithMeta<Word[]>("/vocabulary", {
        searchParams: {
          lessonId: filters.lessonId,
          tag: filters.tag,
          q: filters.q,
          learnedAfter: filters.learnedAfter,
          learnedBefore: filters.learnedBefore,
          page: filters.page,
        },
      });
      return { words: data, meta: meta as PaginationMeta | undefined };
    },
    placeholderData: (previous) => previous,
  });
}

function useInvalidateWords() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [WORDS_QUERY_KEY] });
}

export function useCreateWord() {
  const invalidate = useInvalidateWords();

  return useMutation({
    mutationFn: (input: CreateWordInput) => apiClient.post<Word>("/vocabulary", input),
    onSuccess: invalidate,
  });
}

export function useUpdateWord() {
  const invalidate = useInvalidateWords();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateWordInput }) =>
      apiClient.patch<Word>(`/vocabulary/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useDeleteWord() {
  const invalidate = useInvalidateWords();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete<void>(`/vocabulary/${id}`),
    onSuccess: invalidate,
  });
}
