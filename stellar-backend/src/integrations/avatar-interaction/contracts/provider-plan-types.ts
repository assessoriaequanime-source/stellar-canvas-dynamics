import type { AvatarProviderKind } from "./interaction-types";

export type ProviderCapability = "llm" | "voice" | "multimodal";

export type ModelRiskTier = "low" | "medium" | "high";

export type UserPlanTier = "essential" | "professional" | "curator_digital";

export type ProviderModel = {
  id: string;
  displayName: string;
  provider: AvatarProviderKind;
  capability: ProviderCapability;
  enabled: boolean;
  riskTier: ModelRiskTier;
  pricePerUnit?: number;
  unit?: "tokens" | "chars" | "seconds";
  metadata?: Record<string, unknown>;
};

export type ProviderPlan = {
  id: string;
  provider: AvatarProviderKind;
  name: string;
  enabled: boolean;
  allowedUserPlans: UserPlanTier[];
  allowedModelIds: string[];
  defaultModelId?: string;
};

export type TenantProviderPolicy = {
  tenantId: string;
  enabledProviders: AvatarProviderKind[];
  blockedModelIds: string[];
  forcedFallbackModelId?: string;
};

export type UserModelPreference = {
  tenantId: string;
  userId: string;
  activePlanId?: string;
  preferredModelId?: string;
  userPlanTier: UserPlanTier;
};
