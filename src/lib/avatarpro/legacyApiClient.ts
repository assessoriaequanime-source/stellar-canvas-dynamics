import { requestJson } from "./http";
import { isExplicitAvatarProDemoMode } from "./demoMode";

export function listLegacyRules() {
  if (isExplicitAvatarProDemoMode()) {
    return Promise.resolve([
      {
        id: "legacy-001",
        title: "Digital Legacy Demo Rule",
        status: "draft",
        network: "Solana Devnet / Demo",
      },
    ]);
  }
  return requestJson<Array<Record<string, unknown>>>("/legacy-rules");
}

export function createLegacyRule(payload: Record<string, unknown>) {
  if (isExplicitAvatarProDemoMode()) {
    return Promise.resolve({
      id: "legacy-001",
      title: payload.title || payload.name || "Digital Legacy Demo Rule",
      status: "draft",
      network: "Solana Devnet / Demo",
      source: "demo-mode",
    });
  }
  return requestJson<Record<string, unknown>>("/legacy-rules", {
    method: "POST",
    body: payload,
  });
}
