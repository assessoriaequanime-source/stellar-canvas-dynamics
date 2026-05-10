import { getSessionToken, requestJson } from "./http";
import { isExplicitAvatarProDemoMode } from "./demoMode";

async function withFallback<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

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
  if (!getSessionToken()) {
    return Promise.resolve([]);
  }

  return withFallback(requestJson<Array<Record<string, unknown>>>("/legacy-rules"), []);
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
