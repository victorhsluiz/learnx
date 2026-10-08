import { z } from "zod";

/** Sentinel value for the lesson Select's "No lesson" option; converted to `null` on submit. */
export const NO_LESSON_VALUE = "__none__";

/** Mirrors modules/schedule/study-task.dto.ts's validation rules for client-side UX feedback. */
export const studyTaskFormSchema = z.object({
  title: z.string().trim().min(1, "Informe um título").max(200),
  type: z.string().trim().min(1, "Informe o tipo").max(50),
  // The native date input yields a YYYY-MM-DD string, converted to an
  // ISO date on submit.
  date: z.string().min(1, "Informe a data"),
  status: z.enum(["PENDING", "DONE", "SKIPPED"]),
  lessonId: z.string(),
  // Kept as raw strings in the form and parsed to number | undefined on
  // submit, same empty-string-to-undefined handling as other optional
  // numeric fields in this codebase (no NumberInput component is used
  // anywhere else — stay consistent).
  estimatedMinutes: z.string().trim(),
  actualMinutes: z.string().trim(),
});

export type StudyTaskFormValues = z.infer<typeof studyTaskFormSchema>;

export const STUDY_TASK_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  DONE: "Feito",
  SKIPPED: "Pulado",
};
