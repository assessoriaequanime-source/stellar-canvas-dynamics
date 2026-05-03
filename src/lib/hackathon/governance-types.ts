import type { AvatarMaturityState } from "./types";

export interface DomainPolicy {
  domain: string;
  promotionThreshold: number;
  demotionThreshold: number;
  maxEscalationRate: number;
  minInteractionCount: number;
  reviewerRequired: boolean;
}

export interface GovernanceDecision {
  avatarId: string;
  domain: string;
  previousState: AvatarMaturityState;
  nextState: AvatarMaturityState;
  promoted: boolean;
  demoted: boolean;
  fallbackRequired: boolean;
  reason: string;
  evaluatedAt: number;
}

export interface AssertivenessCycle {
  cycleId: string;
  avatarId: string;
  domain: string;
  interactionCount: number;
  correctResolutions: number;
  escalations: number;
  pas: number;
  decision: GovernanceDecision;
}
