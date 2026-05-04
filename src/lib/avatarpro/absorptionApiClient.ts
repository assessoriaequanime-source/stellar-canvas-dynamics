import { requestJson } from "./http";

export function submitAbsorptionFeedback(payload: {
  direction: "left" | "right";
  profile: string;
  intensity?: number;
  source?: string;
}) {
  return requestJson<Record<string, unknown>>("/avatarpro/absorption-feedback", {
    method: "POST",
    body: payload,
  });
}

export function getAbsorptionState() {
  return requestJson<Record<string, unknown>>("/avatarpro/absorption-events");
}

export function getPasMetrics() {
  return requestJson<Record<string, unknown>>("/avatarpro/metrics");
}
