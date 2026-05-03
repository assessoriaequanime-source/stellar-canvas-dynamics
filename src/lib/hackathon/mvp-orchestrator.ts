import type {
  AvatarIdentity,
  AvatarMaturityState,
  ExecutionReserve,
  MvpFlowResult,
  ParticleAbsorptionState,
  ParticleSignal,
  PermissionAccount,
  ProofEvent,
  TimeCapsule,
  TriggerType,
} from "./types";

const state = {
  slot: 100000,
  avatars: new Map<string, AvatarIdentity>(),
  capsules: new Map<string, TimeCapsule>(),
  reserves: new Map<string, ExecutionReserve>(),
  permissions: new Map<string, PermissionAccount>(),
  particle: new Map<string, ParticleAbsorptionState>(),
  proofs: [] as ProofEvent[],
};

const nextSlot = () => ++state.slot;

const createId = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

const createSignature = () => `sig_${crypto.randomUUID().replaceAll("-", "")}`;

const pushEvent = (event: ProofEvent) => {
  state.proofs.push(event);
  return event;
};

export const createAvatarIdentity = (params: {
  ownerWallet: string;
  snapshotHashRef: string;
  maturityState?: AvatarMaturityState;
}) => {
  const avatar: AvatarIdentity = {
    avatarId: createId("avatar"),
    ownerWallet: params.ownerWallet,
    snapshotHashRef: params.snapshotHashRef,
    maturityState: params.maturityState ?? "Draft",
    updatedAtSlot: nextSlot(),
  };

  state.avatars.set(avatar.avatarId, avatar);

  pushEvent({
    eventType: "SnapshotAnchored",
    signature: createSignature(),
    slot: avatar.updatedAtSlot,
    payload: {
      avatarId: avatar.avatarId,
      snapshotHash: avatar.snapshotHashRef,
      maturityState: avatar.maturityState,
    },
  });

  return avatar;
};

export const createPermissionAccount = (params: {
  avatarId: string;
  domainScope: string;
  maxAutonomyLevel: AvatarMaturityState;
  reviewerRequired: boolean;
}) => {
  const permission: PermissionAccount = {
    permissionAccountId: createId("perm"),
    avatarId: params.avatarId,
    domainScope: params.domainScope,
    maxAutonomyLevel: params.maxAutonomyLevel,
    reviewerRequired: params.reviewerRequired,
  };

  state.permissions.set(permission.permissionAccountId, permission);
  return permission;
};

export const lockExecutionReserve = (params: {
  payerWallet: string;
  reserveAmount: number;
  executionPolicyRef: string;
}) => {
  const reserve: ExecutionReserve = {
    vaultId: createId("vault"),
    payerWallet: params.payerWallet,
    reserveAmount: params.reserveAmount,
    reserveStatus: "locked",
    executionPolicyRef: params.executionPolicyRef,
  };

  state.reserves.set(reserve.vaultId, reserve);
  return reserve;
};

export const createTimeCapsule = (params: {
  avatarId: string;
  triggerType: TriggerType;
  triggerAt: string;
  recipientRef: string;
}) => {
  const capsule: TimeCapsule = {
    capsuleId: createId("capsule"),
    avatarId: params.avatarId,
    triggerType: params.triggerType,
    triggerAt: params.triggerAt,
    recipientRef: params.recipientRef,
    status: "Created",
  };

  state.capsules.set(capsule.capsuleId, capsule);

  pushEvent({
    eventType: "CapsuleCreated",
    signature: createSignature(),
    slot: nextSlot(),
    payload: {
      capsuleId: capsule.capsuleId,
      avatarId: capsule.avatarId,
      triggerType: capsule.triggerType,
      triggerAt: capsule.triggerAt,
    },
  });

  return capsule;
};

export const simulateTrigger = (capsuleId: string) => {
  const capsule = state.capsules.get(capsuleId);
  if (!capsule) throw new Error("Capsule not found");

  capsule.status = "Triggered";

  pushEvent({
    eventType: "TriggerSimulated",
    signature: createSignature(),
    slot: nextSlot(),
    payload: {
      capsuleId,
      triggerResult: "success",
      triggerType: capsule.triggerType,
    },
  });

  return capsule;
};

