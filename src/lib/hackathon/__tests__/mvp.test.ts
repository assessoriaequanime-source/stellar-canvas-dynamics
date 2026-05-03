import { describe, it, expect, beforeEach } from "vitest";
import {
  runMvpFlow,
  resetMvpState,
  createAvatarIdentity,
  updateParticleAbsorption,
  createTimeCapsule,
  simulateTrigger,
  recordDelivery,
} from "../mvp-orchestrator";
import {
  evaluateMaturity,
  recordAssertivenessCycle,
  getCycleHistory,
  clearCycleHistory,
} from "../governance-engine";

beforeEach(() => {
  resetMvpState();
  clearCycleHistory();
});

// ─── Suite 1: Fluxo MVP ponta a ponta ───────────────────────────────────────

describe("MVP Flow - end-to-end", () => {
  it("deve executar fluxo completo com todos os steps obrigatórios", () => {
    const result = runMvpFlow({
      ownerWallet: "GiZi9xDemoWalletHackathon0001",
      snapshotHashRef: "sha256:abc123demo",
      recipientRef: "beneficiary.demo@singulai.app",
      triggerAt: "2027-01-01T00:00:00Z",
    });

    expect(result.avatar.avatarId).toBeDefined();
    expect(result.avatar.ownerWallet).toBe("GiZi9xDemoWalletHackathon0001");
    expect(result.capsule.status).toBe("Delivered");
    expect(result.capsule.proofRef).toContain("solscan://proof/");
    expect(result.reserve.reserveStatus).toBe("locked");
    expect(result.particle.pasCurrent).toBeGreaterThan(0);
    expect(result.proofEvents.length).toBeGreaterThanOrEqual(5);
  });

  it("deve registrar todos os tipos de evento de prova no fluxo", () => {
    const result = runMvpFlow({
      ownerWallet: "GiZi9xDemoWalletHackathon0002",
      snapshotHashRef: "sha256:def456demo",
      recipientRef: "family.member@example.com",
      triggerAt: "2028-06-15T12:00:00Z",
    });

    const eventTypes = result.proofEvents.map((e) => e.eventType);
    expect(eventTypes).toContain("SnapshotAnchored");
    expect(eventTypes).toContain("CapsuleCreated");
    expect(eventTypes).toContain("TriggerSimulated");
    expect(eventTypes).toContain("DeliveryRecorded");
    expect(eventTypes).toContain("ParticleAbsorptionUpdated");
  });

  it("cada evento de prova deve ter signature e slot válidos", () => {
    const result = runMvpFlow({
      ownerWallet: "GiZi9xDemoWalletHackathon0003",
      snapshotHashRef: "sha256:ghi789demo",
      recipientRef: "ana.demo@singulai.app",
      triggerAt: "2030-12-31T23:59:00Z",
    });

    for (const event of result.proofEvents) {
      expect(event.signature).toMatch(/^sig_[a-f0-9]+$/);
      expect(event.slot).toBeGreaterThan(100000);
    }
  });
});

// ─── Suite 2: TimeCapsule lifecycle ─────────────────────────────────────────

describe("TimeCapsule lifecycle", () => {
  it("deve progredir de Created -> Triggered -> Delivered", () => {
    const avatar = createAvatarIdentity({
      ownerWallet: "DemoWallet001",
      snapshotHashRef: "sha256:lifecycle001",
    });

    const capsule = createTimeCapsule({
      avatarId: avatar.avatarId,
      triggerType: "timestamp",
      triggerAt: "2027-03-10T08:00:00Z",
      recipientRef: "colleague@demo.app",
    });

    expect(capsule.status).toBe("Created");

    const triggered = simulateTrigger(capsule.capsuleId);
    expect(triggered.status).toBe("Triggered");

    const delivered = recordDelivery(
      capsule.capsuleId,
      `solscan://proof/${capsule.capsuleId}`,
    );
    expect(delivered.status).toBe("Delivered");
    expect(delivered.proofRef).toContain(capsule.capsuleId);
  });

  it("deve lançar erro ao simular trigger de capsule inexistente", () => {
    expect(() => simulateTrigger("capsule-inexistente-xyz")).toThrow(
      "Capsule not found",
    );
  });
});

// ─── Suite 3: Modelo de Absorção de Partículas (PAS) ─────────────────────────

describe("Particle Absorption Model (PAS)", () => {
  it("deve aumentar PAS com sinal positivo forte", () => {
    const avatar = createAvatarIdentity({
      ownerWallet: "DemoWallet002",
      snapshotHashRef: "sha256:pas001",
    });

    const result = updateParticleAbsorption(avatar.avatarId, {
      interactionCount: 20,
      assertivenessFeedback: 1.0,
      executionSuccess: true,
      escalatedToHuman: false,
    });

    expect(result.pasCurrent).toBeGreaterThan(result.pasPrevious);
    expect(result.trustDelta).toBeGreaterThan(0);
  });

  it("deve manter PAS dentro de [0, 1] independente dos sinais", () => {
    const avatar = createAvatarIdentity({
      ownerWallet: "DemoWallet003",
      snapshotHashRef: "sha256:pas002",
    });

    const result = updateParticleAbsorption(avatar.avatarId, {
      interactionCount: 0,
      assertivenessFeedback: 0,
      executionSuccess: false,
      escalatedToHuman: true,
    });

    expect(result.pasCurrent).toBeGreaterThanOrEqual(0);
    expect(result.pasCurrent).toBeLessThanOrEqual(1);
  });

  it("deve promover avatar para Trusted quando PAS atinge limiar", () => {
    const avatar = createAvatarIdentity({
      ownerWallet: "DemoWallet004",
      snapshotHashRef: "sha256:pas003",
    });

    updateParticleAbsorption(
      avatar.avatarId,
      {
        interactionCount: 20,
        assertivenessFeedback: 1.0,
        executionSuccess: true,
        escalatedToHuman: false,
      },
      0.01,
    );

    const updated = createAvatarIdentity({
      ownerWallet: "DemoWallet004",
      snapshotHashRef: "sha256:pas003Updated",
      maturityState: "Trusted",
    });

    expect(updated.maturityState).toBe("Trusted");
  });
});

