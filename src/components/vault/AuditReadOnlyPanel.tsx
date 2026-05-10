import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import {
  consumeJudgeAccessInvitation,
  getAuditEventsByWallet,
  getJudgeAuditEvents,
} from "@/lib/avatarpro/auditApiClient";
import { INITIAL_SGL_BALANCE } from "@/lib/sgl/services";
import { getSglBalance } from "@/lib/avatarpro/sglApiClient";
const JUDGE_ACCESS_TOKEN_KEY = "singulai_judge_access_token";

const CARD: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 12,
  padding: 20,
  background: "rgba(0,0,0,0.28)",
  backdropFilter: "blur(8px)",
};

const BADGE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
};

const BTN: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: 8,
  padding: "7px 14px",
  background: "rgba(255,255,255,0.05)",
  color: "inherit",
  cursor: "pointer",
  fontSize: 12,
  letterSpacing: "0.06em",
};

const BTN_PRIMARY: CSSProperties = {
  ...BTN,
  background: "rgba(143,211,255,0.12)",
  border: "1px solid rgba(143,211,255,0.32)",
  color: "#8fd3ff",
};

type AuditRecord = Record<string, unknown>;

function hashOnlyFields(record: AuditRecord) {
  return [
    { label: "payloadHash", value: (record.payloadHash || "").toString() },
    { label: "txSignature", value: (record.txSignature || "").toString() },
  ];
}

function getSolscanTxUrl(txSignature: string): string {
  return `https://solscan.io/tx/${txSignature}?cluster=devnet`;
}

// ── Gate de senha para juízes ──────────────────────────────────────────────
function JudgeGate({
  capsuleId,
  inviteToken,
  onUnlock,
}: {
  capsuleId: string;
  inviteToken: string;
  onUnlock: (payload: { judgeAccessToken: string; temporaryWalletAddress: string }) => void;
}) {
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessCode.trim()) {
      setError(true);
      setTimeout(() => setError(false), 1800);
      return;
    }

    setLoading(true);
    void consumeJudgeAccessInvitation({
      capsuleId,
      inviteToken,
      accessCode: accessCode.trim().toUpperCase(),
    })
      .then((result) => {
        onUnlock({
          judgeAccessToken: result.judgeAccessToken,
          temporaryWalletAddress: result.temporaryWalletAddress,
        });
      })
      .catch(() => {
        setError(true);
        setAccessCode("");
      })
      .finally(() => {
        setLoading(false);
      });

    if (error) {
      setTimeout(() => setError(false), 1800);
    }
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #06060a 0%, #0c0c18 100%)",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 400,
          width: "100%",
          border: "1px solid rgba(143,211,255,0.22)",
          borderRadius: 20,
          background: "rgba(8,8,16,0.92)",
          backdropFilter: "blur(20px)",
          padding: "40px 32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          boxShadow: "0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(143,211,255,0.06)",
        }}
      >
        {/* Logo SingulAI */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #8fd3ff22, #8fd3ff11)",
              border: "1px solid rgba(143,211,255,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              fontSize: 24,
            }}
          >
            Σ
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              margin: 0,
              letterSpacing: "0.04em",
              color: "#f7f5ef",
            }}
          >
            SingulAI Audit Panel
          </h1>
          <p
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.45)",
              marginTop: 6,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Solana Frontier Hackathon · Judge Access
          </p>
        </div>

        <div
          style={{
            ...CARD,
            width: "100%",
            textAlign: "center",
            padding: "12px 16px",
            background: "rgba(143,211,255,0.06)",
            border: "1px solid rgba(143,211,255,0.18)",
          }}
        >
          <p style={{ margin: 0, fontSize: 11, color: "rgba(143,211,255,0.8)", lineHeight: 1.6 }}>
            This panel displays on-chain proofs of SGL transactions on Solana Devnet.
            <br />
            Access is exclusive to hackathon judges.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}
        >
          <label
            style={{
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.4)",
            }}
          >
            Senha de Acesso
          </label>
          <input
            ref={inputRef}
            type="text"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
            placeholder="Enter the code you received"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "12px 16px",
              borderRadius: 10,
              border: error ? "1px solid rgba(255,80,80,0.6)" : "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.04)",
              color: "#f7f5ef",
              fontSize: 14,
              outline: "none",
              transition: "border 0.2s",
            }}
          />
          {error && (
            <p
              style={{
                margin: 0,
                fontSize: 11,
                color: "rgba(255,100,100,0.9)",
                textAlign: "center",
              }}
            >
              Invalid code, invite expired, or already used.
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              ...BTN_PRIMARY,
              padding: "12px 20px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              textAlign: "center",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Validating invite..." : "Open Audit Panel →"}
          </button>
        </form>

        <p
          style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", textAlign: "center", margin: 0 }}
        >
          Read-only panel · No transactions are executed here
        </p>
      </div>
    </div>
  );
}