export const recordDelivery = (capsuleId: string, deliveryRef: string) => {
  const capsule = state.capsules.get(capsuleId);
  if (!capsule) throw new Error("Capsule not found");

  capsule.status = "Delivered";
  capsule.proofRef = deliveryRef;

  pushEvent({
    eventType: "DeliveryRecorded",
    signature: createSignature(),
    slot: nextSlot(),
    payload: {
      capsuleId,
      deliveryStatus: "delivered",
      deliveryRef,
    },
  });

  return capsule;
};

export const updateParticleAbsorption = (
  avatarId: string,
  signal: ParticleSignal,
  threshold = 0.7,
) => {
  const previous = state.particle.get(avatarId)?.pasCurrent ?? 0.5;

  const interactionFactor = Math.min(signal.interactionCount / 20, 1) * 0.25;
  const assertivenessFactor = Math.max(0, Math.min(signal.assertivenessFeedback, 1)) * 0.45;
  const executionFactor = signal.executionSuccess ? 0.2 : -0.15;
  const escalationPenalty = signal.escalatedToHuman ? -0.1 : 0.05;

  const pasCurrent = Math.max(
    0,
    Math.min(1, previous + interactionFactor + assertivenessFactor + executionFactor + escalationPenalty - 0.2),
  );

  const particle: ParticleAbsorptionState = {
    pasPrevious: previous,
    pasCurrent,
    trustDelta: pasCurrent - previous,
  };

  state.particle.set(avatarId, particle);

  const avatar = state.avatars.get(avatarId);
  if (avatar) {
    avatar.maturityState = pasCurrent >= threshold ? "Trusted" : "Assisted";
    avatar.updatedAtSlot = nextSlot();
  }

  pushEvent({
    eventType: "ParticleAbsorptionUpdated",
    signature: createSignature(),
    slot: nextSlot(),
    payload: {
      avatarId,
      pasPrevious: particle.pasPrevious,
      pasCurrent: particle.pasCurrent,
      trustDelta: particle.trustDelta,
    },
  });

  return particle;
};

export const runMvpFlow = (params: {
  ownerWallet: string;
  snapshotHashRef: string;
  recipientRef: string;
  triggerAt: string;
}) => {
  const avatar = createAvatarIdentity({
    ownerWallet: params.ownerWallet,
    snapshotHashRef: params.snapshotHashRef,
  });

  createPermissionAccount({
    avatarId: avatar.avatarId,
    domainScope: "professional-method",
    maxAutonomyLevel: "Trusted",
    reviewerRequired: true,
  });

  const reserve = lockExecutionReserve({
    payerWallet: params.ownerWallet,
    reserveAmount: 25,
    executionPolicyRef: "sgl-execution-policy-v1",
  });

  const capsule = createTimeCapsule({
    avatarId: avatar.avatarId,
    triggerType: "manual",
    triggerAt: params.triggerAt,
    recipientRef: params.recipientRef,
  });

  simulateTrigger(capsule.capsuleId);
  recordDelivery(capsule.capsuleId, `solscan://proof/${capsule.capsuleId}`);

  const particle = updateParticleAbsorption(avatar.avatarId, {
    interactionCount: 12,
    assertivenessFeedback: 0.82,
    executionSuccess: true,
    escalatedToHuman: false,
  });

  return {
    avatar: state.avatars.get(avatar.avatarId)!,
    capsule: state.capsules.get(capsule.capsuleId)!,
    reserve,
    particle,
    proofEvents: [...state.proofs],
  } satisfies MvpFlowResult;
};

export const getProofEvents = () => [...state.proofs];

export const resetMvpState = () => {
  state.slot = 100000;
  state.avatars.clear();
  state.capsules.clear();
  state.reserves.clear();
  state.permissions.clear();
  state.particle.clear();
  state.proofs = [];
};
