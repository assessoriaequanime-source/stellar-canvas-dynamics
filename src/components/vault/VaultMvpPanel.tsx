import { useMemo, useState, useEffect, type CSSProperties } from "react";
import { getAuditEventsByWallet } from "@/lib/avatarpro/auditApiClient";
import { debitSglForService, getSglBalance } from "@/lib/avatarpro/sglApiClient";
import { provisionWallet } from "@/lib/avatarpro/avatarProApiClient";
import { INITIAL_SGL_BALANCE, SERVICE_CATALOG, SERVICE_TYPES, type ServiceType } from "@/lib/sgl/services";

type VaultAuditEvent = Record<string, unknown>;

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
  const [records, setRecords] = useState<VaultAuditEvent[]>([]);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [tokenAccount, setTokenAccount] = useState<string>("");
  const [mintAddress, setMintAddress] = useState<string>("");
  const [sglBalance, setSglBalance] = useState<number>(INITIAL_SGL_BALANCE);
  const [isRunning, setIsRunning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [message, setMessage] = useState("Ready to execute paid services.");

  const summary = useMemo(() => {
    const totalSpent = records.reduce((sum, item) => sum + Number(item.cost || 0), 0);
    return {
      balance: sglBalance,
      totalSpent,
      totalActions: records.length,
    };
  }, [records, sglBalance]);

  function randomAvatarId(): string {
    return `avatar-${Math.random().toString(36).slice(2, 10)}`;
  }

  function payloadHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
      hash = (hash << 5) - hash + input.charCodeAt(i);
      hash |= 0;
    }
    return `hash-${Math.abs(hash).toString(16)}`;
  }

  async function refreshWalletState(address: string) {
    const [balanceData, auditData] = await Promise.all([
      getSglBalance(address),
      getAuditEventsByWallet(address),
    ]);

    setSglBalance(Number(balanceData.sglBalance || balanceData.balance || 0));
    setTokenAccount((balanceData.tokenAccount || "").toString());
    setRecords(Array.isArray(auditData) ? auditData : []);
  }

  async function connectWallet() {
    setIsConnecting(true);
    try {
      const provider = (window as Window & { solana?: { connect: () => Promise<{ publicKey: { toString: () => string } }> } }).solana;
      if (!provider) {
        throw new Error("Phantom/Solflare wallet not found in browser.");
      }

      const response = await provider.connect();
      const publicKey = response.publicKey.toString();
      setWalletAddress(publicKey);

      const provision = await provisionWallet({ walletAddress: publicKey });
      setMintAddress((provision.sglMintAddress || "").toString());
      setTokenAccount((provision.tokenAccount || "").toString());
      setSglBalance(Number(provision.sglBalance || 0));

      await refreshWalletState(publicKey);

      setMessage(
        `Solana Devnet wallet connected. proofTx=${(provision.proofTxSignature || "").toString()} explorer=${(provision.explorerUrl || "").toString()}`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to connect wallet.");
    } finally {
      setIsConnecting(false);
    }
  }

  useEffect(() => {
    if (!walletAddress) return;
    void refreshWalletState(walletAddress);
  }, [walletAddress]);

  async function handleExecute(serviceType: ServiceType) {
    if (!walletAddress) {
      setMessage("Connect Solana Wallet before running services.");
      return;
    }

    setIsRunning(true);

    try {
      const hash = payloadHash(`${walletAddress}:${serviceType}:${Date.now()}`);
      const result = await debitSglForService({
        walletAddress,
        serviceType,
        cost: SERVICE_CATALOG[serviceType].cost,
        avatarId: randomAvatarId(),
        payloadHash: hash,
      });

      await refreshWalletState(walletAddress);

      const status = (result.debitStatus || "pending_wallet_signature").toString();
      const txSignature = (result.txSignature || result.proofTxSignature || "").toString();
      const explorerUrl = (result.explorerUrl || "").toString();

      setMessage(
        `Solana Devnet proof registered. txSignature=${txSignature} explorer=${explorerUrl} payloadHash=${hash} debitStatus=${status}`,
      );
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

  const latest = records[0] || null;

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 16px", color: "#f7f5ef" }}>
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>SingulAI AvatarPro Vault</h1>
      <p style={{ opacity: 0.9, marginBottom: 20 }}>Operational MVP for paid execution services with real Solana Devnet audit proofs.</p>

      <section style={{ ...CARD, marginBottom: 16 }}>
        <p>SOL pays Solana network fees.</p>
        <p>SGL is a SingulAI demo execution credit.</p>
        <p>SGL has no financial value in this MVP and is not an investment token.</p>
        <p>Private content is never stored on-chain. Only hashes, proofs and execution states are public.</p>
      </section>

      <section style={{ marginBottom: 16 }}>
        <button style={BUTTON} onClick={connectWallet} disabled={isConnecting}>
          {isConnecting ? "Connecting..." : "Connect Solana Wallet"}
        </button>
      </section>

      <section style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginBottom: 20 }}>
        <div style={CARD}>
          <h3 style={{ marginTop: 0 }}>Wallet</h3>
          <p style={{ wordBreak: "break-all" }}>{walletAddress || "Not connected"}</p>
          <button style={BUTTON} onClick={() => copyValue(walletAddress, "wallet")}>Copy wallet</button>
        </div>
        <div style={CARD}>
          <h3 style={{ marginTop: 0 }}>SGL Mint</h3>
          <p style={{ wordBreak: "break-all" }}>{mintAddress || "Not provisioned"}</p>
        </div>
        <div style={CARD}>
          <h3 style={{ marginTop: 0 }}>Token Account</h3>
          <p style={{ wordBreak: "break-all" }}>{tokenAccount || "Not provisioned"}</p>
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
          <p>Service: {(latest.serviceType || "unknown").toString()}</p>
          <p>debitStatus: {(latest.debitStatus || "pending_wallet_signature").toString()}</p>
          <p>txSignature: {(latest.txSignature || "").toString()}</p>
          <p>payloadHash: {(latest.payloadHash || "").toString()}</p>
          <p>explorerUrl: {(latest.explorerUrl || "").toString()}</p>
          {(latest.debitStatus || "").toString() === "pending_wallet_signature" ? (
            <p>Proof registered on Solana Devnet. SGL debit requires wallet signature.</p>
          ) : null}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button style={BUTTON} onClick={() => copyValue((latest.txSignature || "").toString(), "txSignature")}>Copy txSignature</button>
            <button style={BUTTON} onClick={() => copyValue((latest.payloadHash || "").toString(), "payloadHash")}>Copy payloadHash</button>
            <button style={BUTTON} onClick={() => copyValue((latest.explorerUrl || "").toString(), "explorerUrl")}>Copy explorerUrl</button>
          </div>
        </section>
      ) : null}

      <section style={CARD}>
        <h2 style={{ marginTop: 0 }}>Audit Records (Solana Devnet proofs)</h2>
        {records.length === 0 ? <p>No records yet.</p> : null}
        <div style={{ display: "grid", gap: 10 }}>
          {records.map((record, index) => (
            <article key={`${(record.txSignature || "tx").toString()}-${index}`} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: 12 }}>
              <p style={{ margin: "0 0 6px" }}><strong>{(record.serviceType || record.eventType || "event").toString()}</strong> - {Number(record.cost || 0)} SGL</p>
              <p style={{ margin: "0 0 6px" }}>Status: {(record.debitStatus || "pending_wallet_signature").toString()}</p>
              <p style={{ margin: "0 0 6px", wordBreak: "break-all" }}>tx: {(record.txSignature || "").toString()}</p>
              <a href={(record.explorerUrl || "").toString()} target="_blank" rel="noreferrer" style={{ color: "#8fd3ff" }}>Open explorer</a>
            </article>
          ))}
        </div>
      </section>

      <p style={{ marginTop: 16, opacity: 0.9 }}>{message}</p>
      <p style={{ marginTop: 6, opacity: 0.8 }}>Initial SGL balance for this MVP is fixed at {INITIAL_SGL_BALANCE.toLocaleString()}.</p>
    </main>
  );
}
