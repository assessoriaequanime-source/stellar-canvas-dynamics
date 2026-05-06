import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { AvatarEngine, type Profile } from "@/lib/avatar-engine";
import BrandLogo from "@/components/BrandLogo";
import { useIsMobile } from "@/hooks/use-mobile";
import ChatStream from "./ChatStream";
import ActionRail, { type RailAction } from "./ActionRail";
import { sendAvatarMessage } from "@/lib/altApi";
import { getAvatarProStatus, getCurrentUser, getProfile, getWalletStatus } from "@/lib/avatarpro/avatarProApiClient";
import { getAbsorptionState, getPasMetrics, submitAbsorptionFeedback } from "@/lib/avatarpro/absorptionApiClient";
import { listCapsules } from "@/lib/avatarpro/capsuleApiClient";
import { listLegacyRules } from "@/lib/avatarpro/legacyApiClient";
import { getAuditHistory } from "@/lib/avatarpro/auditApiClient";
import { getSglBalance } from "@/lib/avatarpro/sglApiClient";
import { isExplicitAvatarProDemoMode } from "@/lib/avatarpro/demoMode";

const PROFILES: Record<Profile, { rgb: [number, number, number]; hex: string; avatarName: string; modeName: string; desc: string; omega: number }> = {
  pedro: {
    rgb: [38, 176, 226],
    hex: "#26B0E2",
    avatarName: "Pedro",
    modeName: "Safe Quantum",
    desc: "Knowledge Absorption",
    omega: 79.1,
  },
  laura: {
    rgb: [226, 38, 156],
    hex: "#E2269C",
    avatarName: "Laura",
    modeName: "Diffusion Spin",
    desc: "Security & Privacy",
    omega: 68.4,
  },
  leticia: {
    rgb: [226, 192, 38],
    hex: "#E2C026",
    avatarName: "Letícia",
    modeName: "Atomic Focus",
    desc: "Professional Expertise",
    omega: 91.3,
  },
};



const AI_REPLIES: Record<Profile, string[]> = {
  pedro: [
    "Analyzing through my neural atlas... semantic patterns identified.",
    "Based on absorbed memory, I can map relevant connections for your query.",
    "My Omega index is calibrated. What should we explore next?",
    "Input integrated into the cohesion model. Particles reorganized for this inference.",
  ],
  laura: [
    "Checking privacy protocols... zero-knowledge encryption active.",
    "Your keys remain under your custody. This session is protected by design.",
    "Security patterns identified. Processing with maximum confidentiality.",
  ],
  leticia: [
    "Applying professional expertise. Contract framework active.",
    "With long-term legacy context, I can draft a detailed strategy.",
    "Compliance validation in progress. Processing with notarial rigor.",
  ],
};

type Msg = { role: "user" | "ai" | "typing"; text?: string; id: number };

const MODEL_IDS: Record<Profile, string> = { pedro: "safe", laura: "diffusion", leticia: "focus" };

function isExplicitDevMockEnabled(): boolean {
  return isExplicitAvatarProDemoMode();
}

