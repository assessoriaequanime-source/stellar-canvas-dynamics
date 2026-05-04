import { requestJson } from "./http";

export function listLegacyRules() {
  return requestJson<Array<Record<string, unknown>>>("/legacy-rules");
}

export function createLegacyRule(payload: Record<string, unknown>) {
  return requestJson<Record<string, unknown>>("/legacy-rules", {
    method: "POST",
    body: payload,
  });
}
