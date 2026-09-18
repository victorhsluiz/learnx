import { z } from "zod";

export const registerDto = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  name: z.string().trim().min(1, "Name is required").max(100),
});

export type RegisterDto = z.infer<typeof registerDto>;

export const loginDto = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginDto = z.infer<typeof loginDto>;
