import { useEffect, useState } from "react";
import BrandLogo from "@/components/BrandLogo";
import { BRAND_LOGO_USAGE } from "@/lib/brand";

const WALLET_KEY = "singulai_demo_wallet";
const SESSION_KEY = "singulai_session";
const USER_KEY = "singulai_user";
const WALLET_STORE_KEY = "singulai_wallet";

const EXTENDED_WORDS = [
  "solar", "anchor", "memory", "proof", "chain", "vault",
  "token", "ledger", "mint", "sage", "craft", "origin",
  "delta", "pulse", "forge", "cipher", "drift", "echo",
  "flux", "glyph", "haven", "iris", "jade", "karma",
];

function generateSolanaAddress(): string {
  const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const arr = new Uint8Array(44);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => chars[b % chars.length]).join("").slice(0, 44);
}

function generateSeedPhrase(): string[] {
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => EXTENDED_WORDS[b % EXTENDED_WORDS.length]);
}

function persistSession(address: string) {
  const SGL_BONUS = 1000;
  localStorage.setItem(WALLET_KEY, address);
  localStorage.setItem(SESSION_KEY, `demo-solana-${address.slice(0, 8)}`);
  localStorage.setItem(
    USER_KEY,
    JSON.stringify({
      id: `avatarpro-${address.slice(0, 8)}`,
      name: "AvatarPro User",
      email: "demo@singulai.live",
      walletAddress: address,
      sglBalance: SGL_BONUS,
    }),
  );
  localStorage.setItem(
    WALLET_STORE_KEY,
    JSON.stringify({
      address,
      walletAddress: address,
      network: "solana-devnet",
      chainId: "devnet",
      type: "avatarpro_demo",
      sglBalance: SGL_BONUS,
    }),
  );
}

interface Props {
  onSuccess: () => void;
}

type Step = "reconnecting" | "creating" | "reveal" | "exiting";

