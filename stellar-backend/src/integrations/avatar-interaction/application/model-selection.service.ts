import type {
  ProviderModel,
  UserModelPreference,
} from "../contracts/provider-plan-types";
import {
  getProviderModel,
  getProviderPlan,
  getTenantPolicy,
  listProviderModels,
} from "../registry/provider-plan-catalog";

export function resolveModelForUserPreference(
  input: UserModelPreference,
): ProviderModel {
  const allowUserModelChoice = readEnvFlag("AI_PROVIDER_ALLOW_USER_MODEL_CHOICE", false);
  const nativeModelId = process.env.AI_NATIVE_MODEL_ID;
  const tenantPolicy = getTenantPolicy(input.tenantId);
  const candidateModels = getCandidateModelsByPlan(input);

  // 1) If tenant forces a fallback model, it always wins.
  if (tenantPolicy?.forcedFallbackModelId) {
    const forced = getProviderModel(tenantPolicy.forcedFallbackModelId);
    if (forced && forced.enabled && isModelAllowedByTenant(forced.id, input.tenantId)) return forced;
  }

  // 2) User preference only when explicitly enabled.
  if (allowUserModelChoice && input.preferredModelId) {
    const preferred = getProviderModel(input.preferredModelId);
    if (
      preferred &&
      candidateModels.some((model) => model.id === preferred.id) &&
      isModelAllowedByTenant(preferred.id, input.tenantId)
    ) {
      return preferred;
    }
  }

  // 3) Native low-cost model as default fallback.
  if (nativeModelId) {
    const nativeModel = getProviderModel(nativeModelId);
    if (
      nativeModel &&
      nativeModel.enabled &&
      candidateModels.some((model) => model.id === nativeModel.id) &&
      isModelAllowedByTenant(nativeModel.id, input.tenantId)
    ) {
      return nativeModel;
    }
  }

  // 4) Safe fallback from plan/catalog.
  const fallback = candidateModels.find(
    (m) => m.enabled && m.riskTier !== "high" && isModelAllowedByTenant(m.id, input.tenantId),
  );

  if (!fallback) {
    throw new Error("No model available for tenant policy");
  }

  return fallback;
}

function isModelAllowedByTenant(modelId: string, tenantId: string): boolean {
  const tenantPolicy = getTenantPolicy(tenantId);

  if (!tenantPolicy) return true;
  if (tenantPolicy.blockedModelIds.includes(modelId)) return false;

  const model = getProviderModel(modelId);
  if (!model) return false;

  return tenantPolicy.enabledProviders.includes(model.provider);
}

function getCandidateModelsByPlan(input: UserModelPreference): ProviderModel[] {
  if (!input.activePlanId) {
    return listProviderModels();
  }

  const plan = getProviderPlan(input.activePlanId);
  if (!plan || !plan.enabled) {
    return [];
  }

  if (!plan.allowedUserPlans.includes(input.userPlanTier)) {
    return [];
  }

  return plan.allowedModelIds
    .map((modelId) => getProviderModel(modelId))
    .filter((model): model is ProviderModel => Boolean(model));
}

function readEnvFlag(key: string, defaultValue: boolean): boolean {
  const raw = process.env[key];
  if (!raw) return defaultValue;

  return raw.toLowerCase() === "true";
}
