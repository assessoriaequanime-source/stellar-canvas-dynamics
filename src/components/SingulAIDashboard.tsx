import { useEffect, useRef, useState, useCallback } from "react";
import { AvatarEngine, type Profile } from "@/lib/avatar-engine";
import ChatStream from "./ChatStream";
import ActionRail, { type RailAction } from "./ActionRail";

const PROFILES: Record<Profile, { rgb: [number, number, number]; hex: string; name: string; desc: string; omega: number }> = {
  pedro: { rgb: [59, 130, 246], hex: "#3b82f6", name: "Pedro", desc: "Absorção de Conhecimento", omega: 79.1 },
  laura: { rgb: [236, 72, 153], hex: "#ec4899", name: "Laura", desc: "Segurança & Privacidade", omega: 68.4 },
  leticia: { rgb: [234, 179, 8], hex: "#eab308", name: "Letícia", desc: "Expertise Profissional", omega: 91.3 },
};

const CIRC = 2 * Math.PI * 19;

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

  const [profile, setProfile] = useState<Profile>("pedro");
  const profileRef = useRef<Profile>("pedro");
  profileRef.current = profile;

  const [panelOpen, setPanelOpen] = useState(typeof window !== "undefined" ? window.innerWidth >= 768 : true);
  const [activeNav, setActiveNav] = useState("home");
  const [omegaPct, setOmegaPct] = useState(0);
  const [omegaStatus, setOmegaStatus] = useState("Fragmentado");
  const [bars, setBars] = useState<number[]>([58, 81, 52, 93, 67, 44, 88]);
  const [emo, setEmo] = useState(64);
  const [absorption, setAbsorption] = useState(0);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [delivery, setDelivery] = useState<"immediate" | "scheduled">("immediate");
  const [railOpen, setRailOpen] = useState(false);
  const [railActions, setRailActions] = useState<RailAction[]>([]);
  const [subpanel, setSubpanel] = useState<string | null>(null);
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

  // Initialize rail actions — consolidates ALL migrated functions
  // (sidebar nav + right-panel widgets + topbar chips) into a single hub.
  useEffect(() => {
    setRailActions([
      // Primary action
      {
        id: "create",
        label: "Criar Cápsula",
        hint: "Novo legado digital",
        svg: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
        onClick: () => setModalOpen(true),
      },
      // Avatar & profile (from sidebar)
      {
        id: "avatar",
        label: "Meu Avatar",
        hint: "Identidade ativa",
        svg: <><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></>,
        onClick: () => setActiveNav("profile"),
      },
      // Capsules (from sidebar, with badge)
      {
        id: "capsules",
        label: "Cápsulas",
        hint: "Acervo de envios",
        svg: <><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></>,
        onClick: () => setActiveNav("capsules"),
      },
      // Tracking (from sidebar)
      {
        id: "track",
        label: "Acompanhamento",
        hint: "Status de entregas",
        svg: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
        onClick: () => setActiveNav("track"),
      },
      // Documents (from sidebar)
      {
        id: "docs",
        label: "Documentos",
        hint: "Acervo notarial",
        svg: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></>,
        onClick: () => setActiveNav("docs"),
      },
      // Memories (from right panel)
      {
        id: "memories",
        label: "Memórias",
        hint: "Recentes & absorção",
        svg: <><circle cx="12" cy="12" r="3" /><path d="M12 1v6m0 10v6m11-11h-6m-10 0H1" /></>,
        onClick: () => setSubpanel("memories"),
      },
      // Neural sync (from right panel)
      {
        id: "sync",
        label: "Sincronização",
        hint: "Bandas neurais",
        svg: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
        onClick: () => setSubpanel("sync"),
      },
      // Emotional absorption (from right panel)
      {
        id: "emo",
        label: "Absorção Emocional",
        hint: "Feedback ↔ conhecimento",
        svg: <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />,
        onClick: () => setSubpanel("emo"),
      },
      // Recalibrate (utility)
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
      // Wallet (from topbar chip)
      {
        id: "wallet",
        label: "Carteira",
        hint: "0xaf99…7686",
        svg: <><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></>,
        onClick: () => setSubpanel("wallet"),
      },
      // PRO plan (from topbar chip)
      {
        id: "pro",
        label: "Plano PRO",
        hint: "Status & benefícios",
        svg: <><polygon points="12 2 15 8.5 22 9.3 17 14 18.2 21 12 17.8 5.8 21 7 14 2 9.3 9 8.5 12 2" /></>,
        onClick: () => setSubpanel("pro"),
      },
      // Settings (from sidebar)
      {
        id: "settings",
        label: "Configurações",
        hint: "Preferências do sistema",
        svg: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9c0 .67.39 1.27 1 1.51H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></>,
        onClick: () => setSubpanel("settings"),
      },
    ]);
  }, [animateOmega]);

  // Profile switch
  const switchProfile = (p: Profile) => {
    if (p === profile) return;
    setProfile(p);
    engineRef.current?.morphTo(p);
    const prof = PROFILES[p];
    omegaTargetRef.current = prof.omega;
    animateOmega(prof.omega, omegaLiveRef.current, 1200);
  };

  // Send chat — newer messages push older toward absorption (cap with MAX_STREAM)
  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    const userId = ++msgIdRef.current;
    const typingId = ++msgIdRef.current;
    setMessages((m) =>
      ([...m, { role: "user" as const, text, id: userId }, { role: "typing" as const, id: typingId }] as Msg[]).slice(-MAX_STREAM),
    );

    await new Promise((r) => setTimeout(r, 1100 + Math.random() * 900));
    const pool = AI_REPLIES[profileRef.current];
    const reply = pool[Math.floor(Math.random() * pool.length)];
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
  const accentRGB = `${prof.rgb[0]},${prof.rgb[1]},${prof.rgb[2]}`;
  const accentStr = `rgb(${accentRGB})`;
  const offset = CIRC * (1 - omegaPct / 100);

  return (
    <div className={`p-${profile}`}>
      {/* CANVAS BACKGROUND */}
      <div id="canvas-bg" ref={canvasRef} />

      <div id="app">
        {/* TOPBAR — apenas avatares + status mínimo. Tudo o resto vive no rail. */}
        <header id="topbar">
          <div className="logo-mark logo-topbar" id="logo-mark" title="SingulAI">Σ</div>
          <div id="avatar-tabs">
            {(Object.keys(PROFILES) as Profile[]).map((p) => (
              <button
                key={p}
                className={`av-tab ${profile === p ? "av-active" : ""}`}
                data-p={p}
                onClick={() => switchProfile(p)}
              >
                <span className="av-dot" data-p={p} />
                {PROFILES[p].name}
              </button>
            ))}
          </div>
          <div className="topbar-cluster">
            <div className="chip chip-status" title="Sistema online">
              <span className="status-led" />
              <span>singulAI</span>
            </div>
          </div>
        </header>

        <main id="main">
          {/* Avatar info */}
          <div id="av-info">
            <div id="av-name">{prof.name}</div>
            <div id="av-desc">{prof.desc}</div>
          </div>

          <div id="av-online">
            <div className="pulse-dot" />
            <span id="av-online-text">ONLINE</span>
          </div>

          {/* Omega */}
          <div id="omega-widget">
            <div className="omega-card">
              <svg id="omega-svg" viewBox="0 0 46 46">
                <circle className="omega-ring-bg" cx="23" cy="23" r="19" />
                <circle
                  className="omega-ring-val"
                  id="omega-ring"
                  cx="23"
                  cy="23"
                  r="19"
                  stroke={accentStr}
                  strokeDasharray={CIRC.toFixed(2)}
                  strokeDashoffset={offset.toFixed(2)}
                />
                <text
                  x="23"
                  y="27"
                  textAnchor="middle"
                  fontFamily="Space Mono,monospace"
                  fontSize="8.5"
                  fontWeight={700}
                  fill={accentStr}
                >
                  Ω
                </text>
              </svg>
              <div className="omega-info">
                <div className="omega-label">Índice Ω</div>
                <div className="omega-val" style={{ color: accentStr }}>
                  {omegaPct.toFixed(1)}%
                </div>
                <div className="omega-status">{omegaStatus}</div>
              </div>
            </div>
          </div>

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
                    <div className="sp-row"><span>Endereço</span><code>0xaf99…7686</code></div>
                    <div className="sp-row"><span>Saldo SGL</span><code>2 480</code></div>
                    <div className="sp-row"><span>Rede</span><code>SingulAI Mainnet</code></div>
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
              <span className="cyan">SingulAI v2.0</span>
              <span className="sep">—</span>
              <a href="https://singulai.live" target="_blank" rel="noreferrer">singulai.live</a>
              <span className="sep">—</span>
              <a href="https://rodrigo.run" target="_blank" rel="noreferrer">rodrigo.run</a>
            </div>
          </div>
        </main>
      </div>

      {/* ACTION RAIL — trilha lateral progressiva curva */}
      <div className={`rail-shell ${railOpen ? "rail-shell-open" : ""}`} aria-hidden={!railOpen}>
        <ActionRail actions={railActions} onReorder={setRailActions} />
      </div>

      {/* (sidebar removida — navegação totalmente migrada para o rail) */}

      <button
        id="rail-fab"
        onClick={() => setRailOpen((v) => !v)}
        aria-pressed={railOpen}
        aria-label="Trilha de ações"
        title="Ações rápidas"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      </button>

      {/* MODAL */}
      <div className={`overlay ${modalOpen ? "open" : ""}`} onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
        <div className="modal-shell">
          <div className="modal-hdr">
            <div className="modal-ico">
              <Icon><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></Icon>
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
              <div style={{ position: "relative" }}>
                <input type="tel" className="f-input" placeholder="+55 11 99999-9999" style={{ paddingRight: 42 }} />
                <div style={{ position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)", width: 20, height: 20, background: "rgba(37,211,102,.14)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#25d366" strokeWidth={2}>
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
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
              <label className="f-label">Attachments</label>
              <div className="attach-grid">
                {[
                  { l: "File", svg: <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" /> },
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
            <button className="btn-amber">
              <Icon><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></Icon>
              Criar Cápsula
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
