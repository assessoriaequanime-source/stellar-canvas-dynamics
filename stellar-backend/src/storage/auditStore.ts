import fs from "fs";
import path from "path";

export interface StoredAuditEvent {
  walletAddress: string;
  avatarId?: string;
  eventType: string;
  serviceType?: string;
  cost?: number;
  payloadHash: string;
  txSignature: string;
  explorerUrl: string;
  createdAt: string;
  network: string;
  mintAddress?: string;
  debitStatus?: "pending_wallet_signature" | "confirmed";
}

interface CreditLedgerItem {
  walletAddress: string;
  mintAddress: string;
  txSignature: string;
  createdAt: string;
}

const DATA_DIR = path.resolve(process.cwd(), "data");
const AUDIT_EVENTS_FILE = path.join(DATA_DIR, "audit-events.json");
const CREDIT_LEDGER_FILE = path.join(DATA_DIR, "sgl-credit-ledger.json");

function ensureStoreFiles(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(AUDIT_EVENTS_FILE)) {
    fs.writeFileSync(AUDIT_EVENTS_FILE, "[]\n", "utf8");
  }

  if (!fs.existsSync(CREDIT_LEDGER_FILE)) {
    fs.writeFileSync(CREDIT_LEDGER_FILE, "[]\n", "utf8");
  }
}

function readJsonArray<T>(filePath: string): T[] {
  ensureStoreFiles();

  const raw = fs.readFileSync(filePath, "utf8").trim();
  if (!raw) {
    return [];
  }

  const parsed = JSON.parse(raw) as unknown;
  return Array.isArray(parsed) ? (parsed as T[]) : [];
}

function writeJsonArray<T>(filePath: string, data: T[]): void {
  ensureStoreFiles();
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function appendAuditEvent(event: StoredAuditEvent): StoredAuditEvent {
  const events = readJsonArray<StoredAuditEvent>(AUDIT_EVENTS_FILE);
  events.unshift(event);
  writeJsonArray(AUDIT_EVENTS_FILE, events.slice(0, 5000));
  return event;
}

export function listAuditEvents(filters: { walletAddress?: string; avatarId?: string }): StoredAuditEvent[] {
  const events = readJsonArray<StoredAuditEvent>(AUDIT_EVENTS_FILE);

  return events.filter((event) => {
    if (filters.walletAddress && event.walletAddress !== filters.walletAddress) {
      return false;
    }

    if (filters.avatarId && event.avatarId !== filters.avatarId) {
      return false;
    }

    return true;
  });
}

export function markInitialCredit(walletAddress: string, mintAddress: string, txSignature: string): CreditLedgerItem {
  const ledger = readJsonArray<CreditLedgerItem>(CREDIT_LEDGER_FILE);

  const existing = ledger.find((item) => item.walletAddress === walletAddress && item.mintAddress === mintAddress);
  if (existing) {
    return existing;
  }

  const item: CreditLedgerItem = {
    walletAddress,
    mintAddress,
    txSignature,
    createdAt: new Date().toISOString(),
  };

  ledger.unshift(item);
  writeJsonArray(CREDIT_LEDGER_FILE, ledger);

  return item;
}

export function hasInitialCredit(walletAddress: string, mintAddress: string): boolean {
  const ledger = readJsonArray<CreditLedgerItem>(CREDIT_LEDGER_FILE);
  return ledger.some((item) => item.walletAddress === walletAddress && item.mintAddress === mintAddress);
}
