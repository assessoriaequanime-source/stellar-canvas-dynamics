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

export function createJudgeAccessCapsule(payload: {
  name: string;
  content: string;
  deliveryType: "immediate" | "scheduled";
  channel: "email" | "whatsapp" | "both";
  unlockDate?: string;
  recipientName: string;
  recipientEmail?: string;
  recipientWhatsapp?: string;
}) {
  if (isExplicitAvatarProDemoMode()) {
    return Promise.resolve({
      id: "judge-capsule-demo-001",
      name: payload.name,
      deliveryType: payload.deliveryType,
      channel: payload.channel,
      dispatchStatus: "sent",
      judgeAccess: {
        inviteLink: "https://singulai.live/audit?cid=judge-capsule-demo-001&jt=demo-judge-token",
        accessCode: "DEMO2026",
        temporaryWalletAddress: "JudgeDemoWallet11111111111111111111111111111",
      },
    });
  }

  return requestJson<Record<string, unknown>>("/capsules/judge-access", {
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
