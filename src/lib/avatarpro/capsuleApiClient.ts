import { requestJson } from "./http";
import { isExplicitAvatarProDemoMode } from "./demoMode";

export function listCapsules() {
  if (isExplicitAvatarProDemoMode()) {
    return Promise.resolve([
      {
        id: "capsule-001",
        title: "Professional Continuity Capsule",
        status: "sealed",
        unlockRule: "reviewer-demo",
      },
    ]);
  }
  return requestJson<Array<Record<string, unknown>>>("/capsules");
}

export function createCapsule(payload: Record<string, unknown>) {
  if (isExplicitAvatarProDemoMode()) {
    return Promise.resolve({
      id: "capsule-001",
      title: payload.title || payload.name || "Professional Continuity Capsule",
      status: "sealed",
      unlockRule: "reviewer-demo",
      source: "demo-mode",
    });
  }
  return requestJson<Record<string, unknown>>("/capsules", {
    method: "POST",
    body: payload,
  });
}

export function simulateCapsuleTrigger(capsuleId: string) {
  if (isExplicitAvatarProDemoMode()) {
    return Promise.resolve({
      id: capsuleId,
      status: "SIMULATED_TRIGGERED",
      simulatedTriggerAt: new Date().toISOString(),
      source: "demo-mode",
    });
  }
  return requestJson<Record<string, unknown>>(`/capsules/${capsuleId}/simulate-trigger`, {
    method: "POST",
    body: {},
  });
}
