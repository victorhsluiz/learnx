import { z } from "zod";

/** Mirrors modules/auth/auth.dto.ts's validation rules for client-side UX feedback. */
export const loginFormSchema = z.object({
  email: z.string().trim().min(1, "Informe seu email").email("Email inválido"),
  password: z.string().min(1, "Informe sua senha"),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

export const registerFormSchema = z.object({
  name: z.string().trim().min(1, "Informe seu nome").max(100),
  email: z.string().trim().min(1, "Informe seu email").email("Email inválido"),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
});

export type RegisterFormValues = z.infer<typeof registerFormSchema>;
