import { requestJson } from "./http";

export function getSglBalance() {
  return requestJson<Record<string, unknown>>("/sgl/balance");
}

export function debitSglForService(payload: {
  serviceType: string;
  amount: number;
  txHash?: string;
}) {
  return requestJson<Record<string, unknown>>("/sgl/debit", {
    method: "POST",
    body: payload,
  });
}

export function getSglLedger() {
  return requestJson<Array<Record<string, unknown>>>("/sgl/ledger");
}
