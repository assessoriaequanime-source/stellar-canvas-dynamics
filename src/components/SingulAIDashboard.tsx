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
        {/* SIDEBAR */}
        <nav id="sidebar">
          <div className="logo-mark" id="logo-mark">Σ</div>
          {[
            { k: "home", title: "Home", svg: <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></> },
            { k: "profile", title: "Avatar", svg: <><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></> },
            { k: "capsules", title: "Cápsulas", badge: true, svg: <><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></> },
            { k: "track", title: "Acompanhamento", svg: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /> },
            { k: "docs", title: "Documentos", svg: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></> },
          ].map((n) => (
            <button
              key={n.k}
              className={`nav-icon ${activeNav === n.k ? "active" : ""}`}
              onClick={() => setActiveNav(n.k)}
              title={n.title}
              aria-label={n.title}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">{n.svg}</svg>
              {n.badge && <span className="nav-badge" />}
            </button>
          ))}
          <div className="sidebar-spacer" />
          <div className="sidebar-divider" />
          <button className="nav-icon" title="Configurações" aria-label="Configurações">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>
        </nav>

        {/* TOPBAR */}
        <header id="topbar">
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
            <div className="chip chip-status">
              <span className="status-led" />
              <span>singulAI</span>
            </div>
            <div className="chip chip-wallet" id="chip-wallet">
              <Icon><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></Icon>
              <span className="wallet-addr">0xaf99…7686</span>
            </div>
            <div className="chip chip-pro" id="chip-pro">PRO</div>
            <div className="topbar-divider" />
            <button
              className="icon-btn"
              id="btn-panel-toggle"
              title="Painel de controle"
              aria-label="Painel"
              aria-pressed={panelOpen}
              onClick={() => setPanelOpen((o) => !o)}
            >
              <Icon><line x1="21" y1="10" x2="7" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="21" y1="18" x2="7" y2="18" /></Icon>
            </button>
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

          {/* RIGHT PANEL */}
          <aside id="right-panel" className={panelOpen ? "" : "hidden"}>
            <div className="ps">
              <div className="ps-label">
                <Icon><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></Icon>
                Sincronização Neural
              </div>
              <div id="sync-bars">
                {bars.map((lv, i) => (
                  <div key={i} className="sbar" style={{ ["--lv" as never]: `${lv}%` }} />
                ))}
              </div>
            </div>

            <div className="ps">
              <div className="ps-label">
                <Icon><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></Icon>
                Absorção Emocional
              </div>
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
            </div>

            {/* Ações foram movidas para o ActionRail lateral progressivo */}

            <div className="ps">
              <div className="ps-label">
                <Icon><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></Icon>
                Memórias Recentes
              </div>
              <div className="abs-wrap">
                <div className="abs-bar">
                  <div className="abs-fill" style={{ width: `${absorption}%` }} />
                </div>
                <div className="abs-meta">
                  <span className="abs-label">Absorção</span>
                  <span className="abs-pct">{absorption}%</span>
                </div>
              </div>
              {[
                { name: "Memória_Base_01", type: ".syn", icon: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></> },
                { name: "Legado_Digital", type: ".eth", icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /> },
                { name: "Valores_Familiares", type: ".dat", icon: <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /> },
              ].map((m) => (
                <div className="mem-item" key={m.name}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">{m.icon}</svg>
                  <span className="mem-name">{m.name}</span>
                  <span className="mem-type">{m.type}</span>
                </div>
              ))}
            </div>
          </aside>

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

      {/* MOBILE */}
      <button id="mobile-menu-btn" onClick={() => setPanelOpen((o) => !o)} aria-label="Menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
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
