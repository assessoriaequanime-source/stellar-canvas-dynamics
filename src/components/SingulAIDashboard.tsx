import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { AvatarEngine, type Profile } from "@/lib/avatar-engine";
import BrandLogo from "@/components/BrandLogo";
import { useIsMobile } from "@/hooks/use-mobile";
import ChatStream from "./ChatStream";
import ActionRail, { type RailAction } from "./ActionRail";
import { sendAvatarMessage } from "@/lib/altApi";

const PROFILES: Record<Profile, { rgb: [number, number, number]; hex: string; avatarName: string; modeName: string; desc: string; omega: number }> = {
  pedro: {
    rgb: [38, 176, 226],
    hex: "#26B0E2",
    avatarName: "Pedro",
    modeName: "Safe Quantum",
    desc: "Absorção de Conhecimento",
    omega: 79.1,
  },
  laura: {
    rgb: [226, 38, 156],
    hex: "#E2269C",
    avatarName: "Laura",
    modeName: "Difusão Spin",
    desc: "Segurança & Privacidade",
    omega: 68.4,
  },
  leticia: {
    rgb: [226, 192, 38],
    hex: "#E2C026",
    avatarName: "Letícia",
    modeName: "Foco Atômico",
    desc: "Expertise Profissional",
    omega: 91.3,
  },
};



const AI_REPLIES: Record<Profile, string[]> = {
  pedro: [
    "Analisando através do meu atlas neural… Padrões semânticos identificados.",
    "Com base nas memórias absorvidas, identifico conexões relevantes para sua consulta.",
    "Meu índice Ω está calibrado. O que mais deseja explorar no framework de conhecimento?",
    "Input integrado ao modelo de coesão. As partículas se reorganizaram para esta inferência.",
  ],
  laura: [
    "Verificando protocolos de privacidade… Criptografia zero-knowledge ativa.",
    "Suas chaves permanecem sob sua custódia. Esta sessão é protegida por design.",
    "Padrões de segurança identificados. Processando com máxima confidencialidade.",
  ],
  leticia: [
    "Aplicando expertise profissional. Framework de contratos ativado.",
    "Com base nos meus legados de longo prazo, posso elaborar uma estratégia detalhada.",
    "Validação ICP-Brasil em progresso. Processando com rigor notarial.",
  ],
};

type Msg = { role: "user" | "ai" | "typing"; text?: string; id: number };

const MODEL_IDS: Record<Profile, string> = { pedro: "safe", laura: "diffusion", leticia: "focus" };

