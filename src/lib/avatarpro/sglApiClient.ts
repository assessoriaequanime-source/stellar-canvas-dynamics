import { requestJson } from "./http";
import { DEMO_WALLET_ADDRESS, isExplicitAvatarProDemoMode } from "./demoMode";

export function getSglBalance() {
  if (isExplicitAvatarProDemoMode()) {
    return Promise.resolve({
      walletAddress: DEMO_WALLET_ADDRESS,
      network: "Solana Devnet / Demo",
      sglBalance: 10000,
      source: "demo-mode",
    });
  }
  return requestJson<Record<string, unknown>>("/sgl/balance");
}

export function debitSglForService(payload: {
  serviceType: string;
  amount: number;
  txHash?: string;
}) {
  if (isExplicitAvatarProDemoMode()) {
    const previousBalance = 10000;
    const cost = Number(payload.amount || 0);
    return Promise.resolve({
      success: true,
      serviceType: payload.serviceType,
      previousBalance,
      cost,
      newBalance: Math.max(0, previousBalance - cost),
      txSignature: "DEMO-TX-SGL-001",
      explorerUrl: "https://explorer.solana.com/?cluster=devnet",
      source: "demo-mode",
    });
  }
  return requestJson<Record<string, unknown>>("/sgl/debit", {
    method: "POST",
    body: payload,
  });
}

export function getSglLedger() {
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
  return requestJson<Array<Record<string, unknown>>>("/sgl/ledger");
}
