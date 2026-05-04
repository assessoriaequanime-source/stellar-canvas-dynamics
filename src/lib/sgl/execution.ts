import type { SolanaAdapter } from "@/lib/solana/solanaAdapter";
import { INITIAL_SGL_BALANCE, SERVICE_CATALOG, type ServiceType } from "./services";

export const AUDIT_STORAGE_KEY = "singulai_vault_audit_records_v1";

export type AuditStatus = "SUCCESS" | "FAILED";

export interface AuditRecord {
  walletAddress: string;
  avatarId: string;
  serviceType: ServiceType;
  cost: number;
  previousBalance: number;
  newBalance: number;
  payloadHash: string;
  snapshotHash: string;
  timestamp: string;
  status: AuditStatus;
  txSignature: string;
  explorerUrl: string;
}

export interface ExecuteServiceInput {
  walletAddress: string;
  avatarId: string;
  serviceType: ServiceType;
  currentBalance: number;
  totalSpent: number;
  adapter: SolanaAdapter;
}

export interface ExecuteServiceResult {
  record: AuditRecord;
  newBalance: number;
  newTotalSpent: number;
}

function fallbackHash(input: string): string {
  let hash = 0;

  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }

  return `fallback-${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

async function sha256Hex(input: string): Promise<string> {
  try {
    if (typeof crypto === "undefined" || !crypto.subtle) {
      return fallbackHash(input);
    }

    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
    return Array.from(new Uint8Array(digest))
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return fallbackHash(input);
  }
}

export function loadAuditRecords(): AuditRecord[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as AuditRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAuditRecords(records: AuditRecord[]): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(records));
}

export async function executePaidService(input: ExecuteServiceInput): Promise<ExecuteServiceResult> {
  const config = SERVICE_CATALOG[input.serviceType];

  if (!config) {
    throw new Error(`Unknown service type: ${input.serviceType}`);
  }

  if (input.currentBalance < config.cost) {
    throw new Error("Insufficient SGL balance for this execution.");
  }

  const previousBalance = input.currentBalance;
  const newBalance = previousBalance - config.cost;
  const newTotalSpent = input.totalSpent + config.cost;
  const timestamp = new Date().toISOString();

  const payloadHash = await sha256Hex(
    JSON.stringify({
      walletAddress: input.walletAddress,
      avatarId: input.avatarId,
      serviceType: input.serviceType,
      timestamp,
    }),
  );

  const snapshotHash = await sha256Hex(`${input.avatarId}:${input.serviceType}:${newTotalSpent}:${timestamp}`);

  const tx = await input.adapter.submitTransaction({
    walletAddress: input.walletAddress,
    serviceType: input.serviceType,
    payloadHash,
  });

  const record: AuditRecord = {
    walletAddress: input.walletAddress,
    avatarId: input.avatarId,
    serviceType: input.serviceType,
    cost: config.cost,
    previousBalance,
    newBalance,
    payloadHash,
    snapshotHash,
    timestamp,
    status: "SUCCESS",
    txSignature: tx.txSignature,
    explorerUrl: tx.explorerUrl,
  };

  const existingRecords = loadAuditRecords();
  saveAuditRecords([record, ...existingRecords]);

  return {
    record,
    newBalance,
    newTotalSpent,
  };
}

export function getPublicAuditSummary(records: AuditRecord[]) {
  const latest = records[0];

  return {
    balance: latest ? latest.newBalance : INITIAL_SGL_BALANCE,
    totalSpent: records.reduce((total, item) => total + item.cost, 0),
    totalActions: records.length,
  };
}
