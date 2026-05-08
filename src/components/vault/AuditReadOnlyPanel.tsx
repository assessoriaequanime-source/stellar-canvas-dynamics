import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { getAuditEventsByWallet } from "@/lib/avatarpro/auditApiClient";
import { INITIAL_SGL_BALANCE } from "@/lib/sgl/services";
import { getSglBalance } from "@/lib/avatarpro/sglApiClient";
import { Keypair } from "@solana/web3.js";

// Senha de acesso para juízes/avaliadores — simples, não sensível, apenas barreira de UI
const JUDGE_PASSWORD = "judge2026";

// ── Wallet ephemeral de sessão para juízes ─────────────────────────────────
const JUDGE_SESSION_KEY = "singulai_judge_keypair";

function getOrCreateJudgeKeypair(): string {
  try {
    const stored = sessionStorage.getItem(JUDGE_SESSION_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as { publicKey: string };
      if (parsed.publicKey) return parsed.publicKey;
    }
  } catch {
    /* SSR */
  }
  try {
    const kp = Keypair.generate();
    const pub = kp.publicKey.toBase58();
    sessionStorage.setItem(
      JUDGE_SESSION_KEY,
      JSON.stringify({ publicKey: pub, secretKey: Array.from(kp.secretKey) }),
    );
    return pub;
  } catch {
    return `judge-ephemeral-${Math.random().toString(36).slice(2, 12)}`;
  }
}

