import { z } from "zod";

export const createCapsuleSchema = z.object({
  name: z.string().min(1).max(120),
  content: z.string().min(1).max(5000),
  unlockDate: z.string().datetime(),
  metadata: z.unknown().optional(),
});

export const updateCapsuleSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    content: z.string().min(1).max(5000).optional(),
    unlockDate: z.string().datetime().optional(),
    metadata: z.unknown().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.content !== undefined ||
      value.unlockDate !== undefined ||
      value.metadata !== undefined,
    {
      message: "At least one field must be provided",
    },
  );
