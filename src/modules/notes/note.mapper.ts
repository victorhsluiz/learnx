import type { Note } from "@/generated/prisma/client";

export interface NoteResponse {
  id: string;
  title: string;
  contentMarkdown: string;
  lessonId: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export function toNoteResponse(note: Note): NoteResponse {
  return {
    id: note.id,
    title: note.title,
    contentMarkdown: note.contentMarkdown,
    lessonId: note.lessonId,
    tags: note.tags,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}
