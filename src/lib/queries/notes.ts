import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { PaginationMeta } from "@/lib/queries/lessons";

/** Mirrors modules/notes/note.mapper.ts's NoteResponse shape. */
export interface Note {
  id: string;
  title: string;
  contentMarkdown: string;
  lessonId: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NoteFilters {
  lessonId?: string;
  tag?: string;
  q?: string;
  page?: number;
}

export interface CreateNoteInput {
  title: string;
  contentMarkdown: string;
  lessonId?: string | null;
  tags?: string[];
}

export type UpdateNoteInput = Partial<CreateNoteInput>;

const NOTES_QUERY_KEY = "notes" as const;

export function useNotes(filters: NoteFilters = {}) {
  return useQuery({
    queryKey: [NOTES_QUERY_KEY, filters],
    queryFn: async () => {
      const { data, meta } = await apiClient.getWithMeta<Note[]>("/notes", {
        searchParams: {
          lessonId: filters.lessonId,
          tag: filters.tag,
          q: filters.q,
          page: filters.page,
        },
      });
      return { notes: data, meta: meta as PaginationMeta | undefined };
    },
    placeholderData: (previous) => previous,
  });
}

function useInvalidateNotes() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [NOTES_QUERY_KEY] });
}

export function useCreateNote() {
  const invalidate = useInvalidateNotes();

  return useMutation({
    mutationFn: (input: CreateNoteInput) => apiClient.post<Note>("/notes", input),
    onSuccess: invalidate,
  });
}

export function useUpdateNote() {
  const invalidate = useInvalidateNotes();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateNoteInput }) =>
      apiClient.patch<Note>(`/notes/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useDeleteNote() {
  const invalidate = useInvalidateNotes();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete<void>(`/notes/${id}`),
    onSuccess: invalidate,
  });
}
