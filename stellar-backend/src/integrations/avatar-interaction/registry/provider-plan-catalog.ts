import type {
  ProviderModel,
  ProviderPlan,
  TenantProviderPolicy,
} from "../contracts/provider-plan-types";

const modelCatalog = new Map<string, ProviderModel>();
const planCatalog = new Map<string, ProviderPlan>();
const tenantPolicies = new Map<string, TenantProviderPolicy>();

export function upsertProviderModel(model: ProviderModel): void {
  modelCatalog.set(model.id, model);
}

export function upsertProviderPlan(plan: ProviderPlan): void {
  planCatalog.set(plan.id, plan);
}

export function upsertTenantPolicy(policy: TenantProviderPolicy): void {
  tenantPolicies.set(policy.tenantId, policy);
}

export function getProviderModel(modelId: string): ProviderModel | undefined {
  return modelCatalog.get(modelId);
}

export function getProviderPlan(planId: string): ProviderPlan | undefined {
  return planCatalog.get(planId);
}

export function getTenantPolicy(tenantId: string): TenantProviderPolicy | undefined {
  return tenantPolicies.get(tenantId);
}

export function listProviderModels(): ProviderModel[] {
  return Array.from(modelCatalog.values());
}

export function listProviderPlans(): ProviderPlan[] {
  return Array.from(planCatalog.values());
}
