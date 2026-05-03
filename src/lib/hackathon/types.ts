export type AvatarMaturityState = "Draft" | "Assisted" | "Trusted";

export type CapsuleStatus =
  | "Created"
  | "Armed"
  | "Triggered"
  | "Delivered"
  | "Audited";

export type TriggerType = "timestamp" | "manual" | "event";

export interface AvatarIdentity {
  avatarId: string;
  ownerWallet: string;
  snapshotHashRef: string;
  maturityState: AvatarMaturityState;
  updatedAtSlot: number;
}

export interface TimeCapsule {
  capsuleId: string;
  avatarId: string;
  triggerType: TriggerType;
  triggerAt: string;
  recipientRef: string;
  status: CapsuleStatus;
  proofRef?: string;
}

export interface ExecutionReserve {
  vaultId: string;
  payerWallet: string;
  reserveAmount: number;
  reserveStatus: "locked" | "consumed" | "released";
  executionPolicyRef: string;
}

export interface PermissionAccount {
  permissionAccountId: string;
  avatarId: string;
  domainScope: string;
  maxAutonomyLevel: AvatarMaturityState;
  reviewerRequired: boolean;
}

export interface ParticleSignal {
  interactionCount: number;
  assertivenessFeedback: number;
  executionSuccess: boolean;
  escalatedToHuman: boolean;
}

export interface ParticleAbsorptionState {
  pasPrevious: number;
  pasCurrent: number;
  trustDelta: number;
}

export interface ProofEvent {
  eventType:
    | "SnapshotAnchored"
    | "CapsuleCreated"
    | "TriggerSimulated"
    | "DeliveryRecorded"
    | "ParticleAbsorptionUpdated";
  signature: string;
  slot: number;
  payload: Record<string, string | number | boolean>;
}

export interface MvpFlowResult {
  avatar: AvatarIdentity;
  capsule: TimeCapsule;
  reserve: ExecutionReserve;
  particle: ParticleAbsorptionState;
  proofEvents: ProofEvent[];
}
