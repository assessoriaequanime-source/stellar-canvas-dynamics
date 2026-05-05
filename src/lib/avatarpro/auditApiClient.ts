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

export function getAuditEventsByWallet(walletAddress: string) {
  if (isExplicitAvatarProDemoMode()) {
    return Promise.resolve(demoAuditEvents());
  }
  return requestJson<Array<Record<string, unknown>>>(`/audit/events?walletAddress=${encodeURIComponent(walletAddress)}`);
}

export function createAuditProof(payload: {
  walletAddress: string;
  avatarId?: string;
  eventType: string;
  payloadHash: string;
  serviceType?: string;
}) {
  if (isExplicitAvatarProDemoMode()) {
    return Promise.resolve({
      proofTxSignature: "DEMO-TX-AUDIT-001",
      txSignature: "DEMO-TX-AUDIT-001",
      explorerUrl: "https://explorer.solana.com/tx/DEMO-TX-AUDIT-001?cluster=devnet",
      ...payload,
      network: "solana-devnet",
      createdAt: new Date().toISOString(),
    });
  }
  return requestJson<Record<string, unknown>>("/audit/proof", {
    method: "POST",
    body: payload,
  });
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
  return requestJson<Array<Record<string, unknown>>>("/audit/events");
}
