import { z } from "zod";

export const updateUserSchema = z
  .object({
    nickname: z.string().min(2).max(80).optional(),
    email: z.string().email().max(255).optional(),
  })
  .refine((value) => value.nickname !== undefined || value.email !== undefined, {
    message: "At least one field must be provided",
  });
