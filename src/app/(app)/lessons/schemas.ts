import { z } from "zod";

/** Mirrors modules/lessons/lesson.dto.ts's validation rules for client-side UX feedback. */
export const lessonFormSchema = z.object({
  title: z.string().trim().min(1, "Informe um título").max(200),
  type: z.enum(["RECORDED", "LIVE"], { message: "Selecione o tipo da aula" }),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]),
  sourceUrl: z
    .string()
    .trim()
    .url("URL inválida")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  tagsInput: z.string().trim(),
});

export type LessonFormValues = z.infer<typeof lessonFormSchema>;

export const LESSON_TYPE_LABELS: Record<string, string> = {
  RECORDED: "Gravada",
  LIVE: "Ao vivo",
};

export const LESSON_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluída",
};
