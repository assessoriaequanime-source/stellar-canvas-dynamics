import { requestJson } from "./http";
import { isExplicitAvatarProDemoMode } from "./demoMode";

function demoAuditEvents() {
  return [
    {
      id: "audit-001",
      serviceType: "AvatarPro Demo Initialization",
      network: "Solana Devnet / Demo",
      txSignature: "DEMO-TX-AVATARPRO-001",
      explorerUrl: "https://explorer.solana.com/?cluster=devnet",
      payloadHash: "demo-payload-hash-001",
      timestamp: new Date().toISOString(),
      status: "demo",
    },
  ];
}

export function getAuditHistory() {
  if (isExplicitAvatarProDemoMode()) {
    return Promise.resolve(demoAuditEvents());
  }
  return requestJson<Array<Record<string, unknown>>>("/audit/events");
}

export function getSessionHistory() {
  if (isExplicitAvatarProDemoMode()) {
    return Promise.resolve(demoAuditEvents());
  }
  return requestJson<Array<Record<string, unknown>>>("/transaction");
}

export function getProofEvents() {
  if (isExplicitAvatarProDemoMode()) {
    return Promise.resolve(demoAuditEvents());
  }
  return requestJson<Array<Record<string, unknown>>>("/audit/events?type=proof");
}
