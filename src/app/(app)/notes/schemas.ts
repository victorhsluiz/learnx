import { z } from "zod";

/** Sentinel value for the lesson Select's "No lesson" option; converted to `null` on submit. */
export const NO_LESSON_VALUE = "__none__";

/** Mirrors modules/notes/note.dto.ts's validation rules for client-side UX feedback. */
export const noteFormSchema = z.object({
  title: z.string().trim().min(1, "Informe um título").max(200),
  contentMarkdown: z.string().trim().min(1, "Informe o conteúdo"),
  lessonId: z.string(),
  tagsInput: z.string().trim(),
});

export type NoteFormValues = z.infer<typeof noteFormSchema>;
