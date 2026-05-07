import { useMemo, useState, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { executePaidService, getPublicAuditSummary, loadAuditRecords, type AuditRecord } from "@/lib/sgl/execution";
import { INITIAL_SGL_BALANCE, SERVICE_CATALOG, SERVICE_TYPES, type ServiceType } from "@/lib/sgl/services";
import { RealSolanaAdapter } from "@/lib/solana/realSolanaAdapter";
import { DEMO_WALLET_ADDRESS } from "@/lib/avatarpro/demoMode";

const AVATAR_ID_KEY = "singulai_vault_avatar_id";

function randomId(size: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789";
  let out = "";

  for (let i = 0; i < size; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }

  return out;
}

/** Lê o endereço de carteira da sessão do login (localStorage). */
function getSessionWalletAddress(): string {
  try {
    const raw = localStorage.getItem("singulai_wallet");
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (typeof parsed.address === "string" && parsed.address.length > 0) {
        return parsed.address;
      }
    }
  } catch {
    // fallthrough
  }
  return DEMO_WALLET_ADDRESS;
}

/** Retorna o avatarId persistido na sessão ou cria um novo. */
function getOrCreateAvatarId(): string {
  try {
    const stored = localStorage.getItem(AVATAR_ID_KEY);
    if (stored && stored.length > 0) return stored;
  } catch {
    // fallthrough
  }
  const id = `avatar-${randomId(10)}`;
  try {
    localStorage.setItem(AVATAR_ID_KEY, id);
  } catch {
    // fallthrough
  }
  return id;
}

const CARD: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.16)",
  borderRadius: 12,
  padding: 16,
  background: "rgba(0,0,0,0.24)",
};

const BUTTON: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.22)",
  borderRadius: 8,
  padding: "8px 10px",
  background: "rgba(255,255,255,0.04)",
  color: "inherit",
  cursor: "pointer",
};