// ── Painel principal ───────────────────────────────────────────────────────
export default function AuditReadOnlyPanel() {
  // Sobrescreve o overflow:hidden global para permitir scroll nesta página standalone
  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "auto";
    document.body.style.overflow = "auto";
    return () => {
      document.documentElement.style.overflow = prev;
      document.body.style.overflow = "";
    };
  }, []);

  const [unlocked, setUnlocked] = useState(() => {
    return Boolean(sessionStorage.getItem(JUDGE_ACCESS_TOKEN_KEY));
  });
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [walletAddress, setWalletAddress] = useState("");
  const [balance, setBalance] = useState<number>(INITIAL_SGL_BALANCE);
  const [mintAddress, setMintAddress] = useState<string>("");
  const [judgeWalletAddress, setJudgeWalletAddress] = useState("");
  const [message, setMessage] = useState("Loading audit…");
  const [copied, setCopied] = useState<string | null>(null);
  const [judgeAccessToken, setJudgeAccessToken] = useState(() => {
    return sessionStorage.getItem(JUDGE_ACCESS_TOKEN_KEY) || "";
  });
  const [inviteParams] = useState(() => {
    if (typeof window === "undefined") {
      return { capsuleId: "", inviteToken: "" };
    }

    const params = new URLSearchParams(window.location.search);
    return {
      capsuleId: params.get("cid") || "",
      inviteToken: params.get("jt") || "",
    };
  });

  function handleUnlock(payload: { judgeAccessToken: string; temporaryWalletAddress: string }) {
    sessionStorage.setItem(JUDGE_ACCESS_TOKEN_KEY, payload.judgeAccessToken);
    setJudgeAccessToken(payload.judgeAccessToken);
    setJudgeWalletAddress(payload.temporaryWalletAddress);
    setWalletAddress(payload.temporaryWalletAddress);

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("jt");
      window.history.replaceState({}, "", url.toString());
    }

    setUnlocked(true);
  }

  // Auto-carrega ao desbloquear
  useEffect(() => {
    if (!unlocked || !judgeAccessToken) return;

    async function autoLoad() {
      try {
        const judgePayload = await getJudgeAuditEvents(judgeAccessToken);
        const judgeInfo = judgePayload.judge || {};
        const events = Array.isArray(judgePayload.events) ? judgePayload.events : [];
        const judgeWallet = String(judgeInfo.temporaryWalletAddress || "");

        setJudgeWalletAddress(judgeWallet);
        setWalletAddress(judgeWallet);
        setRecords(events);

        if (judgeWallet) {
          const balanceData = await getSglBalance(judgeWallet);
          setBalance(Number(balanceData.sglBalance || INITIAL_SGL_BALANCE));
          const bd1 = balanceData as Record<string, unknown>;
          if (bd1.sglMintAddress) setMintAddress(String(bd1.sglMintAddress));
        }

        setMessage(`${events.length} event(s) verified on Solana Devnet.`);
      } catch {
        setMessage("Invalid invite: expired or lacking audit permissions.");
      }
    }

    void autoLoad();
  }, [unlocked, judgeAccessToken]);

  const summary = useMemo(
    () => ({
      balance,
      totalSpent: records.reduce((sum, r) => sum + Number(r.cost || 0), 0),
      totalActions: records.length,
      devnetTxs: records.filter((r) => {
        const sig = String(r.txSignature || "");
        return !sig.startsWith("MOCK-") && !sig.startsWith("DEMO-CAPS-");
      }).length,
      capsules: records.filter((r) => String(r.capsuleId || "").startsWith("CAPS-")).length,
    }),
    [records, balance],
  );

  async function reload() {
    setMessage("Reloading…");
    if (!judgeAccessToken) {
      setMessage("Judge session missing.");
      return;
    }

    try {
      const judgePayload = await getJudgeAuditEvents(judgeAccessToken);
      const judgeInfo = judgePayload.judge || {};
      const addr = String(judgeInfo.temporaryWalletAddress || walletAddress || "");

      if (!addr) {
        setMessage("No wallet.");
        return;
      }

      setJudgeWalletAddress(addr);
      setWalletAddress(addr);
      const [events, balanceData] = await Promise.all([
        getAuditEventsByWallet(addr),
        getSglBalance(addr),
      ]);
      setRecords(events);
      setBalance(Number(balanceData.sglBalance || INITIAL_SGL_BALANCE));
      setMessage(`${events.length} events updated.`);
      const bd2 = balanceData as Record<string, unknown>;
      if (bd2.sglMintAddress) setMintAddress(String(bd2.sglMintAddress));
    } catch {
      setMessage("Error reloading.");
    }
  }

  async function copyValue(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* silencioso */
    }
  }

  if (!unlocked) {
    if (!inviteParams.capsuleId || !inviteParams.inviteToken) {
      return (
        <div
          style={{
            minHeight: "100dvh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #06060a 0%, #0c0c18 100%)",
            color: "#f7f5ef",
            padding: 24,
            textAlign: "center",
          }}
        >
          <div style={{ ...CARD, maxWidth: 520 }}>
            <h1 style={{ margin: "0 0 10px", fontSize: 22 }}>Judge Access Only</h1>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.62)", lineHeight: 1.6 }}>
              This panel can only be opened with an audit capsule invite. Request the access link
              and unique code from the organizer.
            </p>
          </div>
        </div>
      );
    }

    return (
      <JudgeGate
        capsuleId={inviteParams.capsuleId}
        inviteToken={inviteParams.inviteToken}
        onUnlock={handleUnlock}
      />
    );
  }

  const accentBlue = "rgba(143,211,255,0.9)";

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(135deg, #06060a 0%, #0c0c18 100%)",
        color: "#f7f5ef",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Header especial juízes */}
      <header
        style={{
          borderBottom: "1px solid rgba(143,211,255,0.12)",
          background: "rgba(8,8,16,0.8)",
          backdropFilter: "blur(16px)",
          position: "sticky",
          top: 0,
          zIndex: 10,
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 56,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.02em", color: accentBlue }}
          >
            Σ SingulAI
          </span>
          <span
            style={{
              ...BADGE,
              background: "rgba(143,211,255,0.12)",
              border: "1px solid rgba(143,211,255,0.28)",
              color: accentBlue,
            }}
          >
            ● Audit Panel
          </span>
          <span
            style={{
              ...BADGE,
              background: "rgba(255,200,80,0.10)",
              border: "1px solid rgba(255,200,80,0.25)",
              color: "rgba(255,200,80,0.9)",
            }}
          >
            Solana Frontier Hackathon
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button style={BTN} onClick={reload}>
            ↻ Refresh
          </button>
          <Link
            to="/dashboard"
            style={{
              ...BTN,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px" }}>
        {/* Título e missão */}
        <section style={{ marginBottom: 32 }}>
          <h1
            style={{ fontSize: 28, fontWeight: 900, margin: "0 0 8px", letterSpacing: "-0.02em" }}
          >
            Audit Panel — On-Chain Proofs
          </h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", margin: 0 }}>
            Read-only · SGL transactions recorded as Memo proofs on Solana Devnet · Wallet:{" "}
            <code style={{ fontSize: 12, color: accentBlue }}>
              {walletAddress ? `${walletAddress.slice(0, 10)}…${walletAddress.slice(-6)}` : "—"}
            </code>
          </p>
          {judgeWalletAddress && (
            <p style={{ fontSize: 11, marginTop: 6, color: "rgba(143,211,255,0.78)" }}>
              Judge session wallet: <code>{judgeWalletAddress}</code>
            </p>
          )}
          <p
            style={{
              fontSize: 12,
              marginTop: 8,
              color: "rgba(255,200,80,0.8)",
              fontStyle: "italic",
            }}
          >
            {message}
          </p>
        </section>

        {/* Cards de resumo */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 14,
            marginBottom: 28,
          }}
        >
          {[
            {
              label: "SGL Balance",
              value: `${summary.balance.toLocaleString()} SGL`,
              color: accentBlue,
            },
            {
              label: "SGL Gasto",
              value: `${summary.totalSpent.toLocaleString()} SGL`,
              color: "rgba(255,200,80,0.9)",
            },
            { label: "Total de Ações", value: String(summary.totalActions), color: "#fff" },
            {
              label: "Txs Devnet Reais",
              value: String(summary.devnetTxs),
              color: "rgba(80,255,160,0.9)",
            },
            {
              label: "Capsules Seladas",
              value: String(summary.capsules),
              color: "rgba(143,211,255,0.95)",
            },
          ].map((item) => (
            <div key={item.label} style={{ ...CARD, textAlign: "center" }}>
              <p
                style={{
                  margin: "0 0 6px",
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.4)",
                }}
              >
                {item.label}
              </p>
              <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: item.color }}>
                {item.value}
              </p>
            </div>
          ))}
        </section>

        {/* Nota legal + links do token */}
        <section
          style={{
            ...CARD,
            marginBottom: 28,
            background: "rgba(143,211,255,0.05)",
            border: "1px solid rgba(143,211,255,0.14)",
          }}
        >
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.7, color: "rgba(255,255,255,0.6)" }}>
            <strong style={{ color: accentBlue }}>Para os juízes:</strong> O SGL é um crédito de
            execução demo da plataforma SingulAI. Não tem valor financeiro e não é um token de
            investimento. Cada interação com o AvatarPro debita SGL e registra um Memo proof na
            Solana Devnet. Conteúdo privado nunca é armazenado on-chain — apenas hashes, provas e
            estados de execução são públicos e verificáveis no explorer abaixo.
          </p>

          {mintAddress && (
            <div
              style={{
                marginTop: 16,
                padding: "12px 14px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(143,211,255,0.12)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.35)",
                }}
              >
                SGL Token — Solana Devnet
              </p>
              <code
                style={{ fontSize: 11, wordBreak: "break-all", color: "rgba(255,255,255,0.7)" }}
              >
                {mintAddress}
              </code>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
                <a
                  href={`https://solscan.io/token/${mintAddress}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    ...BADGE,
                    background: "rgba(143,211,255,0.10)",
                    border: "1px solid rgba(143,211,255,0.28)",
                    color: accentBlue,
                    textDecoration: "none",
                  }}
                >
                  Ver no Solscan →
                </a>
                <a
                  href={`https://explorer.solana.com/address/${mintAddress}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    ...BADGE,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    color: "rgba(255,255,255,0.6)",
                    textDecoration: "none",
                  }}
                >
                  Ver no Explorer →
                </a>
              </div>
            </div>
          )}
        </section>

        {/* Audit records */}
        <section style={CARD}>
          <h2 style={{ margin: "0 0 16px", fontSize: 16, letterSpacing: "0.02em" }}>
            Proof Records — Hashes and Solscan Validation
          </h2>

          {records.length === 0 ? (
            <div
              style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.35)" }}
            >
              <p style={{ fontSize: 32, margin: "0 0 8px" }}>∅</p>
              <p style={{ margin: 0, fontSize: 13 }}>No events recorded yet.</p>
              <p style={{ margin: "4px 0 0", fontSize: 11 }}>
                Interact with the Vault to generate auditable transactions.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {records.map((record, idx) => {
                const txSig = String(record.txSignature || "");
                const isMock = txSig.startsWith("MOCK-") || txSig.startsWith("DEMO-CAPS-");
                const solscanUrl = txSig && !isMock ? getSolscanTxUrl(txSig) : "";
                const capsuleId = String(record.capsuleId || "");
                const isCapsule = capsuleId.startsWith("CAPS-");

                return (
                  <article
                    key={`${txSig}-${idx}`}
                    style={{
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 12,
                      padding: "16px 18px",
                      background: "rgba(255,255,255,0.02)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        marginBottom: 12,
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)" }}
                      >
                        #{records.length - idx}
                      </span>
                      {isCapsule && (
                        <span
                          style={{
                            ...BADGE,
                            background: "rgba(143,211,255,0.10)",
                            border: "1px solid rgba(143,211,255,0.22)",
                            color: accentBlue,
                          }}
                        >
                          Capsule
                        </span>
                      )}
                      <span
                        style={{
                          ...BADGE,
                          ...(isMock
                            ? {
                                background: "rgba(255,200,80,0.08)",
                                border: "1px solid rgba(255,200,80,0.2)",
                                color: "rgba(255,200,80,0.8)",
                              }
                            : {
                                background: "rgba(80,255,160,0.08)",
                                border: "1px solid rgba(80,255,160,0.2)",
                                color: "rgba(80,255,160,0.9)",
                              }),
                        }}
                      >
                        {isMock ? "⚠ Demo Capsule" : "✓ Devnet Tx"}
                      </span>
                      {!isMock && solscanUrl && (
                        <a
                          href={solscanUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            ...BADGE,
                            background: "rgba(80,255,160,0.07)",
                            border: "1px solid rgba(80,255,160,0.22)",
                            color: "rgba(80,255,160,0.9)",
                            textDecoration: "none",
                          }}
                        >
                          Ver no Solscan →
                        </a>
                      )}
                    </div>

                    <div style={{ display: "grid", gap: 6 }}>
                      {hashOnlyFields(record).map((field) =>
                        field.value ? (
                          <div
                            key={field.label}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "120px 1fr auto",
                              gap: 10,
                              alignItems: "center",
                              padding: "7px 10px",
                              borderRadius: 8,
                              background: "rgba(255,255,255,0.025)",
                            }}
                          >
                            <span
                              style={{
                                fontSize: 10,
                                letterSpacing: "0.08em",
                                textTransform: "uppercase",
                                color: "rgba(255,255,255,0.35)",
                                flexShrink: 0,
                              }}
                            >
                              {field.label}
                            </span>
                            <code
                              style={{
                                fontSize: 11,
                                wordBreak: "break-all",
                                color: "rgba(255,255,255,0.8)",
                              }}
                            >
                              {field.value}
                            </code>
                            <button
                              style={{ ...BTN, padding: "3px 8px", fontSize: 10, flexShrink: 0 }}
                              onClick={() => copyValue(field.label, field.value)}
                            >
                              {copied === field.label ? "✓" : "Copiar"}
                            </button>
                          </div>
                        ) : null,
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Footer obrigatório */}
        <footer
          style={{
            marginTop: 40,
            textAlign: "center",
            fontSize: 11,
            color: "rgba(255,255,255,0.22)",
            lineHeight: 1.8,
          }}
        >
          DEV -{" "}
          <a
            href="https://rodrigo.run"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "rgba(143,211,255,0.5)", textDecoration: "none" }}
          >
            rodrigo.run
          </a>{" "}
          © 2026 SingulAI - Todos os direitos reservados
        </footer>
      </main>
    </div>
  );
}