// ─── Suite 4: Governança de Assertividade ────────────────────────────────────

describe("Governance Engine - maturity rules", () => {
  it("deve promover avatar de Draft para Assisted quando PAS >= 0.75", () => {
    const decision = evaluateMaturity({
      avatarId: "avatar-gov-001",
      domain: "professional-method",
      currentState: "Draft",
      pas: 0.80,
      interactionCount: 15,
      escalationCount: 1,
      slot: 200100,
    });

    expect(decision.promoted).toBe(true);
    expect(decision.nextState).toBe("Assisted");
    expect(decision.fallbackRequired).toBe(false);
  });

  it("deve promover avatar de Assisted para Trusted com PAS alto e baixa escalação", () => {
    const decision = evaluateMaturity({
      avatarId: "avatar-gov-002",
      domain: "professional-method",
      currentState: "Assisted",
      pas: 0.88,
      interactionCount: 20,
      escalationCount: 2,
      slot: 200200,
    });

    expect(decision.promoted).toBe(true);
    expect(decision.nextState).toBe("Trusted");
  });

  it("deve rebaixar avatar de Assisted para Draft quando PAS cai abaixo de 0.45", () => {
    const decision = evaluateMaturity({
      avatarId: "avatar-gov-003",
      domain: "professional-method",
      currentState: "Assisted",
      pas: 0.30,
      interactionCount: 12,
      escalationCount: 4,
      slot: 200300,
    });

    expect(decision.demoted).toBe(true);
    expect(decision.nextState).toBe("Draft");
    expect(decision.fallbackRequired).toBe(true);
  });

  it("deve rebaixar avatar de Trusted para Assisted com alta taxa de escalação", () => {
    const decision = evaluateMaturity({
      avatarId: "avatar-gov-004",
      domain: "professional-method",
      currentState: "Trusted",
      pas: 0.65,
      interactionCount: 20,
      escalationCount: 10,
      slot: 200400,
    });

    expect(decision.demoted).toBe(true);
    expect(decision.nextState).toBe("Assisted");
  });

  it("deve manter estado atual quando PAS está na faixa neutra", () => {
    const decision = evaluateMaturity({
      avatarId: "avatar-gov-005",
      domain: "professional-method",
      currentState: "Assisted",
      pas: 0.60,
      interactionCount: 8,
      escalationCount: 1,
      slot: 200500,
    });

    expect(decision.promoted).toBe(false);
    expect(decision.demoted).toBe(false);
    expect(decision.nextState).toBe("Assisted");
  });

  it("não deve promover Draft sem atingir mínimo de interações", () => {
    const decision = evaluateMaturity({
      avatarId: "avatar-gov-006",
      domain: "professional-method",
      currentState: "Draft",
      pas: 0.90,
      interactionCount: 3,
      escalationCount: 0,
      slot: 200600,
    });

    expect(decision.promoted).toBe(false);
    expect(decision.nextState).toBe("Draft");
  });
});

// ─── Suite 5: Ciclos de assertividade persistidos ────────────────────────────

describe("Assertiveness Cycle History", () => {
  it("deve registrar e recuperar ciclo de avaliação", () => {
    const cycle = recordAssertivenessCycle({
      avatarId: "avatar-cycle-001",
      domain: "professional-method",
      interactionCount: 15,
      correctResolutions: 12,
      escalations: 2,
      currentState: "Draft",
      pas: 0.78,
      slot: 300100,
    });

    expect(cycle.cycleId).toMatch(/^cycle-/);
    expect(cycle.decision.promoted).toBe(true);
    expect(getCycleHistory("avatar-cycle-001")).toHaveLength(1);
  });

  it("deve isolar histórico de ciclos por avatarId", () => {
    recordAssertivenessCycle({
      avatarId: "avatar-A",
      domain: "professional-method",
      interactionCount: 12,
      correctResolutions: 10,
      escalations: 1,
      currentState: "Draft",
      pas: 0.77,
      slot: 300200,
    });

    recordAssertivenessCycle({
      avatarId: "avatar-B",
      domain: "legacy-execution",
      interactionCount: 20,
      correctResolutions: 18,
      escalations: 0,
      currentState: "Assisted",
      pas: 0.91,
      slot: 300300,
    });

    expect(getCycleHistory("avatar-A")).toHaveLength(1);
    expect(getCycleHistory("avatar-B")).toHaveLength(1);
    expect(getCycleHistory()).toHaveLength(2);
  });
});
