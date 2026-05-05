import { useMemo, useState, type CSSProperties } from "react";
import { getAuditEventsByWallet } from "@/lib/avatarpro/auditApiClient";
import { INITIAL_SGL_BALANCE } from "@/lib/sgl/services";
import { getSglBalance } from "@/lib/avatarpro/sglApiClient";

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

type AuditRecord = Record<string, unknown>;

function copyableFields(record: AuditRecord) {
  return [
    { label: "walletAddress", value: (record.walletAddress || "").toString() },
    { label: "avatarId", value: (record.avatarId || "").toString() },
    { label: "eventType", value: (record.eventType || "").toString() },
    { label: "serviceType", value: (record.serviceType || "").toString() },
    { label: "cost", value: String(record.cost || "") },
    { label: "payloadHash", value: (record.payloadHash || "").toString() },
    { label: "createdAt", value: (record.createdAt || "").toString() },
    { label: "network", value: (record.network || "").toString() },
    { label: "debitStatus", value: (record.debitStatus || "").toString() },
    { label: "txSignature", value: (record.txSignature || "").toString() },
    { label: "explorerUrl", value: (record.explorerUrl || "").toString() },
  ];
}

export default function AuditReadOnlyPanel() {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [walletAddress, setWalletAddress] = useState("");
  const [balance, setBalance] = useState<number>(INITIAL_SGL_BALANCE);
  const [message, setMessage] = useState("Read-only mode loaded.");
  const summary = useMemo(() => {
    const totalSpent = records.reduce((sum, item) => sum + Number(item.cost || 0), 0);
    return {
      balance,
      totalSpent,
      totalActions: records.length,
    };
  }, [records, balance]);
  const latest = records[0];

  async function connectWallet() {
    try {
      const provider = (window as Window & { solana?: { connect: () => Promise<{ publicKey: { toString: () => string } }> } }).solana;
      if (!provider) {
        throw new Error("Phantom/Solflare wallet not found in browser.");
      }

      const response = await provider.connect();
      const address = response.publicKey.toString();
      setWalletAddress(address);

      const [events, balanceData] = await Promise.all([
        getAuditEventsByWallet(address),
        getSglBalance(address),
      ]);

      setRecords(Array.isArray(events) ? events : []);
      setBalance(Number(balanceData.sglBalance || balanceData.balance || 0));
      setMessage("Audit trail loaded from Solana Devnet proof events.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load audit trail.");
    }
  }

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

      <section style={{ marginBottom: 16 }}>
        <button style={BUTTON} onClick={connectWallet}>Connect Solana Wallet</button>
      </section>

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
        <div style={CARD}><h3 style={{ marginTop: 0 }}>Wallet</h3><p style={{ wordBreak: "break-all" }}>{walletAddress || (latest?.walletAddress || "No wallet found").toString()}</p></div>
      </section>

      <section style={CARD}>
        <h2 style={{ marginTop: 0 }}>Public Metadata</h2>
        {records.length === 0 ? <p>No audit records found. Expected initial balance: {INITIAL_SGL_BALANCE.toLocaleString()} SGL.</p> : null}
        <div style={{ display: "grid", gap: 10 }}>
          {records.map((record, idx) => {
            const txSignature = (record.txSignature || "").toString();
            const mockProof = txSignature.startsWith("MOCK-");
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
