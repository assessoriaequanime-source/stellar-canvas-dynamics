import { requestJson } from "./http";

export function listCapsules() {
  return requestJson<Array<Record<string, unknown>>>("/capsules");
}

export function createCapsule(payload: Record<string, unknown>) {
  return requestJson<Record<string, unknown>>("/capsules", {
    method: "POST",
    body: payload,
  });
}

export function simulateCapsuleTrigger(capsuleId: string) {
  return requestJson<Record<string, unknown>>(`/capsules/${capsuleId}/simulate-trigger`, {
    method: "POST",
    body: {},
  });
}
