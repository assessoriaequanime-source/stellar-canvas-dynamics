import type { AvatarMaturityState } from "./types";
import type {
  AssertivenessCycle,
  DomainPolicy,
  GovernanceDecision,
} from "./governance-types";

// --- Políticas canônicas por domínio ---

const DEFAULT_POLICIES: Record<string, DomainPolicy> = {
  "professional-method": {
    domain: "professional-method",
    promotionThreshold: 0.75,
    demotionThreshold: 0.45,
    maxEscalationRate: 0.2,
    minInteractionCount: 10,
    reviewerRequired: true,
  },
  "time-capsule-delivery": {
    domain: "time-capsule-delivery",
    promotionThreshold: 0.80,
    demotionThreshold: 0.50,
    maxEscalationRate: 0.15,
    minInteractionCount: 5,
    reviewerRequired: false,
  },
  "legacy-execution": {
    domain: "legacy-execution",
    promotionThreshold: 0.85,
    demotionThreshold: 0.55,
    maxEscalationRate: 0.10,
    minInteractionCount: 15,
    reviewerRequired: true,
  },
};

const policyRegistry = new Map<string, DomainPolicy>(
  Object.entries(DEFAULT_POLICIES),
);

export const registerDomainPolicy = (policy: DomainPolicy) => {
  policyRegistry.set(policy.domain, policy);
};

export const getPolicy = (domain: string): DomainPolicy => {
  return (
    policyRegistry.get(domain) ?? policyRegistry.get("professional-method")!
  );
};

// --- Motor de avaliação de maturidade ---

export const evaluateMaturity = (params: {
  avatarId: string;
  domain: string;
  currentState: AvatarMaturityState;
  pas: number;
  interactionCount: number;
  escalationCount: number;
  slot: number;
}): GovernanceDecision => {
  const policy = getPolicy(params.domain);
  const escalationRate =
    params.interactionCount > 0
      ? params.escalationCount / params.interactionCount
      : 1;

  const meetsMinInteractions =
    params.interactionCount >= policy.minInteractionCount;
  const escalationOk = escalationRate <= policy.maxEscalationRate;

  let nextState: AvatarMaturityState = params.currentState;
  let promoted = false;
  let demoted = false;
  let fallbackRequired = false;
  let reason = "Manteve estado atual.";

  if (params.currentState === "Draft") {
    if (
      meetsMinInteractions &&
      params.pas >= policy.promotionThreshold &&
      escalationOk
    ) {
      nextState = "Assisted";
      promoted = true;
      reason = `PAS ${params.pas.toFixed(2)} atingiu limiar ${policy.promotionThreshold}. Promovido para Assisted.`;
    } else {
      reason = `PAS ${params.pas.toFixed(2)} abaixo de ${policy.promotionThreshold} ou critérios insuficientes.`;
    }
  } else if (params.currentState === "Assisted") {
    if (
      meetsMinInteractions &&
      params.pas >= policy.promotionThreshold &&
      escalationOk
    ) {
      nextState = "Trusted";
      promoted = true;
      reason = `PAS ${params.pas.toFixed(2)} e taxa de escalonamento ${(escalationRate * 100).toFixed(1)}% OK. Promovido para Trusted.`;
    } else if (params.pas < policy.demotionThreshold) {
      nextState = "Draft";
      demoted = true;
      fallbackRequired = true;
      reason = `PAS ${params.pas.toFixed(2)} caiu abaixo do limiar de rebaixamento ${policy.demotionThreshold}. Requer revisão humana.`;
    }
  } else if (params.currentState === "Trusted") {
    if (
      params.pas < policy.demotionThreshold ||
      escalationRate > policy.maxEscalationRate
    ) {
      nextState = "Assisted";
      demoted = true;
      fallbackRequired = params.pas < policy.demotionThreshold;
      reason = `PAS ${params.pas.toFixed(2)} ou escalonamento ${(escalationRate * 100).toFixed(1)}% excedeu limite. Rebaixado para Assisted.`;
    }
  }

  return {
    avatarId: params.avatarId,
    domain: params.domain,
    previousState: params.currentState,
    nextState,
    promoted,
    demoted,
    fallbackRequired,
    reason,
    evaluatedAt: params.slot,
  };
};

// --- Registro de ciclos de avaliação ---

const cycleHistory: AssertivenessCycle[] = [];

export const recordAssertivenessCycle = (params: {
  avatarId: string;
  domain: string;
  interactionCount: number;
  correctResolutions: number;
  escalations: number;
  currentState: AvatarMaturityState;
  pas: number;
  slot: number;
}): AssertivenessCycle => {
  const decision = evaluateMaturity({
    avatarId: params.avatarId,
    domain: params.domain,
    currentState: params.currentState,
    pas: params.pas,
    interactionCount: params.interactionCount,
    escalationCount: params.escalations,
    slot: params.slot,
  });

  const cycle: AssertivenessCycle = {
    cycleId: `cycle-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    avatarId: params.avatarId,
    domain: params.domain,
    interactionCount: params.interactionCount,
    correctResolutions: params.correctResolutions,
    escalations: params.escalations,
    pas: params.pas,
    decision,
  };

  cycleHistory.push(cycle);
  return cycle;
};

export const getCycleHistory = (avatarId?: string): AssertivenessCycle[] => {
  if (avatarId) return cycleHistory.filter((c) => c.avatarId === avatarId);
  return [...cycleHistory];
};

export const clearCycleHistory = () => {
  cycleHistory.splice(0, cycleHistory.length);
};