// ── Cápsulas de demonstração para juízes sem wallet real ───────────────────
const JUDGE_DEMO_CAPSULES: AuditRecord[] = [
  {
    capsuleId: "CAPS-pedro-1746700001",
    walletAddress: "—",
    avatarId: "pedro",
    eventType: "CONTRACT_ANALYSIS",
    serviceType: "Análise de Contrato — Pedro AvatarPro",
    cost: 50,
    payloadHash: "a3f1e9b2c7d8f04512ab98cd001244e3a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0",
    createdAt: "2026-05-08T10:00:00.000Z",
    network: "Solana Devnet",
    debitStatus: "SEALED",
    txSignature: "DEMO-CAPS-PEDRO-001",
    explorerUrl:
      "https://explorer.solana.com/address/MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr?cluster=devnet",
    _demoLabel: "Pedro · Contratos e Risco",
    _avatarEmoji: "⚖️",
  },
  {
    capsuleId: "CAPS-laura-1746700002",
    walletAddress: "—",
    avatarId: "laura",
    eventType: "PLANNING_CREATION",
    serviceType: "Planejamento e Criação — Laura AvatarPro",
    cost: 35,
    payloadHash: "7b2e4f9d1a8c6035e9fbe5234ab0cd12345678901abcdef1234567890abcdef12",
    createdAt: "2026-05-08T11:30:00.000Z",
    network: "Solana Devnet",
    debitStatus: "SEALED",
    txSignature: "DEMO-CAPS-LAURA-002",
    explorerUrl:
      "https://explorer.solana.com/address/MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr?cluster=devnet",
    _demoLabel: "Laura · Planejamento e Criação",
    _avatarEmoji: "🎯",
  },
  {
    capsuleId: "CAPS-leticia-1746700003",
    walletAddress: "—",
    avatarId: "leticia",
    eventType: "FOCUSED_EXECUTION",
    serviceType: "Execução Focada — Letícia AvatarPro",
    cost: 25,
    payloadHash: "c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9",
    createdAt: "2026-05-08T14:15:00.000Z",
    network: "Solana Devnet",
    debitStatus: "SEALED",
    txSignature: "DEMO-CAPS-LETICIA-003",
    explorerUrl:
      "https://explorer.solana.com/address/MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr?cluster=devnet",
    _demoLabel: "Letícia · Execução Focada",
    _avatarEmoji: "⚡",
  },
];

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
function JudgeGate({ onUnlock }: { onUnlock: () => void }) {
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pwd === JUDGE_PASSWORD) {
      onUnlock();
    } else {
      setError(true);
      setPwd("");
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
            Este painel exibe provas on-chain de transações SGL na Solana Devnet.
            <br />
            Acesso exclusivo para avaliadores do hackathon.
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
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="Digite a senha dos juízes"
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
              Senha incorreta. Tente novamente.
            </p>
          )}
          <button
            type="submit"
            style={{
              ...BTN_PRIMARY,
              padding: "12px 20px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              textAlign: "center",
            }}
          >
            Acessar Painel de Auditoria →
          </button>
        </form>

        <p
          style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", textAlign: "center", margin: 0 }}
        >
          Painel somente leitura · Nenhuma transação é executada aqui
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
    // Persiste o acesso na sessão para não pedir senha a cada navegação
    return sessionStorage.getItem("singulai_judge_unlocked") === "1";
  });
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [walletAddress, setWalletAddress] = useState("");
  const [balance, setBalance] = useState<number>(INITIAL_SGL_BALANCE);
  const [mintAddress, setMintAddress] = useState<string>("");
  const [isJudgeDemo, setIsJudgeDemo] = useState(false);
  const [judgeWalletAddress, setJudgeWalletAddress] = useState("");
  const [message, setMessage] = useState("Carregando auditoria…");
  const [copied, setCopied] = useState<string | null>(null);

  function handleUnlock() {
    const judgeWallet = getOrCreateJudgeKeypair();
    setJudgeWalletAddress(judgeWallet);
    sessionStorage.setItem("singulai_judge_unlocked", "1");
    setUnlocked(true);
  }

  // Auto-carrega ao desbloquear
  useEffect(() => {
    if (!unlocked) return;
    async function autoLoad() {
      try {
        const stored = JSON.parse(localStorage.getItem("singulai_wallet") || "null");
        const addr = stored?.address || stored?.walletAddress || getOrCreateJudgeKeypair();
        setJudgeWalletAddress(addr);
        setWalletAddress(addr);
        const [events, balanceData] = await Promise.all([
          getAuditEventsByWallet(addr),
          getSglBalance(addr),
        ]);
        const hasEvents = Array.isArray(events) && events.length > 0;
        if (!hasEvents) {
          setIsJudgeDemo(true);
          setRecords(JUDGE_DEMO_CAPSULES);
          setBalance(
            INITIAL_SGL_BALANCE -
              JUDGE_DEMO_CAPSULES.reduce((sum, e) => sum + Number(e.cost || 0), 0),
          );
          setMessage(
            "Modo Judge Demo ativado: cápsulas de auditoria carregadas para validação do fluxo.",
          );
        } else {
          setIsJudgeDemo(false);
          setRecords(events);
          setBalance(Number(balanceData.sglBalance || INITIAL_SGL_BALANCE));
          setMessage(`${events.length} evento(s) verificado(s) na Solana Devnet.`);
        }
        const bd1 = balanceData as Record<string, unknown>;
        if (bd1.sglMintAddress) setMintAddress(String(bd1.sglMintAddress));
      } catch {
        setIsJudgeDemo(true);
        setRecords(JUDGE_DEMO_CAPSULES);
        setBalance(
          INITIAL_SGL_BALANCE -
            JUDGE_DEMO_CAPSULES.reduce((sum, e) => sum + Number(e.cost || 0), 0),
        );
        setMessage("Backend indisponível. Dados parciais podem estar visíveis.");
      }
    }
    void autoLoad();
  }, [unlocked]);

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
    setMessage("Recarregando…");
    try {
      const stored = JSON.parse(localStorage.getItem("singulai_wallet") || "null");
      const addr =
        stored?.address || stored?.walletAddress || walletAddress || getOrCreateJudgeKeypair();
      if (!addr) {
        setMessage("Nenhuma wallet.");
        return;
      }
      setJudgeWalletAddress(addr);
      setWalletAddress(addr);
      const [events, balanceData] = await Promise.all([
        getAuditEventsByWallet(addr),
        getSglBalance(addr),
      ]);
      const hasEvents = Array.isArray(events) && events.length > 0;
      if (!hasEvents) {
        setIsJudgeDemo(true);
        setRecords(JUDGE_DEMO_CAPSULES);
        setBalance(
          INITIAL_SGL_BALANCE -
            JUDGE_DEMO_CAPSULES.reduce((sum, e) => sum + Number(e.cost || 0), 0),
        );
        setMessage("Modo Judge Demo ativado: cápsulas carregadas.");
      } else {
        setIsJudgeDemo(false);
        setRecords(events);
        setBalance(Number(balanceData.sglBalance || INITIAL_SGL_BALANCE));
        setMessage(`${events.length} evento(s) atualizados.`);
      }
      const bd2 = balanceData as Record<string, unknown>;
      if (bd2.sglMintAddress) setMintAddress(String(bd2.sglMintAddress));
    } catch {
      setMessage("Erro ao recarregar.");
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

  if (!unlocked) return <JudgeGate onUnlock={handleUnlock} />;

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
            ↻ Atualizar
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
            Painel de Auditoria — Provas On-Chain
          </h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", margin: 0 }}>
            Somente leitura · Transações SGL registradas como Memo proof na Solana Devnet · Wallet:{" "}
            <code style={{ fontSize: 12, color: accentBlue }}>
              {walletAddress ? `${walletAddress.slice(0, 10)}…${walletAddress.slice(-6)}` : "—"}
            </code>
          </p>
          {judgeWalletAddress && (
            <p style={{ fontSize: 11, marginTop: 6, color: "rgba(143,211,255,0.78)" }}>
              Wallet de sessão do juiz: <code>{judgeWalletAddress}</code>
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
          {isJudgeDemo && (
            <p
              style={{
                marginTop: 8,
                fontSize: 11,
                color: "rgba(255,200,80,0.95)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Judge Demo Mode · cápsulas pré-validadas para demonstração do fluxo
            </p>
          )}
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

        {/* Registros de auditoria */}
        <section style={CARD}>
          <h2 style={{ margin: "0 0 16px", fontSize: 16, letterSpacing: "0.02em" }}>
            Registros de Prova — Hashes e Validação no Solscan
          </h2>

          {records.length === 0 ? (
            <div
              style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.35)" }}
            >
              <p style={{ fontSize: 32, margin: "0 0 8px" }}>∅</p>
              <p style={{ margin: 0, fontSize: 13 }}>Nenhum evento registrado ainda.</p>
              <p style={{ margin: "4px 0 0", fontSize: 11 }}>
                Interaja no Vault para gerar transações auditáveis.
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
