import { z } from "zod";
import { AppError } from "../api/middlewares/errorHandler";

export function parseOrThrow<T extends z.ZodTypeAny>(schema: T, payload: unknown): z.infer<T> {
  const result = schema.safeParse(payload);

  if (!result.success) {
    throw new AppError(400, result.error.issues.map((issue) => issue.message).join("; "), "VALIDATION_ERROR");
  }

  return result.data;
}
