import { z } from "zod";

export const loginSchema = z.object({
  /** Username or email. */
  identifier: z.string().trim().min(1, "Username or email is required").max(255),
  password: z.string().min(1, "Password is required").max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;
