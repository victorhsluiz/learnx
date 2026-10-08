import { z } from "zod";

/** Sentinel value for the lesson Select's "No lesson" option; converted to `null` on submit. */
export const NO_LESSON_VALUE = "__none__";

/** Mirrors modules/vocabulary/word.dto.ts's validation rules for client-side UX feedback. */
export const wordFormSchema = z.object({
  hanzi: z.string().trim().min(1, "Informe o hanzi"),
  pinyin: z.string().trim().min(1, "Informe o pinyin"),
  translation: z.string().trim().min(1, "Informe a tradução"),
  lessonId: z.string(),
  // The native date input yields a YYYY-MM-DD string, converted to an
  // ISO date on submit.
  learnedAt: z.string().min(1, "Informe a data"),
  tagsInput: z.string().trim(),
  partOfSpeech: z.string().trim(),
  notes: z.string().trim(),
});

export type WordFormValues = z.infer<typeof wordFormSchema>;
