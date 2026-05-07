import { requestJson } from "./http";
import { DEMO_WALLET_ADDRESS, isExplicitAvatarProDemoMode } from "./demoMode";

export function getSglBalance(walletAddress: string) {
  if (isExplicitAvatarProDemoMode()) {
    return Promise.resolve({
      walletAddress: walletAddress || DEMO_WALLET_ADDRESS,
      network: "Solana Devnet / Demo",
      sglBalance: 10000,
      tokenAccount: "DEMO-TOKEN-ACCOUNT",
      source: "demo-mode",
    });
  }
  return requestJson<Record<string, unknown>>(`/sgl/balance?walletAddress=${encodeURIComponent(walletAddress)}`);
}

export function debitSglForService(payload: {
  walletAddress: string;
  serviceType: string;
  cost: number;
  avatarId?: string;
  payloadHash?: string;
}) {
  if (isExplicitAvatarProDemoMode()) {
    const previousBalance = 10000;
    const cost = Number(payload.cost || 0);
    return Promise.resolve({
      debitStatus: "pending_wallet_signature",
      serviceType: payload.serviceType,
      previousBalance,
      cost,
      sglBalance: Math.max(0, previousBalance - cost),
      payloadHash: payload.payloadHash || "demo-payload-hash",
      txSignature: "DEMO-TX-SGL-001",
      proofTxSignature: "DEMO-TX-SGL-001",
      explorerUrl: "https://explorer.solana.com/tx/DEMO-TX-SGL-001?cluster=devnet",
      message: "Proof registered on Solana Devnet. SGL debit requires wallet signature.",
      source: "demo-mode",
    });
  }
  return requestJson<Record<string, unknown>>("/sgl/debit", {
    method: "POST",
    body: payload,
  });
}

export function getSglLedger(walletAddress: string) {
  if (isExplicitAvatarProDemoMode()) {
    return Promise.resolve([
      {
        id: "ledger-001",
        serviceType: "AvatarPro Demo Initialization",
        amount: 0,
        txSignature: "DEMO-TX-SGL-001",
        explorerUrl: "https://explorer.solana.com/?cluster=devnet",
        status: "demo",
      },
    ]);
  }
  return requestJson<Array<Record<string, unknown>>>(`/sgl/ledger?walletAddress=${encodeURIComponent(walletAddress)}`);
}