export default function WalletOnboarding({ onSuccess }: Props) {
  const existingAddr = localStorage.getItem(WALLET_KEY);

  const [step, setStep] = useState<Step>(existingAddr ? "reconnecting" : "creating");
  const [walletAddress] = useState<string>(existingAddr ?? generateSolanaAddress());
  const [seedPhrase] = useState<string[]>(generateSeedPhrase());
  const SGL_BONUS = 1000;

  // Returning user → auto-reconnect
  useEffect(() => {
    if (step !== "reconnecting") return;
    const t = setTimeout(() => {
      persistSession(walletAddress);
      onSuccess();
    }, 1800);
    return () => clearTimeout(t);
  }, [step, walletAddress, onSuccess]);

  // First visit → animate "creating" then show wallet
  useEffect(() => {
    if (step !== "creating") return;
    const t = setTimeout(() => setStep("reveal"), 2400);
    return () => clearTimeout(t);
  }, [step]);

  function handleDownload() {
    const content = [
      "SingulAI AvatarPro — Wallet Credentials",
      "Network: Solana Devnet",
      "=".repeat(44),
      "",
      `Wallet Address:  ${walletAddress}`,
      "",
      "Recovery Phrase (12 words — keep secret):",
      seedPhrase.join("  "),
      "",
      `SGL Welcome Bonus: ${SGL_BONUS.toLocaleString()} SGL`,
      "(One-time grant · Solana Devnet execution credits)",
      "",
      "⚠  IMPORTANT — Solana Devnet demo wallet.",
      "   Not connected to mainnet. Not for real funds.",
      "",
      "SingulAI © 2026 · singulai.live · Solana Frontier Hackathon",
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "singulai-avatarpro-wallet.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleEmailSelf() {
    const subject = encodeURIComponent("SingulAI AvatarPro — Wallet Credentials");
    const body = encodeURIComponent(
      `Wallet Address: ${walletAddress}\n\nRecovery Phrase:\n${seedPhrase.join("  ")}\n\nSGL Balance: ${SGL_BONUS.toLocaleString()} SGL\n\nSingulAI Devnet Demo · singulai.live`,
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  function handleEnter() {
    persistSession(walletAddress);
    setStep("exiting");
    setTimeout(onSuccess, 400);
  }

  // ── Reconnecting screen ────────────────────────────────────────────
  if (step === "reconnecting") {
    return (
      <div className="wonb-overlay">
        <div className="wonb-shell wonb-shell--compact">
          <BrandLogo {...BRAND_LOGO_USAGE.modal} />
          <p className="wonb-title">Welcome back</p>
          <div className="wonb-addr-chip">
            {walletAddress.slice(0, 8)}…{walletAddress.slice(-6)}
          </div>
          <p className="wonb-sub">Reconnecting to Solana Devnet…</p>
          <div className="wonb-dots-row">
            <span className="tdot" />
            <span className="tdot" />
            <span className="tdot" />
          </div>
        </div>
      </div>
    );
  }

  // ── Creating screen ────────────────────────────────────────────────
  if (step === "creating") {
    return (
      <div className="wonb-overlay">
        <div className="wonb-shell wonb-shell--compact">
          <BrandLogo {...BRAND_LOGO_USAGE.modal} />
          <p className="wonb-title">Initializing AvatarPro</p>
          <p className="wonb-sub">Anchoring identity on Solana Devnet…</p>
          <div className="wonb-spinner" aria-hidden="true" />
          <div className="wonb-steps">
            <span className="wonb-step wonb-step--done">✓&nbsp;AvatarPro identity</span>
            <span className="wonb-step wonb-step--active">◉&nbsp;Wallet keypair</span>
            <span className="wonb-step">○&nbsp;SGL token grant</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Wallet reveal ──────────────────────────────────────────────────
  return (
    <div className={`wonb-overlay${step === "exiting" ? " wonb-overlay--exit" : ""}`}>
      <div className="wonb-shell">
        <header className="wonb-hdr">
          <BrandLogo {...BRAND_LOGO_USAGE.modal} />
          <div className="wonb-network-badge">
            <span className="pulse-dot" style={{ width: 5, height: 5 }} />
            <span>Solana Devnet</span>
          </div>
        </header>

        <div className="wonb-success-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={14} height={14}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
          AvatarPro wallet initialized · {SGL_BONUS.toLocaleString()} SGL credited
        </div>

        <section className="wonb-section">
          <p className="wonb-label">WALLET ADDRESS</p>
          <div className="wonb-addr-box">
            <code className="wonb-addr-code">{walletAddress}</code>
          </div>
        </section>

        <section className="wonb-section">
          <p className="wonb-label">SGL WELCOME BONUS</p>
          <div className="wonb-balance-row">
            <span className="wonb-balance-num">+{SGL_BONUS.toLocaleString()}</span>
            <span className="wonb-balance-unit">SGL</span>
            <span className="wonb-balance-note">execution credits · one-time grant</span>
          </div>
        </section>

        <section className="wonb-section">
          <p className="wonb-label">RECOVERY PHRASE — store this safely</p>
          <div className="wonb-seed">
            {seedPhrase.map((word, i) => (
              <span key={i} className="wonb-seed-word">
                <span className="wonb-seed-n">{i + 1}</span>
                {word}
              </span>
            ))}
          </div>
        </section>

        <p className="wonb-disclaimer">
          ⚠ Solana Devnet demo wallet — not for real funds or mainnet use
        </p>

        <div className="wonb-save-row">
          <button className="wonb-save-btn" onClick={handleDownload}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={13} height={13}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download .txt
          </button>
          <button className="wonb-save-btn" onClick={handleEmailSelf}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={13} height={13}>
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            Email to myself
          </button>
        </div>

        <button className="wonb-enter-btn" onClick={handleEnter}>
          Enter the Vault
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </div>
  );
}
