import { ConsentStatus, ConsentType } from "@prisma/client";
import { z } from "zod";

export const consentTypeParamSchema = z.object({
  type: z.nativeEnum(ConsentType),
});

export const upsertConsentSchema = z.object({
  status: z.nativeEnum(ConsentStatus),
  expiresAt: z.string().datetime().optional(),
});
