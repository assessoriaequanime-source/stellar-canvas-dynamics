import { z } from "zod";

export const aiModelCatalogQuerySchema = z.object({
  tenantId: z.string().min(1, "tenantId is required"),
  activePlanId: z.string().min(1).optional(),
  userPlanTier: z.enum(["essential", "professional", "curator_digital"]),
});

export const aiModelPreferenceUpsertSchema = z.object({
  tenantId: z.string().min(1, "tenantId is required"),
  activePlanId: z.string().min(1, "activePlanId is required"),
  userPlanTier: z.enum(["essential", "professional", "curator_digital"]),
  preferredModelId: z.string().min(1).optional(),
});

export const aiModelPreferenceGetQuerySchema = z.object({
  tenantId: z.string().min(1, "tenantId is required"),
});
