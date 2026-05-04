import { requestJson } from "./http";
import { DEMO_AVATAR_ID, isExplicitAvatarProDemoMode } from "./demoMode";

export function submitAbsorptionFeedback(payload: {
  direction: "left" | "right";
  profile: string;
  intensity?: number;
  source?: string;
}) {
  if (isExplicitAvatarProDemoMode()) {
    const feedbackDirection = payload.direction === "right" ? "drag_right" : "drag_left";
    const absorptionDelta = payload.direction === "right" ? 0.03 : -0.03;
    return Promise.resolve({
      success: true,
      feedbackDirection,
      absorptionDelta,
      newScore: Number((0.72 + absorptionDelta).toFixed(2)),
      source: "demo-mode",
    });
  }

  return requestJson<Record<string, unknown>>("/avatarpro/absorption-feedback", {
    method: "POST",
    body: payload,
  });
}

export function getAbsorptionState() {
  if (isExplicitAvatarProDemoMode()) {
    return Promise.resolve({
      avatarId: DEMO_AVATAR_ID,
      state: "learning",
      particleWhitening: 0.72,
      lastFeedback: "Ready for feedback",
      absorption: 74,
    });
  }
  return requestJson<Record<string, unknown>>("/avatarpro/absorption-events");
}

export function getPasMetrics() {
  if (isExplicitAvatarProDemoMode()) {
    return Promise.resolve({
      pasScore: 0.72,
      omegaScore: 0.68,
      absorption: 0.74,
      interaction: 0.69,
      particles: 0.81,
      omega: 68,
      pas: 0.72,
      score: 68,
    });
  }
  return requestJson<Record<string, unknown>>("/avatarpro/metrics");
}
