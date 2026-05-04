import { useMemo, useState, type CSSProperties } from "react";
import { getPublicAuditSummary, loadAuditRecords, type AuditRecord } from "@/lib/sgl/execution";
import { INITIAL_SGL_BALANCE } from "@/lib/sgl/services";

const CARD: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.16)",
  borderRadius: 12,
  padding: 16,
  background: "rgba(0,0,0,0.24)",
};

const BUTTON: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.22)",
  borderRadius: 8,
  padding: "6px 10px",
  background: "rgba(255,255,255,0.04)",
  color: "inherit",
  cursor: "pointer",
};

function copyableFields(record: AuditRecord) {
  return [
    { label: "walletAddress", value: record.walletAddress },
    { label: "avatarId", value: record.avatarId },
    { label: "serviceType", value: record.serviceType },
    { label: "cost", value: String(record.cost) },
    { label: "previousBalance", value: String(record.previousBalance) },
    { label: "newBalance", value: String(record.newBalance) },
    { label: "payloadHash", value: record.payloadHash },
    { label: "snapshotHash", value: record.snapshotHash },
    { label: "timestamp", value: record.timestamp },
    { label: "status", value: record.status },
    { label: "txSignature", value: record.txSignature },
    { label: "explorerUrl", value: record.explorerUrl },
  ];
}

export default function AuditReadOnlyPanel() {
  const [records] = useState<AuditRecord[]>(() => loadAuditRecords());
  const [message, setMessage] = useState("Read-only mode loaded.");
  const summary = useMemo(() => getPublicAuditSummary(records), [records]);
  const latest = records[0];

  async function copyValue(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(`${label} copied.`);
    } catch {
      setMessage(`Unable to copy ${label}.`);
    }
  }

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 16px", color: "#f7f5ef" }}>
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>Audit Read-Only Panel</h1>
      <p style={{ opacity: 0.9, marginBottom: 20 }}>This panel is read-only and never executes services or changes SGL state.</p>

      <section style={{ ...CARD, marginBottom: 16 }}>
        <p>SOL pays Solana network fees.</p>
        <p>SGL is a SingulAI demo execution credit.</p>
        <p>SGL has no financial value in this MVP and is not an investment token.</p>
        <p>Private content is never stored on-chain. Only hashes, proofs and execution states are public.</p>
      </section>

      <section style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginBottom: 16 }}>
        <div style={CARD}><h3 style={{ marginTop: 0 }}>SGL balance</h3><p>{summary.balance.toLocaleString()} SGL</p></div>
        <div style={CARD}><h3 style={{ marginTop: 0 }}>Total spent</h3><p>{summary.totalSpent.toLocaleString()} SGL</p></div>
        <div style={CARD}><h3 style={{ marginTop: 0 }}>Total actions</h3><p>{summary.totalActions}</p></div>
        <div style={CARD}><h3 style={{ marginTop: 0 }}>Wallet</h3><p style={{ wordBreak: "break-all" }}>{latest?.walletAddress ?? "No wallet found"}</p></div>
      </section>

      <section style={CARD}>
        <h2 style={{ marginTop: 0 }}>Public Metadata</h2>
        {records.length === 0 ? <p>No audit records found. Expected initial balance: {INITIAL_SGL_BALANCE.toLocaleString()} SGL.</p> : null}
        <div style={{ display: "grid", gap: 10 }}>
          {records.map((record, idx) => {
            const mockProof = record.txSignature.startsWith("MOCK-");
            const devnetTx = !mockProof;

            return (
              <article key={`${record.txSignature}-${idx}`} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: 12 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  {mockProof ? <span style={{ ...BUTTON, cursor: "default" }}>Mock audit proof</span> : null}
                  {devnetTx ? <span style={{ ...BUTTON, cursor: "default" }}>Devnet transaction</span> : null}
                </div>

                {copyableFields(record).map((field) => (
                  <div key={field.label} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center", marginBottom: 6 }}>
                    <div>
                      <strong>{field.label}:</strong> <span style={{ wordBreak: "break-all" }}>{field.value}</span>
                    </div>
                    <button style={BUTTON} onClick={() => copyValue(field.label, field.value)}>Copy</button>
                  </div>
                ))}
              </article>
            );
          })}
        </div>
      </section>

      <p style={{ marginTop: 14, opacity: 0.9 }}>{message}</p>
    </main>
  );
}
