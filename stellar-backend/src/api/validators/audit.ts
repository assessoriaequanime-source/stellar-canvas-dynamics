import { AuditAction } from "@prisma/client";
import { z } from "zod";

export const auditQuerySchema = z.object({
  action: z.nativeEnum(AuditAction).optional(),
  resource: z.string().min(1).max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