export default function VaultMvpPanel() {
  const adapter = useMemo(() => new RealSolanaAdapter(), []);
  const [records, setRecords] = useState<AuditRecord[]>(() => loadAuditRecords());
  const [walletAddress] = useState<string>(getSessionWalletAddress);
  const [avatarId] = useState<string>(getOrCreateAvatarId);
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState("Ready to execute paid services.");

  const summary = useMemo(() => getPublicAuditSummary(records), [records]);

  async function handleExecute(serviceType: ServiceType) {
    setIsRunning(true);

    try {
      const result = await executePaidService({
        walletAddress,
        avatarId,
        serviceType,
        currentBalance: summary.balance,
        totalSpent: summary.totalSpent,
        adapter: adapter,
      });

      setRecords((current) => [result.record, ...current]);
      setMessage(`Executed ${serviceType} for ${SERVICE_CATALOG[serviceType].cost} SGL.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Execution failed.");
    } finally {
      setIsRunning(false);
    }
  }

  async function copyValue(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(`${label} copied.`);
    } catch {
      setMessage(`Unable to copy ${label}.`);
    }
  }

  const latest = records[0];

  return (
    <div style={{ height: "100dvh", overflowY: "auto", background: "#0b0b0b" }}>

    {/* Barra de navegação */}
    <nav style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(0,0,0,0.5)", position: "sticky", top: 0, zIndex: 10,
    }}>
      <Link to="/dashboard" style={{
        display: "flex", alignItems: "center", gap: 6,
        color: "rgba(255,255,255,0.65)", fontSize: 12, textDecoration: "none",
        letterSpacing: "0.06em",
      }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={13} height={13}>
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Dashboard
      </Link>
      <span style={{ fontSize: 11, letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>
        AvatarPro Vault
      </span>
      <Link to="/audit" style={{
        display: "flex", alignItems: "center", gap: 6,
        color: "#8fd3ff", fontSize: 12, textDecoration: "none",
        letterSpacing: "0.06em",
      }}>
        Auditoria
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={13} height={13}>
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      </Link>
    </nav>

    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 16px", color: "#f7f5ef" }}>
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>SingulAI AvatarPro Vault</h1>
      <p style={{ opacity: 0.9, marginBottom: 20 }}>Operational MVP for paid execution services with Solana demo audit proofs.</p>

      <section style={{ ...CARD, marginBottom: 16 }}>
        <p>SOL pays Solana network fees.</p>
        <p>SGL is a SingulAI demo execution credit.</p>
        <p>SGL has no financial value in this MVP and is not an investment token.</p>
        <p>Private content is never stored on-chain. Only hashes, proofs and execution states are public.</p>
      </section>

      <section style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginBottom: 20 }}>
        <div style={CARD}>
          <h3 style={{ marginTop: 0 }}>Wallet</h3>
          <p style={{ wordBreak: "break-all", fontSize: 12, fontFamily: "monospace", opacity: 0.85 }}>
            {walletAddress.slice(0, 10)}…{walletAddress.slice(-8)}
          </p>
          <p style={{ fontSize: 10, opacity: 0.5, marginBottom: 8, wordBreak: "break-all" }}>{walletAddress}</p>
          <button style={BUTTON} onClick={() => copyValue(walletAddress, "wallet")}>Copy wallet</button>
        </div>
        <div style={CARD}>
          <h3 style={{ marginTop: 0 }}>Avatar ID</h3>
          <p>{avatarId}</p>
        </div>
        <div style={CARD}>
          <h3 style={{ marginTop: 0 }}>SGL Balance</h3>
          <p>{summary.balance.toLocaleString()} SGL</p>
        </div>
        <div style={CARD}>
          <h3 style={{ marginTop: 0 }}>Spent / Actions</h3>
          <p>{summary.totalSpent.toLocaleString()} SGL</p>
          <p>{summary.totalActions} actions</p>
        </div>
      </section>

      <section style={{ ...CARD, marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Paid Services</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
          {SERVICE_TYPES.map((serviceType) => (
            <button key={serviceType} disabled={isRunning} style={BUTTON} onClick={() => handleExecute(serviceType)}>
              {serviceType} ({SERVICE_CATALOG[serviceType].cost} SGL)
            </button>
          ))}
        </div>
      </section>

      {latest ? (
        <section style={{ ...CARD, marginBottom: 16 }}>
          <h2 style={{ marginTop: 0 }}>Latest Execution</h2>
          <p>Service: {latest.serviceType}</p>
          <p>txSignature: {latest.txSignature}</p>
          <p>payloadHash: {latest.payloadHash}</p>
          <p>snapshotHash: {latest.snapshotHash}</p>
          <p>explorerUrl: {latest.explorerUrl}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button style={BUTTON} onClick={() => copyValue(latest.txSignature, "txSignature")}>Copy txSignature</button>
            <button style={BUTTON} onClick={() => copyValue(latest.payloadHash, "payloadHash")}>Copy payloadHash</button>
            <button style={BUTTON} onClick={() => copyValue(latest.snapshotHash, "snapshotHash")}>Copy snapshotHash</button>
            <button style={BUTTON} onClick={() => copyValue(latest.explorerUrl, "explorerUrl")}>Copy explorerUrl</button>
          </div>
        </section>
      ) : null}

      <section style={CARD}>
        <h2 style={{ marginTop: 0 }}>Audit Records (localStorage)</h2>
        {records.length === 0 ? <p>No records yet.</p> : null}
        <div style={{ display: "grid", gap: 10 }}>
          {records.map((record, index) => (
            <article key={`${record.txSignature}-${index}`} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: 12 }}>
              <p style={{ margin: "0 0 6px" }}><strong>{record.serviceType}</strong> - {record.cost} SGL</p>
              <p style={{ margin: "0 0 6px" }}>Balance: {record.previousBalance} to {record.newBalance}</p>
              <p style={{ margin: "0 0 6px" }}>Status: {record.status}</p>
              <p style={{ margin: "0 0 6px", wordBreak: "break-all" }}>tx: {record.txSignature}</p>
              <a href={record.explorerUrl} target="_blank" rel="noreferrer" style={{ color: "#8fd3ff" }}>Open explorer</a>
            </article>
          ))}
        </div>
      </section>

      <p style={{ marginTop: 16, opacity: 0.9 }}>{message}</p>
      <p style={{ marginTop: 6, opacity: 0.8 }}>Initial SGL balance for this MVP is fixed at {INITIAL_SGL_BALANCE.toLocaleString()}.</p>
    </main>
    </div>
  );
}