const Icon = ({ d, children }: { d?: string; children?: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    {children ?? <path d={d} />}
  </svg>
);

export default function SingulAIDashboard() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<AvatarEngine | null>(null);
  const omegaLiveRef = useRef(0);
  const omegaTargetRef = useRef(79.1);
  const isMobile = useIsMobile();

  const [profile, setProfile] = useState<Profile>("pedro");
  const profileRef = useRef<Profile>("pedro");
  profileRef.current = profile;

  const [, setActiveNav] = useState("home");
  const [omegaPct, setOmegaPct] = useState(0);
  const [omegaStatus, setOmegaStatus] = useState("Fragmentado");
  const [bars, setBars] = useState<number[]>([58, 81, 52, 93, 67, 44, 88]);
  const [emo, setEmo] = useState(64);
  const [absorption, setAbsorption] = useState(0);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sglBalance, setSglBalance] = useState(0);
  const [walletAddress, setWalletAddress] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [delivery, setDelivery] = useState<"immediate" | "scheduled">("immediate");
  const [railOpen, setRailOpen] = useState(false);
  const [railActions, setRailActions] = useState<RailAction[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [subpanel, setSubpanel] = useState<string | null>(null);
  const [sigmaFlash, setSigmaFlash] = useState(0);
  const [topExpanded, setTopExpanded] = useState(false);
  const MAX_STREAM = 10;
  const msgIdRef = useRef(0);

  // Particle engine boot
  useEffect(() => {
    if (!canvasRef.current) return;
    const eng = new AvatarEngine(canvasRef.current);
    engineRef.current = eng;
    return () => {
      eng.dispose();
      engineRef.current = null;
    };
  }, []);

  // Load user/wallet from localStorage on mount
  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("singulai_user") || "null");
      const w = JSON.parse(localStorage.getItem("singulai_wallet") || "null");
      if (u?.sglBalance !== undefined) setSglBalance(u.sglBalance);
      if (w?.walletAddress || w?.address) setWalletAddress(w.walletAddress || w.address || "");
    } catch {}
  }, []);

  // Omega animation logic
  const animateOmega = useCallback((target: number, from: number, dur = 2200) => {
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      const v = from + (target - from) * ease;
      omegaLiveRef.current = v;
      setOmegaPct(v);
      const s =
        v < 30 ? "Fragmentado" : v < 60 ? "Acumulando" : v < 85 ? "Em calibração" : v < 96 ? "Quase soberano" : "Soberano Ω";
      setOmegaStatus(s);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, []);

  // Initial omega + drift
  useEffect(() => {
    animateOmega(79.1, 0);
    const id = setInterval(() => {
      const d = (Math.random() - 0.5) * 1.2;
      const t = Math.max(60, Math.min(99.9, omegaLiveRef.current + d));
      omegaTargetRef.current = t;
      animateOmega(t, omegaLiveRef.current, 1000);
    }, 3500);
    return () => clearInterval(id);
  }, [animateOmega]);

  // Sync bars
  useEffect(() => {
    const id = setInterval(() => {
      setBars(Array.from({ length: 7 }, () => 28 + Math.random() * 68));
    }, 1400);
    return () => clearInterval(id);
  }, []);

  // Absorption fill (one-time animate to 42)
  useEffect(() => {
    let v = 0;
    const id = setInterval(() => {
      v = Math.min(v + 1, 42);
      setAbsorption(v);
      if (v >= 42) clearInterval(id);
    }, 55);
    return () => clearInterval(id);
  }, []);

  // Emotional thumb drift
  useEffect(() => {
    const id = setInterval(() => {
      setEmo((e) => Math.max(18, Math.min(84, e + (Math.random() - 0.5) * 5)));
    }, 2200);
    return () => clearInterval(id);
  }, []);

  // Initialize rail actions — AI functions only (settings are in the settings panel)
  useEffect(() => {
    setRailActions([
      {
        id: "absorption",
        label: "Absorção",
        hint: "Nível de conhecimento",
        svg: <><circle cx="12" cy="12" r="3" /><path d="M12 1v6m0 10v6m11-11h-6m-10 0H1" /></>,
        onClick: () => setSubpanel("memories"),
      },
      {
        id: "indices",
        label: "Índices",
        hint: "Métricas & Ω coesão",
        svg: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
        onClick: () => setSubpanel("sync"),
      },
      {
        id: "capsules",
        label: "Cápsulas",
        hint: "Acervo de envios",
        svg: <><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></>,
        onClick: () => setActiveNav("capsules"),
      },
      {
        id: "legados",
        label: "Legados",
        hint: "Legados digitais",
        svg: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></>,
        onClick: () => setActiveNav("docs"),
      },
      {
        id: "historicos",
        label: "Históricos",
        hint: "Log de sessões",
        svg: <><polyline points="12 8 12 12 14 14" /><path d="M3.05 11a9 9 0 1 0 .5-4.5" /><polyline points="3 3 3 9 9 9" /></>,
        onClick: () => setSubpanel("memories"),
      },
      {
        id: "rascunhos",
        label: "Rascunhos",
        hint: "Mensagens em criação",
        svg: <><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></>,
        onClick: () => setSubpanel("memories"),
      },
      {
        id: "create",
        label: "Criar Cápsula",
        hint: "Novo legado digital",
        svg: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
        onClick: () => setModalOpen(true),
      },
      {
        id: "apis",
        label: "APIs & Conectores",
        hint: "Integrações externas",
        svg: <><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></>,
        onClick: () => setSubpanel("settings"),
      },
      {
        id: "skills",
        label: "Skills & Recursos",
        hint: "Capacidades ativas",
        svg: <><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></>,
        onClick: () => setSubpanel("sync"),
      },
      {
        id: "banco",
        label: "Banco de Dados",
        hint: "Informações absorvidas",
        svg: <><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></>,
        onClick: () => setSubpanel("memories"),
      },
      {
        id: "recalibrate",
        label: "Recalibrar",
        hint: "Reorganizar atlas",
        svg: <><polyline points="1 4 1 10 7 10" /><polyline points="23 20 23 14 17 14" /><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" /></>,
        onClick: () => {
          engineRef.current?.morphTo(profileRef.current);
          const t = Math.min(99.9, omegaLiveRef.current + 2);
          animateOmega(t, omegaLiveRef.current, 800);
        },
      },
    ]);
  }, [animateOmega]);

  // Profile switch
  const switchProfile = (p: Profile) => {
    if (p === profile) return;
    setProfile(p);
    setSigmaFlash((n) => n + 1); // dispara animação de partículas formando o σ
    engineRef.current?.morphTo(p);
    const prof = PROFILES[p];
    omegaTargetRef.current = prof.omega;
    animateOmega(prof.omega, omegaLiveRef.current, 1200);
  };

  // Send chat — tries real backend, falls back to AI_REPLIES on error
  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    const userId = ++msgIdRef.current;
    const typingId = ++msgIdRef.current;
    setMessages((m) =>
      ([...m, { role: "user" as const, text, id: userId }, { role: "typing" as const, id: typingId }] as Msg[]).slice(-MAX_STREAM),
    );

    const sessionToken = localStorage.getItem("singulai_session");
    let reply: string;
    try {
      if (sessionToken) {
        const data = await sendAvatarMessage(sessionToken, text, MODEL_IDS[profileRef.current]);
        const raw = (data.message || data.reply || data.text || "").trim();
        reply = raw || AI_REPLIES[profileRef.current][Math.floor(Math.random() * AI_REPLIES[profileRef.current].length)];
        if (data.sglBalance !== undefined) setSglBalance(data.sglBalance);
        else if (data.balance !== undefined) setSglBalance(data.balance);
      } else {
        await new Promise((r) => setTimeout(r, 1100 + Math.random() * 900));
        const pool = AI_REPLIES[profileRef.current];
        reply = pool[Math.floor(Math.random() * pool.length)];
      }
    } catch {
      await new Promise((r) => setTimeout(r, 900 + Math.random() * 600));
      const pool = AI_REPLIES[profileRef.current];
      reply = pool[Math.floor(Math.random() * pool.length)];
    }

    const aiId = ++msgIdRef.current;
    setMessages((m) =>
      m.filter((x) => x.id !== typingId).concat({ role: "ai", text: reply, id: aiId }).slice(-MAX_STREAM),
    );
    omegaTargetRef.current = Math.min(99.5, omegaLiveRef.current + 0.4);
  };

  // ESC closes modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const prof = PROFILES[profile];
  const accentStr = `rgb(${prof.rgb[0]},${prof.rgb[1]},${prof.rgb[2]})`;

  return (
    <div className={`p-${profile}`}>
      {/* CANVAS BACKGROUND */}
      <div id="canvas-bg" ref={canvasRef} />
      <div className="glass-grid" aria-hidden />

      <div id="app">
        {/* TOPBAR — premium expandable intelligence dock */}
        <header
          id="topbar"
          className={topExpanded ? "topbar-expanded" : ""}
          onMouseEnter={() => !isMobile && setTopExpanded(true)}
          onMouseLeave={() => !isMobile && setTopExpanded(false)}
        >
          {/* Strip — always visible */}
          <div className="topbar-strip">
            <div className="topbar-brand">
              <BrandLogo size={48} />
            </div>

            {/* Active mode pill — visible when collapsed */}
            <div className="topbar-active-pill">
              <span className="topbar-pill-dot" />
              <span className="topbar-pill-label">{prof.modeName}</span>
            </div>

            {/* Right actions */}
            <div className="topbar-actions">
              <div className="topbar-status">
                <span className="pulse-dot" style={{ width: 5, height: 5 }} />
                <span className="topbar-status-text">ONLINE</span>
              </div>
              {isMobile && (
                <button
                  className="topbar-toggle"
                  onClick={() => setTopExpanded((v) => !v)}
                  aria-label={topExpanded ? "Recolher" : "Expandir"}
                >
                  <Icon><polyline points={topExpanded ? "18 15 12 9 6 15" : "6 9 12 15 18 9"} /></Icon>
                </button>
              )}

              {/* Notifications */}
              <div className="topbar-notif-wrap">
                <button
                  className="topbar-action-btn topbar-notif-btn"
                  title="Notificações"
                  aria-label="Notificações"
                >
                  <Icon>
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </Icon>
                </button>
                <span className="topbar-notif-badge" aria-hidden="true" />
              </div>

              <Link to="/demo" className="topbar-action-btn" title="Voltar para Intro" aria-label="Voltar para Intro">
                <Icon>
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </Icon>
              </Link>

              {/* Settings (sliders icon) — wallet / perfil / ajustes / modo / layouts */}
              <button
                className="topbar-action-btn"
                onClick={() => setSettingsOpen(true)}
                title="Configurações"
                aria-label="Configurações do painel"
              >
                <Icon>
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <line x1="8" y1="4" x2="8" y2="8" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="16" y1="10" x2="16" y2="14" />
                  <line x1="4" y1="18" x2="20" y2="18" />
                  <line x1="12" y1="16" x2="12" y2="20" />
                </Icon>
              </button>
            </div>
          </div>

          {/* Expansion zone */}
          <div className="topbar-expand-zone">
            <div id="model-carousel">
              {(Object.keys(PROFILES) as Profile[]).map((p, i) => {
                const keys = Object.keys(PROFILES) as Profile[];
                const activeIdx = keys.indexOf(profile);
                let pos = i - activeIdx;
                if (pos > 1) pos -= 3;
                if (pos < -1) pos += 3;
                return (
                  <button
                    key={p}
                    className={`carousel-item ${pos === 0 ? "carousel-active" : "carousel-side"}`}
                    data-p={p}
                    data-pos={pos}
                    onClick={() => switchProfile(p)}
                    style={{
                      transform: `translateX(${pos * 155}px) scale(${pos === 0 ? 1.14 : 0.86})`,
                      opacity: pos === 0 ? 1 : 0.58,
                      zIndex: pos === 0 ? 20 : 10,
                    }}
                  >
                    <span className="carousel-label">{PROFILES[p].modeName}</span>
                  </button>
                );
              })}
            </div>
            <span className="carousel-modo" style={{ color: accentStr }}>
              MODO
            </span>
          </div>
        </header>

        {/* Sigma flash — partículas claras formam o ícone matemático e somem com fade-out */}
        <div className="sigma-flash" key={`sf-${sigmaFlash}`} aria-hidden>
          <span className="sf-glyph">Σ</span>
          {Array.from({ length: 14 }).map((_, i) => (
            <span key={i} className="sf-dot" style={{ ["--i" as never]: i }} />
          ))}
        </div>

        <main id="main">
          {/* Barra de créditos — rotada -90° na borda esquerda */}
          <nav id="meta-rail" aria-label="Créditos">
            <a href="https://singulai.site" target="_blank" rel="noreferrer" className="meta-link">
              <span className="meta-lbl">Oficial</span>
              <span className="meta-val">singulai.site</span>
            </a>
            <span className="meta-dot" aria-hidden="true" />
            <a href="https://rodrigo.run" target="_blank" rel="noreferrer" className="meta-link">
              <span className="meta-lbl">CEO & Founder</span>
              <span className="meta-val">rodrigo.run</span>
            </a>
            <span className="meta-dot" aria-hidden="true" />
            <a href="https://vitor.business" target="_blank" rel="noreferrer" className="meta-link">
              <span className="meta-lbl">Design</span>
              <span className="meta-val">vitor.business</span>
            </a>
          </nav>

          {/* SUBPANEL — renderizado on-demand pelo rail (Memórias / Sync / Emo / Wallet / PRO / Settings) */}
          {subpanel && (
            <aside id="subpanel" onClick={(e) => e.stopPropagation()}>
              <header className="sp-hdr">
                <span className="sp-title">
                  {subpanel === "memories" && "Memórias Recentes"}
                  {subpanel === "sync" && "Sincronização Neural"}
                  {subpanel === "emo" && "Absorção Emocional"}
                  {subpanel === "wallet" && "Carteira"}
                  {subpanel === "pro" && "Plano PRO"}
                  {subpanel === "settings" && "Configurações"}
                </span>
                <button className="sp-x" onClick={() => setSubpanel(null)} aria-label="Fechar">
                  <Icon><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Icon>
                </button>
              </header>
              <div className="sp-body">
                {subpanel === "sync" && (
                  <div id="sync-bars">
                    {bars.map((lv, i) => (
                      <div key={i} className="sbar" style={{ ["--lv" as never]: `${lv}%` }} />
                    ))}
                  </div>
                )}
                {subpanel === "emo" && (
                  <div className="emo-row">
                    <div className="emo-labels">
                      <span className="emo-lbl">FEEDBACK</span>
                      <span className="emo-lbl">CONHECIMENTO</span>
                    </div>
                    <div className="emo-track">
                      <div className="emo-fill" style={{ width: `${emo}%` }} />
                      <div className="emo-thumb" style={{ left: `${emo}%` }} />
                    </div>
                  </div>
                )}
                {subpanel === "memories" && (
                  <>
                    <div className="abs-wrap">
                      <div className="abs-bar"><div className="abs-fill" style={{ width: `${absorption}%` }} /></div>
                      <div className="abs-meta">
                        <span className="abs-label">Absorção</span>
                        <span className="abs-pct">{absorption}%</span>
                      </div>
                    </div>
                    {[
                      { name: "Memória_Base_01", type: ".syn" },
                      { name: "Legado_Digital", type: ".eth" },
                      { name: "Valores_Familiares", type: ".dat" },
                    ].map((m) => (
                      <div className="mem-item" key={m.name}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                        <span className="mem-name">{m.name}</span>
                        <span className="mem-type">{m.type}</span>
                      </div>
                    ))}
                  </>
                )}
                {subpanel === "wallet" && (
                  <div className="sp-info">
                    <div className="sp-row"><span>Endereço</span><code>{walletAddress ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : "—"}</code></div>
                    <div className="sp-row"><span>Saldo SGL</span><code>{sglBalance.toLocaleString("pt-BR")}</code></div>
                    <div className="sp-row"><span>Rede</span><code>SingulAI Alt</code></div>
                  </div>
                )}
                {subpanel === "pro" && (
                  <div className="sp-info">
                    <div className="sp-row"><span>Plano</span><code>PRO</code></div>
                    <div className="sp-row"><span>Cápsulas</span><code>ilimitadas</code></div>
                    <div className="sp-row"><span>Renovação</span><code>12/2026</code></div>
                  </div>
                )}
                {subpanel === "settings" && (
                  <div className="sp-info">
                    <div className="sp-row"><span>Tema</span><code>Dark Tech</code></div>
                    <div className="sp-row"><span>Idioma</span><code>pt-BR</code></div>
                    <div className="sp-row"><span>Notificações</span><code>ativadas</code></div>
                  </div>
                )}
              </div>
            </aside>
          )}

          {/* CHAT */}
          <div id="chat-area">
            <ChatStream messages={messages} profile={profile} engineRef={engineRef} />
            <div id="chat-bar">
              <button className="cb" title="Microfone" aria-label="Microfone">
                <Icon><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></Icon>
              </button>
              <input
                type="text"
                id="chat-input"
                placeholder="Converse com o avatar…"
                autoComplete="off"
                spellCheck={false}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <button className="cb" id="btn-send" title="Enviar" aria-label="Enviar" onClick={sendMessage}>
                <Icon><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></Icon>
              </button>
            </div>
            <div id="chat-footer">
              <span className="footer-avatar-name" style={{ color: accentStr }}>
                {prof.avatarName}
              </span>
            </div>
          </div>
        </main>
      </div>

      {/* SETTINGS PANEL — wallet / perfil / ajustes / modo / layouts */}
      {settingsOpen && (
        <div className="settings-scrim" onClick={() => setSettingsOpen(false)} aria-hidden />
      )}
      {settingsOpen && (
        <aside className="settings-panel" aria-label="Configurações do painel">
          <header className="settings-panel-hdr">
            <span className="settings-panel-title">Configurações</span>
            <button className="settings-panel-close" onClick={() => setSettingsOpen(false)} aria-label="Fechar">
              <Icon><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Icon>
            </button>
          </header>
          <ul className="settings-panel-list">
            {[
              {
                id: "wallet", label: "Carteira", hint: "Saldo & endereço",
                svg: <><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></>,
                onClick: () => { setSettingsOpen(false); setSubpanel("wallet"); },
              },
              {
                id: "profile", label: "Perfil", hint: "Identidade & avatar",
                svg: <><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></>,
                onClick: () => { setSettingsOpen(false); setActiveNav("profile"); },
              },
              {
                id: "panel-settings", label: "Ajustes do Painel", hint: "Notificações & tema",
                svg: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9c0 .67.39 1.27 1 1.51H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></>,
                onClick: () => { setSettingsOpen(false); setSubpanel("settings"); },
              },
              {
                id: "nav-mode", label: "Modo de Navegação", hint: "Compact · Full · Focus",
                svg: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>,
                onClick: () => setSettingsOpen(false),
              },
              {
                id: "layouts", label: "Layouts", hint: "Organização visual",
                svg: <><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></>,
                onClick: () => setSettingsOpen(false),
              },
            ].map((item) => (
              <li key={item.id} className="settings-panel-item">
                <button className="settings-panel-btn" onClick={item.onClick}>
                  <span className="settings-panel-ico">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      {item.svg}
                    </svg>
                  </span>
                  <span className="settings-panel-text">
                    <span className="settings-panel-label">{item.label}</span>
                    <span className="settings-panel-hint">{item.hint}</span>
                  </span>
                  <span className="settings-panel-chev" aria-hidden>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      )}

      {/* ACTION RAIL — funções de IA (borda direita) */}
      {railOpen && (
        <div
          className="rail-scrim"
          onClick={() => setRailOpen(false)}
          aria-hidden
        />
      )}
      <div className={`rail-shell ${railOpen ? "rail-shell-open" : ""}`} aria-hidden={!railOpen}>
        <ActionRail
          actions={railActions}
          onReorder={setRailActions}
          onClose={() => setRailOpen(false)}
          omegaPct={omegaPct}
          omegaStatus={omegaStatus}
          online
        />
      </div>

      {/* Edge hook — premium tab anchor */}
      <button
        id="rail-hook"
        className={railOpen ? "is-open" : ""}
        onClick={() => setRailOpen((v) => !v)}
        aria-pressed={railOpen}
        aria-label={railOpen ? "Fechar funções IA" : "Abrir funções IA"}
        title="Funções IA"
      >
        <span className="hook-tab" aria-hidden>
          <span className="hook-bar" />
          <span className="hook-text">IA</span>
        </span>
        <span className="hook-arrow" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <polyline points={railOpen ? "9 6 15 12 9 18" : "15 6 9 12 15 18"} />
          </svg>
        </span>
      </button>

      {/* MODAL */}
      <div className={`overlay ${modalOpen ? "open" : ""}`} onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
        <div className="modal-shell">
          <div className="modal-hdr">
            <div className="modal-brand">
              <BrandLogo size={64} />
            </div>
            <div className="modal-titles">
              <h3>Criar Cápsula</h3>
              <p>Envie mensagens imediatas ou agendadas</p>
            </div>
            <button className="modal-x" onClick={() => setModalOpen(false)} aria-label="Fechar">
              <Icon><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Icon>
            </button>
          </div>
          <div className="modal-body">
            <div>
              <label className="f-label">Título da Cápsula</label>
              <input type="text" className="f-input" placeholder="Ex: Mensagem Importante" />
            </div>
            <div>
              <label className="f-label">Email do Destinatário</label>
              <input type="email" className="f-input" placeholder="destinatario@email.com" />
            </div>
            <div>
              <label className="f-label">Nome do Destinatário</label>
              <input type="text" className="f-input" placeholder="Nome (opcional)" />
            </div>
            <div>
              <label className="f-label">WhatsApp (opcional)</label>
              <div className="wa-field">
                <input type="tel" className="f-input" placeholder="+55 11 99999-9999" style={{ paddingRight: 42 }} />
                <div className="wa-indicator" aria-hidden>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
              </div>
              <div className="wa-note">Notifica via WhatsApp quando a cápsula for liberada</div>
            </div>
            <div>
              <label className="f-label">Mensagem</label>
              <textarea className="f-input f-textarea" placeholder="Escreva sua mensagem…" />
            </div>
            <div>
              <label className="f-label">Anexos</label>
              <div className="attach-grid">
                {[
                  { l: "Arquivo", svg: <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" /> },
                  { l: "Áudio", svg: <><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /></> },
                  { l: "Vídeo", svg: <><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></> },
                ].map((a) => (
                  <button className="attach-btn" key={a.l}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">{a.svg}</svg>
                    {a.l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="f-label">Tipo de Entrega</label>
              <div className="del-toggle">
                <button className={`del-btn ${delivery === "immediate" ? "active" : ""}`} onClick={() => setDelivery("immediate")}>Imediato</button>
                <button className={`del-btn ${delivery === "scheduled" ? "active" : ""}`} onClick={() => setDelivery("scheduled")}>Agendado</button>
              </div>
            </div>
            <div className="cost-row">
              <span className="cost-lbl">Custo</span>
              <span className="cost-val">100 SGL</span>
            </div>
          </div>
          <div className="modal-ftr">
            <button className="btn-primary">
              <Icon><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></Icon>
              Criar Cápsula
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