const PLATFORM_ARCHITECTURE = [
  {
    id: "core",
    title: "core",
    description: "Platform core",
    modules: ["blockchain", "privacy", "ai-integration", "contracts"],
  },
  {
    id: "tokenomics",
    title: "tokenomics",
    description: "SGL economy",
    modules: ["contracts", "services", "economics", "compliance"],
  },
  {
    id: "hardware",
    title: "hardware",
    description: "SingulAI Pen",
    modules: ["firmware", "hardware", "mobile-integration", "security"],
  },
  {
    id: "b2b-white-label",
    title: "b2b-white-label",
    description: "B2B white-label platform",
    modules: ["banking", "insurance", "digital-notary", "celebrity"],
  },
  {
    id: "frontend",
    title: "frontend",
    description: "User interfaces",
    modules: ["web", "mobile", "components"],
  },
  {
    id: "backend",
    title: "backend",
    description: "Platform backend",
    modules: ["api", "services", "database", "infrastructure"],
  },
  {
    id: "docs",
    title: "docs",
    description: "Documentation and compliance",
    modules: ["architecture", "business", "legal", "security", "integration"],
  },
  {
    id: "scripts",
    title: "scripts",
    description: "Operational automation",
    modules: ["deployment", "testing", "monitoring", "maintenance"],
  },
] as const;

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
  const [activePlanId, setActivePlanId] = useState("plan-essential");
  const [modelChoiceEnabled, setModelChoiceEnabled] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const [railActions, setRailActions] = useState<RailAction[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [subpanel, setSubpanel] = useState<string | null>(null);
  const [sigmaFlash, setSigmaFlash] = useState(0);
  const [backendStatus, setBackendStatus] = useState<"connected" | "unavailable" | "mock-dev">("connected");
  const [profileName, setProfileName] = useState("Reviewer");
  const [capsuleCount, setCapsuleCount] = useState(0);
  const [legacyCount, setLegacyCount] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Preview ready");
  const [avatarStatusLabel, setAvatarStatusLabel] = useState("active");
  const [avatarModeLabel, setAvatarModeLabel] = useState("Safe Quantum");
  const [absorptionStateLabel, setAbsorptionStateLabel] = useState("learning");
  const [particleWhitening, setParticleWhitening] = useState(0.72);
  const [pasScore, setPasScore] = useState(0.72);
  const [interactionScore, setInteractionScore] = useState(0.69);
  const [particlesScore, setParticlesScore] = useState(0.81);
  const [latestHistoryEvent, setLatestHistoryEvent] = useState("AvatarPro Demo Initialization");
  const [capsulePreview, setCapsulePreview] = useState<string[]>([]);
  const [legacyPreview, setLegacyPreview] = useState<string[]>([]);
  const [historyPreview, setHistoryPreview] = useState<string[]>([]);

  const toPercentScale = useCallback((value: unknown, fallback: number) => {
    const num = Number(value);
    if (Number.isNaN(num)) return fallback;
    if (num <= 1) return Number((num * 100).toFixed(1));
    return num;
  }, []);

  const toFractionScale = useCallback((value: unknown, fallback: number) => {
    const num = Number(value);
    if (Number.isNaN(num)) return fallback;
    if (num > 1) return Number((num / 100).toFixed(2));
    return num;
  }, []);

  // ── Gather-feedback gesture ────────────────────────────────────────────
  const gatherStateRef = useRef<{
    phase: "idle" | "holding" | "ready" | "dragging";
    startX: number;
    startY: number;
    currentX: number;
    fraction: number;
    holdTimer: ReturnType<typeof setTimeout> | null;
    holdInterval: ReturnType<typeof setInterval> | null;
    holdElapsed: number;
  }>({
    phase: "idle",
    startX: 0, startY: 0, currentX: 0,
    fraction: 0,
    holdTimer: null,
    holdInterval: null,
    holdElapsed: 0,
  });
  const [gatherRing, setGatherRing] = useState<{
    x: number; y: number; active: boolean; fraction: number;
  }>({ x: 0, y: 0, active: false, fraction: 0 });

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

  // Load user/wallet from backend (source of truth), using explicit dev fallback only
  useEffect(() => {
    let active = true;

    async function loadBackendState() {
      try {
        const [auth, profileData, walletData, avatarStatus, sglData, pasData, absorptionData, capsulesData, legacyData, auditData] = await Promise.all([
          getCurrentUser(),
          getProfile(),
          getWalletStatus(),
          getAvatarProStatus(),
          getSglBalance(),
          getPasMetrics(),
          getAbsorptionState(),
          listCapsules(),
          listLegacyRules(),
          getAuditHistory(),
        ]);

        if (!active) return;

        const authUser = auth.user || {};
        const userName = (profileData.nickname || profileData.name || authUser.name || "Reviewer").toString();
        const wallet = (walletData.walletAddress || walletData.address || authUser.walletAddress || "").toString();

        setProfileName(userName);
        setWalletAddress(wallet);
        setSglBalance(Number(sglData.balance || sglData.sglBalance || 0));
        setCapsuleCount(Array.isArray(capsulesData) ? capsulesData.length : 0);
        setLegacyCount(Array.isArray(legacyData) ? legacyData.length : 0);
        setHistoryCount(Array.isArray(auditData) ? auditData.length : 0);
        setCapsulePreview(
          Array.isArray(capsulesData)
            ? capsulesData.slice(0, 3).map((item) => (item.title || item.name || item.id || "Capsule item").toString())
            : [],
        );
        setLegacyPreview(
          Array.isArray(legacyData)
            ? legacyData.slice(0, 3).map((item) => (item.title || item.name || item.id || "Legacy rule").toString())
            : [],
        );
        setHistoryPreview(
          Array.isArray(auditData)
            ? auditData.slice(0, 3).map((item) => (item.serviceType || item.action || item.id || "History event").toString())
            : [],
        );

        const omega = toPercentScale(pasData.omega || pasData.omegaScore || pasData.pas || pasData.score, omegaLiveRef.current);
        if (!Number.isNaN(omega) && omega > 0) {
          omegaTargetRef.current = omega;
          animateOmega(omega, omegaLiveRef.current, 900);
        }

        const abs = toPercentScale(absorptionData.absorption || absorptionData.level || pasData.absorption || 42, 42);
        if (!Number.isNaN(abs)) {
          setAbsorption(Math.max(0, Math.min(100, abs)));
        }

        setPasScore(toFractionScale(pasData.pasScore || pasData.pas || 0.72, 0.72));
        setInteractionScore(toFractionScale(pasData.interaction || 0.69, 0.69));
        setParticlesScore(toFractionScale(pasData.particles || 0.81, 0.81));
        setAvatarStatusLabel((avatarStatus.status || "active").toString());
        setAvatarModeLabel((avatarStatus.mode || "Safe Quantum").toString());
        setAbsorptionStateLabel((absorptionData.state || avatarStatus.status || "learning").toString());
        setParticleWhitening(toFractionScale(absorptionData.particleWhitening || 0.72, 0.72));
        if (Array.isArray(auditData) && auditData.length > 0) {
          const eventTitle = (auditData[0].serviceType || auditData[0].action || auditData[0].resource || "AvatarPro event").toString();
          setLatestHistoryEvent(eventTitle);
        }

        const modeName = (avatarStatus.mode || "Safe Quantum").toString();
        setStatusMessage(`Ready · ${modeName} mode active`);

        setBackendStatus("connected");
      } catch {
        if (!active) return;

        if (isExplicitDevMockEnabled()) {
          setBackendStatus("mock-dev");
          setStatusMessage("Demo mode active");
          try {
            const u = JSON.parse(localStorage.getItem("singulai_user") || "null");
            const w = JSON.parse(localStorage.getItem("singulai_wallet") || "null");
            const plan = localStorage.getItem("singulai_active_plan_id");
            const modelChoice = localStorage.getItem("singulai_model_choice_enabled");
            if (u?.sglBalance !== undefined) setSglBalance(u.sglBalance);
            if (w?.walletAddress || w?.address) setWalletAddress(w.walletAddress || w.address || "");
            if (u?.name) setProfileName(u.name);
            if (plan) setActivePlanId(plan);
            setModelChoiceEnabled(modelChoice === "true");
          } catch {
            // explicit dev fallback only
          }
          return;
        }

        setBackendStatus("unavailable");
        setStatusMessage("Backend unavailable");
      }
    }

    void loadBackendState();

    return () => {
      active = false;
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

  // Initialize rail actions — AI functions only (settings are in the settings panel)
  useEffect(() => {
    setRailActions([
      {
        id: "absorption",
        label: "Absorption",
        hint: "Knowledge level",
        svg: <><circle cx="12" cy="12" r="3" /><path d="M12 1v6m0 10v6m11-11h-6m-10 0H1" /></>,
        onClick: async () => {
          setSubpanel("memories");
          try {
            const state = await getAbsorptionState();
            const value = toPercentScale(state.absorption || state.level || absorption, absorption);
            if (!Number.isNaN(value)) {
              setAbsorption(Math.max(0, Math.min(100, value)));
            }
            setAbsorptionStateLabel((state.state || "learning").toString());
            setParticleWhitening(toFractionScale(state.particleWhitening || particleWhitening, particleWhitening));
            setStatusMessage("Absorption state loaded");
          } catch {
            setBackendStatus(isExplicitDevMockEnabled() ? "mock-dev" : "unavailable");
            setStatusMessage("Backend unavailable");
          }
        },
      },
      {
        id: "indices",
        label: "Indexes",
        hint: "PAS and Omega metrics",
        svg: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
        onClick: async () => {
          setSubpanel("sync");
          try {
            const metrics = await getPasMetrics();
            const omega = toPercentScale(metrics.omega || metrics.omegaScore || metrics.pas || metrics.score, omegaLiveRef.current);
            if (!Number.isNaN(omega)) {
              omegaTargetRef.current = omega;
              animateOmega(omega, omegaLiveRef.current, 700);
            }
            setPasScore(toFractionScale(metrics.pasScore || metrics.pas || 0.72, 0.72));
            setInteractionScore(toFractionScale(metrics.interaction || 0.69, 0.69));
            setParticlesScore(toFractionScale(metrics.particles || 0.81, 0.81));
            setStatusMessage("Indexes updated");
          } catch {
            setBackendStatus(isExplicitDevMockEnabled() ? "mock-dev" : "unavailable");
            setStatusMessage("Backend unavailable");
          }
        },
      },
      {
        id: "capsules",
        label: "Capsules",
        hint: "Delivery collection",
        svg: <><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></>,
        onClick: async () => {
          setActiveNav("capsules");
          setSubpanel("pro");
          try {
            const items = await listCapsules();
            setCapsuleCount(Array.isArray(items) ? items.length : 0);
            setCapsulePreview(
              Array.isArray(items)
                ? items.slice(0, 3).map((item) => (item.title || item.name || item.id || "Capsule item").toString())
                : [],
            );
            setStatusMessage("Capsules list loaded");
          } catch {
            setBackendStatus(isExplicitDevMockEnabled() ? "mock-dev" : "unavailable");
            setStatusMessage("Backend unavailable");
          }
        },
      },
      {
        id: "legados",
        label: "Legacy",
        hint: "Digital legacy rules",
        svg: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></>,
        onClick: async () => {
          setActiveNav("docs");
          setSubpanel("pro");
          try {
            const items = await listLegacyRules();
            setLegacyCount(Array.isArray(items) ? items.length : 0);
            setLegacyPreview(
              Array.isArray(items)
                ? items.slice(0, 3).map((item) => (item.title || item.name || item.id || "Legacy rule").toString())
                : [],
            );
            setStatusMessage("Legacy rules loaded");
          } catch {
            setBackendStatus(isExplicitDevMockEnabled() ? "mock-dev" : "unavailable");
            setStatusMessage("Backend unavailable");
          }
        },
      },
      {
        id: "historicos",
        label: "History",
        hint: "Session events",
        svg: <><polyline points="12 8 12 12 14 14" /><path d="M3.05 11a9 9 0 1 0 .5-4.5" /><polyline points="3 3 3 9 9 9" /></>,
        onClick: async () => {
          setSubpanel("pro");
          try {
            const items = await getAuditHistory();
            setHistoryCount(Array.isArray(items) ? items.length : 0);
            setHistoryPreview(
              Array.isArray(items)
                ? items.slice(0, 3).map((item) => (item.serviceType || item.action || item.id || "History event").toString())
                : [],
            );
            if (Array.isArray(items) && items.length > 0) {
              const eventTitle = (items[0].serviceType || items[0].action || items[0].resource || "AvatarPro event").toString();
              setLatestHistoryEvent(eventTitle);
            }
            setStatusMessage("History loaded");
          } catch {
            setBackendStatus(isExplicitDevMockEnabled() ? "mock-dev" : "unavailable");
            setStatusMessage("Backend unavailable");
          }
        },
      },
      {
        id: "rascunhos",
        label: "Drafts",
        hint: "Messages in progress",
        svg: <><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></>,
        onClick: () => {
          setSubpanel("memories");
          setStatusMessage("Drafts opened");
        },
      },
      {
        id: "create",
        label: "Create Capsule",
        hint: "New digital legacy",
        svg: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
        onClick: () => {
          setModalOpen(true);
          setStatusMessage("Create Capsule opened");
        },
      },
      {
        id: "apis",
        label: "APIs and Connectors",
        hint: "External integrations",
        svg: <><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></>,
        onClick: () => {
          setSubpanel("settings");
          setStatusMessage("Settings opened");
        },
      },
      {
        id: "skills",
        label: "Skills and Features",
        hint: "Active capabilities",
        svg: <><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></>,
        onClick: () => {
          setSubpanel("sync");
          setStatusMessage("Skills panel opened");
        },
      },
      {
        id: "banco",
        label: "Knowledge Base",
        hint: "Absorbed information",
        svg: <><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></>,
        onClick: () => {
          setSubpanel("memories");
          setStatusMessage("Knowledge base loaded");
        },
      },
      {
        id: "recalibrate",
        label: "Recalibrate",
        hint: "Reorganize neural atlas",
        svg: <><polyline points="1 4 1 10 7 10" /><polyline points="23 20 23 14 17 14" /><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" /></>,
        onClick: () => {
          engineRef.current?.morphTo(profileRef.current);
          const t = Math.min(99.9, omegaLiveRef.current + 2);
          animateOmega(t, omegaLiveRef.current, 800);
          setStatusMessage("Recalibration completed");
        },
      },
    ]);
  }, [animateOmega]);

  // ── Gather gesture handlers (long-press on particle canvas) ─────────────
  const handleGatherDown = (e: React.PointerEvent) => {
    const gs = gatherStateRef.current;
    gs.startX = e.clientX;
    gs.startY = e.clientY;
    gs.currentX = e.clientX;
    gs.holdElapsed = 0;
    gs.fraction = 0;
    gs.phase = "holding";
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    // 350ms delay before starting to gather (distinguishes tap from hold)
    gs.holdTimer = setTimeout(() => {
      gs.phase = "ready";
      setGatherRing({ x: gs.startX, y: gs.startY, active: true, fraction: 0 });

      gs.holdInterval = setInterval(() => {
        gs.holdElapsed += 80;
        const f = Math.min(gs.holdElapsed / 3000, 1.0);
        gs.fraction = f;
        setGatherRing((r) => ({ ...r, fraction: f }));
        engineRef.current?.gatherAt(gs.startX, gs.startY, f);
      }, 80);
    }, 350);
  };

  const handleGatherMove = (e: React.PointerEvent) => {
    const gs = gatherStateRef.current;
    if (gs.phase === "idle") return;
    gs.currentX = e.clientX;
  };

  const _commitGather = (gs: typeof gatherStateRef.current) => {
    if (gs.holdTimer) { clearTimeout(gs.holdTimer); gs.holdTimer = null; }
    if (gs.holdInterval) { clearInterval(gs.holdInterval); gs.holdInterval = null; }
    setGatherRing((r) => ({ ...r, active: false, fraction: 0 }));

    if (gs.fraction > 0.01) {
      const dx = gs.currentX - gs.startX;
      const dir: "left" | "right" | "cancel" =
        dx > 55 ? "right" : dx < -55 ? "left" : "cancel";
      engineRef.current?.releaseGathered(dir);
      if (dir === "left" || dir === "right") {
        void submitAbsorptionFeedback({
          direction: dir,
          profile: profileRef.current,
          intensity: Math.round(gs.fraction * 100),
          source: "gather-zone",
        })
          .then((result) => {
            const nextScore = toPercentScale(result.newScore, absorption);
            setAbsorption(Math.max(0, Math.min(100, nextScore)));
            if (dir === "right") {
              setStatusMessage("Positive absorption feedback registered");
            } else {
              setStatusMessage("Corrective absorption feedback registered");
            }
          })
          .catch(() => {
            setBackendStatus(isExplicitDevMockEnabled() ? "mock-dev" : "unavailable");
            setStatusMessage("Backend unavailable");
          });
      }
    } else if (engineRef.current && engineRef.current.gatheredIdxs.length > 0) {
      engineRef.current.releaseGathered("cancel");
    }
    gs.phase = "idle";
    gs.fraction = 0;
    gs.holdElapsed = 0;
  };

  const handleGatherUp = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    _commitGather(gatherStateRef.current);
  };

  // Bubble swipe → feeds back to the particle engine with a mini gather burst
  const handleBubbleFeedback = (msgId: number, dir: "positive" | "negative") => {
    void msgId;
    const eng = engineRef.current;
    if (!eng) return;
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight * 0.38;
    eng.gatherAt(cx, cy, 0.28);
    setTimeout(() => {
      eng.releaseGathered(dir === "positive" ? "right" : "left");
    }, 380);

    void submitAbsorptionFeedback({
      direction: dir === "positive" ? "right" : "left",
      profile: profileRef.current,
      intensity: 30,
      source: "chat-bubble",
    })
      .then((result) => {
        const nextScore = toPercentScale(result.newScore, absorption);
        setAbsorption(Math.max(0, Math.min(100, nextScore)));
        setStatusMessage(
          dir === "positive"
            ? "Positive absorption feedback registered"
            : "Corrective absorption feedback registered",
        );
      })
      .catch(() => {
        setBackendStatus(isExplicitDevMockEnabled() ? "mock-dev" : "unavailable");
        setStatusMessage("Backend unavailable");
      });
  };

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

      <div id="app" className={subpanel ? "subpanel-open" : ""}>
        {/* TOPBAR — premium expandable intelligence dock */}
        <header id="topbar">
          {/* Brand — logo + Ω live readout chip */}
          <div className="tb-brand">
            <BrandLogo size={48} />
            <div className="tb-omega-live" title={`Ω ${omegaPct.toFixed(1)} — ${omegaStatus}`}>
              <span className="tb-omega-sym">Ω</span>
              <span className="tb-omega-num">{omegaPct.toFixed(1)}</span>
            </div>
          </div>

          {/* Neural mode switcher — always-visible inline selector */}
          <div className="tb-switcher">
            {(Object.keys(PROFILES) as Profile[]).map((p) => (
              <button
                key={p}
                className={`tb-mode ${profile === p ? "tb-mode--active" : ""}`}
                data-p={p}
                onClick={() => switchProfile(p)}
                title={`${PROFILES[p].modeName} — ${PROFILES[p].desc}`}
              >
                <span className="tb-mode-label">{PROFILES[p].modeName}</span>
                <span className="tb-mode-sub">{PROFILES[p].desc}</span>
              </button>
            ))}
          </div>

          {/* Right actions — unified glass chip */}
          <div className="tb-actions-chip">
            <div className="tb-status">
              <span className="pulse-dot" style={{ width: 5, height: 5 }} />
              <span className="tb-status-txt">
                {backendStatus === "connected" && "ONLINE"}
                {backendStatus === "unavailable" && "Backend unavailable"}
                {backendStatus === "mock-dev" && "DEVNET DEMO"}
              </span>
            </div>
            <div className="tb-divider-v" />
            <span className="tb-status-txt">{statusMessage}</span>
            <div className="topbar-notif-wrap">
              <button className="tb-btn topbar-notif-btn" title="Notifications" aria-label="Notifications">
                <Icon>
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </Icon>
              </button>
              <span className="topbar-notif-badge" aria-hidden="true" />
            </div>
            <Link to="/demo" className="tb-btn" title="Back to Intro" aria-label="Back to Intro">
              <Icon>
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </Icon>
            </Link>
            <button
              className="tb-btn"
              onClick={() => setSettingsOpen(true)}
              title="Settings"
              aria-label="Panel settings"
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
        </header>

        {/* Sigma flash — partículas claras formam o ícone matemático e somem com fade-out */}
        <div className="sigma-flash" key={`sf-${sigmaFlash}`} aria-hidden>
          <span className="sf-glyph">Σ</span>
          {Array.from({ length: 14 }).map((_, i) => (
            <span key={i} className="sf-dot" style={{ ["--i" as never]: i }} />
          ))}
        </div>

        <main id="main">
          {subpanel && (
            <div className="subpanel-backdrop" onClick={() => setSubpanel(null)} aria-hidden="true" />
          )}

          {/* SUBPANEL — rendered on-demand by rail (Memory / Sync / Emotion / Wallet / PRO / Settings) */}
          {subpanel && (
            <aside id="subpanel" onClick={(e) => e.stopPropagation()}>
              <header className="sp-hdr">
                <span className="sp-title">
                  {subpanel === "memories" && "Recent Memory"}
                  {subpanel === "sync" && "Neural Sync"}
                  {subpanel === "emo" && "Emotional Absorption"}
                  {subpanel === "wallet" && "Wallet"}
                  {subpanel === "pro" && "PRO Plan"}
                  {subpanel === "settings" && "Settings"}
                </span>
                <button className="sp-x" onClick={() => setSubpanel(null)} aria-label="Close">
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
                      <span className="emo-lbl">KNOWLEDGE</span>
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
                        <span className="abs-label">Absorption</span>
                        <span className="abs-pct">{absorption}%</span>
                      </div>
                    </div>
                    <div className="sp-row"><span>Memory state</span><code>{absorptionStateLabel}</code></div>
                    <div className="sp-row"><span>Particles whitening</span><code>{(particleWhitening * 100).toFixed(0)}%</code></div>
                    {[
                      { name: "Memory_Base_01", type: ".syn" },
                      { name: "Digital_Legacy", type: ".eth" },
                      { name: "Family_Values", type: ".dat" },
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
                    <div className="sp-row"><span>Address</span><code>{walletAddress ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : "—"}</code></div>
                    <div className="sp-row"><span>SGL Balance</span><code>{sglBalance.toLocaleString("en-US")}</code></div>
                    <div className="sp-row"><span>Network</span><code>{isExplicitDevMockEnabled() ? "Solana Devnet / Demo" : "Sepolia"}</code></div>
                    <div className="sp-row"><span>Profile</span><code>{profileName}</code></div>
                  </div>
                )}
                {subpanel === "pro" && (
                  <div className="sp-info">
                    <div className="sp-row"><span>Plan</span><code>PRO</code></div>
                    <div className="sp-row"><span>Capsules</span><code>{capsuleCount}</code></div>
                    <div className="sp-row"><span>Legacy</span><code>{legacyCount}</code></div>
                    <div className="sp-row"><span>History</span><code>{historyCount}</code></div>
                    <div className="sp-row"><span>AvatarPro status</span><code>{avatarStatusLabel}</code></div>
                    <div className="sp-row"><span>Avatar mode</span><code>{avatarModeLabel}</code></div>
                    <div className="sp-row"><span>Latest event</span><code>{latestHistoryEvent}</code></div>
                    <div className="sp-row"><span>Capsule preview</span><code>{capsulePreview.join(" | ") || "No capsules loaded"}</code></div>
                    <div className="sp-row"><span>Legacy preview</span><code>{legacyPreview.join(" | ") || "No legacy rules loaded"}</code></div>
                    <div className="sp-row"><span>History preview</span><code>{historyPreview.join(" | ") || "No events loaded"}</code></div>
                  </div>
                )}
                {subpanel === "settings" && (
                  <div className="sp-info">
                    <div className="sp-row"><span>Theme</span><code>Dark Tech</code></div>
                    <div className="sp-row"><span>Language</span><code>en-US</code></div>
                    <div className="sp-row"><span>Notifications</span><code>enabled</code></div>
                  </div>
                )}
                {subpanel === "sync" && (
                  <div className="sp-info">
                    <div className="sp-row"><span>PAS</span><code>{pasScore.toFixed(2)}</code></div>
                    <div className="sp-row"><span>Omega</span><code>{(omegaPct / 100).toFixed(2)}</code></div>
                    <div className="sp-row"><span>Interaction</span><code>{interactionScore.toFixed(2)}</code></div>
                    <div className="sp-row"><span>Particles</span><code>{particlesScore.toFixed(2)}</code></div>
                  </div>
                )}
              </div>
            </aside>
          )}

          {/* Gather zone — transparent overlay that captures long-press + drag feedback gesture */}
          <div
            id="gather-zone"
            onPointerDown={handleGatherDown}
            onPointerMove={handleGatherMove}
            onPointerUp={handleGatherUp}
            onPointerCancel={() => _commitGather(gatherStateRef.current)}
            aria-hidden="true"
          />

          {/* Gather ring — visual feedback during hold */}
          {gatherRing.active && (
            <div
              className="gather-ring"
              style={{
                left: gatherRing.x,
                top: gatherRing.y,
                width: `${44 + gatherRing.fraction * 64}px`,
                height: `${44 + gatherRing.fraction * 64}px`,
              }}
            />
          )}

          {/* CHAT */}
          <div id="chat-area">
            <ChatStream
              messages={messages}
              profile={profile}
              engineRef={engineRef}
              onBubbleFeedback={handleBubbleFeedback}
            />
            <div id="chat-bar">
              <button className="cb" title="Microphone" aria-label="Microphone">
                <Icon><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></Icon>
              </button>
              <input
                type="text"
                id="chat-input"
                placeholder="Talk to the avatar..."
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
              <button className="cb" id="btn-send" title="Send" aria-label="Send" onClick={sendMessage}>
                <Icon><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></Icon>
              </button>
            </div>
            <div id="chat-footer">
              <span className="footer-avatar-name" style={{ color: accentStr }}>
                {prof.avatarName}
              </span>
              <span className="footer-meta">{activePlanId.replace("plan-", "Plan ")}</span>
              <span className="footer-meta">
                {modelChoiceEnabled ? "Model unlocked" : "Model locked (pending upgrade)"}
              </span>
              <span className="singulai-footer-inpi">INPI 942284933</span>
            </div>
          </div>
        </main>
      </div>

      {/* SETTINGS PANEL — wallet / profile / panel settings / mode / layouts */}
      {settingsOpen && (
        <div className="settings-scrim" onClick={() => setSettingsOpen(false)} aria-hidden />
      )}
      {settingsOpen && (
        <aside className="settings-panel" aria-label="Panel settings">
          <header className="settings-panel-hdr">
            <span className="settings-panel-title">Settings</span>
            <button className="settings-panel-close" onClick={() => setSettingsOpen(false)} aria-label="Close">
              <Icon><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Icon>
            </button>
          </header>
          <ul className="settings-panel-list">
            {[
              {
                id: "wallet", label: "Wallet", hint: "Balance and address",
                svg: <><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></>,
                onClick: () => { setSettingsOpen(false); setSubpanel("wallet"); },
              },
              {
                id: "profile", label: "Profile", hint: "Identity and avatar",
                svg: <><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></>,
                onClick: () => { setSettingsOpen(false); setActiveNav("profile"); },
              },
              {
                id: "panel-settings", label: "Panel Settings", hint: "Notifications and theme",
                svg: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9c0 .67.39 1.27 1 1.51H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></>,
                onClick: () => { setSettingsOpen(false); setSubpanel("settings"); },
              },
              {
                id: "nav-mode", label: "Navigation Mode", hint: "Compact · Full · Focus",
                svg: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>,
                onClick: () => setSettingsOpen(false),
              },
              {
                id: "layouts", label: "Layouts", hint: "Visual organization",
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
          actions={railActions.map((a) => ({ ...a, onClick: () => { setRailOpen(false); return a.onClick(); } }))}
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
        aria-label={railOpen ? "Close AI functions" : "Open AI functions"}
        title="AI functions"
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
              <h3>Create Capsule</h3>
              <p>Send immediate or scheduled messages</p>
            </div>
            <button className="modal-x" onClick={() => setModalOpen(false)} aria-label="Close">
              <Icon><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Icon>
            </button>
          </div>
          <div className="modal-body">
            <div>
              <label className="f-label">Capsule Title</label>
              <input type="text" className="f-input" placeholder="Example: Important message" />
            </div>
            <div>
              <label className="f-label">Recipient Email</label>
              <input type="email" className="f-input" placeholder="reviewer@singulai.live" />
            </div>
            <div>
              <label className="f-label">Recipient Name</label>
              <input type="text" className="f-input" placeholder="Name (optional)" />
            </div>
            <div>
              <label className="f-label">WhatsApp (optional)</label>
              <div className="wa-field">
                <input type="tel" className="f-input" placeholder="+55 11 99999-9999" style={{ paddingRight: 42 }} />
                <div className="wa-indicator" aria-hidden>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
              </div>
              <div className="wa-note">WhatsApp notification when the capsule unlocks</div>
            </div>
            <div>
              <label className="f-label">Message</label>
              <textarea className="f-input f-textarea" placeholder="Write your message..." />
            </div>
            <div>
              <label className="f-label">Attachments</label>
              <div className="attach-grid">
                {[
                  { l: "File", svg: <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" /> },
                  { l: "Audio", svg: <><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /></> },
                  { l: "Video", svg: <><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></> },
                ].map((a) => (
                  <button className="attach-btn" key={a.l}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">{a.svg}</svg>
                    {a.l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="f-label">Delivery Type</label>
              <div className="del-toggle">
                <button className={`del-btn ${delivery === "immediate" ? "active" : ""}`} onClick={() => setDelivery("immediate")}>Immediate</button>
                <button className={`del-btn ${delivery === "scheduled" ? "active" : ""}`} onClick={() => setDelivery("scheduled")}>Scheduled</button>
              </div>
            </div>
            <div className="cost-row">
              <span className="cost-lbl">Cost</span>
              <span className="cost-val">100 SGL</span>
            </div>
          </div>
          <div className="modal-ftr">
            <button className="btn-primary">
              <Icon><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></Icon>
              Create Capsule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
