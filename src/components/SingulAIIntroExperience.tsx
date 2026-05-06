import { useCallback, useEffect, useRef, useState } from "react";
import { getDashboardUrl } from "@/lib/deviceRouting";

type DemoState = "idle" | "crossingSound" | "crossingSilent" | "ready";

function toRoman(n: number): string {
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"];
  let r = "";
  vals.forEach((v, i) => {
    while (n >= v) {
      r += syms[i];
      n -= v;
    }
  });
  return r;
}

export default function SingulAIIntroExperience() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const frameRef = useRef<number>(0);
  const [state, setState] = useState<DemoState>("idle");
  const [veilActive, setVeilActive] = useState(false);
  const [liveDate, setLiveDate] = useState("");
  const [liveUtc, setLiveUtc] = useState("");

  /* ── live date & clock ── */
  useEffect(() => {
    const now = new Date();
    const y = toRoman(now.getFullYear());
    const mo = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    setLiveDate(`${y} · ${mo} · ${d}`);

    const tick = () => {
      const t = new Date();
      const hh = String(t.getUTCHours()).padStart(2, "0");
      const mm = String(t.getUTCMinutes()).padStart(2, "0");
      const ss = String(t.getUTCSeconds()).padStart(2, "0");
      setLiveUtc(`${hh}:${mm}:${ss}`);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  /* ── atmospheric canvas ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    type Dot = { x: number; y: number; vx: number; vy: number; r: number; a: number; hue: number };
    let W = 0;
    let H = 0;
    let dots: Dot[] = [];
    const N = 60;

    const resize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const mkDot = (): Dot => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      r: 0.5 + Math.random() * 0.8,
      a: 0.04 + Math.random() * 0.12,
      hue: 180 + Math.random() * 120,
    });

    dots = Array.from({ length: N }, mkDot);

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      // subtle atmospheric fog corner
      const fog = ctx.createRadialGradient(W * 0.85, H * 0.15, 0, W * 0.85, H * 0.15, W * 0.4);
      fog.addColorStop(0, "rgba(0,40,60,.04)");
      fog.addColorStop(1, "transparent");
      ctx.fillStyle = fog;
      ctx.fillRect(0, 0, W, H);

      for (const d of dots) {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < -2) d.x = W + 2;
        if (d.x > W + 2) d.x = -2;
        if (d.y < -2) d.y = H + 2;
        if (d.y > H + 2) d.y = -2;

        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${d.hue},30%,78%,${d.a})`;
        ctx.fill();
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  /* ── audio cleanup ── */
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  /* ── inscription handlers ── */
  const handleInscription = useCallback(
    (withSound: boolean) => {
      if (state !== "idle") return;

      if (withSound) {
        const audio = new Audio("/audio/singulai-intro.mp3");
        audio.volume = 0.5;
        audioRef.current = audio;
        audio.play().catch(() => {
          /* browser may block or file may be missing — continue silently */
        });
      }

      setVeilActive(true);
      setState(withSound ? "crossingSound" : "crossingSilent");

      // veil in (1.8s) + dwell (2.4s) → show ready state
      setTimeout(() => {
        setVeilActive(false);
        setState("ready");
      }, 4200);
    },
    [state],
  );

  const handleEnter = useCallback(() => {
    setVeilActive(true);
    setTimeout(() => {
      window.location.href = getDashboardUrl("/vault");
    }, 900);
  }, []);

  const handleRestart = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setVeilActive(false);
    setState("idle");
  }, []);

  const isCrossing = state === "crossingSound" || state === "crossingSilent";
  const isReady = state === "ready";

  return (
    <section aria-label="SingulAI — entrada" className="rite-root">
      {/* atmospheric canvas */}
      <canvas ref={canvasRef} className="rite-bg" aria-hidden="true" />

      {/* grain overlay */}
      <div className="rite-grain" aria-hidden="true" />

      {/* MEMORIÆ watermark */}
      <div className="rite-watermark" aria-hidden="true">
        MEMORIÆ
      </div>

      {/* transition veil */}
      <div
        className={`rite-veil${veilActive ? " rite-veil--active" : ""}`}
        aria-hidden="true"
      >
        {veilActive && (
          <div className="rite-clock-wrap">
            <svg
              className={`rite-clock-svg${!isCrossing ? " rite-clock-svg--stopped" : ""}`}
              viewBox="0 0 40 40"
              width="36"
              height="36"
              fill="none"
              aria-hidden="true"
            >
              {/* clock face */}
              <circle cx="20" cy="20" r="15.5" stroke="rgba(240,234,216,0.12)" strokeWidth="0.75" />
              {/* cardinal ticks */}
              <line x1="20"   y1="5.5"  x2="20"   y2="7.5"  stroke="rgba(240,234,216,0.2)" strokeWidth="0.7" strokeLinecap="round" />
              <line x1="34.5" y1="20"  x2="32.5" y2="20"   stroke="rgba(240,234,216,0.2)" strokeWidth="0.7" strokeLinecap="round" />
              <line x1="20"   y1="34.5" x2="20"  y2="32.5" stroke="rgba(240,234,216,0.2)" strokeWidth="0.7" strokeLinecap="round" />
              <line x1="5.5"  y1="20"  x2="7.5"  y2="20"   stroke="rgba(240,234,216,0.2)" strokeWidth="0.7" strokeLinecap="round" />
              {/* hands — rotação centrada em (0,0) do grupo */}
              <g transform="translate(20,20)">
                <line x1="0" y1="0" x2="0" y2="-8"  stroke="rgba(240,234,216,0.48)"  strokeWidth="1.5" strokeLinecap="round" className="rite-clock-hr" />
                <line x1="0" y1="0" x2="0" y2="-12" stroke="rgba(240,234,216,0.65)" strokeWidth="1"   strokeLinecap="round" className="rite-clock-min" />
                <circle cx="0" cy="0" r="1.2" fill="rgba(240,234,216,0.45)" />
              </g>
            </svg>
          </div>
        )}
      </div>

      {/* editorial page */}
      <div className={`rite-page${isCrossing ? " rite-page--crossing" : ""}`}>
        {/* ── HEADER ── */}
        <header className="rite-header">
          <div className="rite-rule rite-rule--cyan" />
          <div className="rite-header-row">
            <div className="rite-header-left">
              <span className="rite-head-title">SINGULAI</span>
              <span className="rite-head-sep">·</span>
              <span className="rite-head-sub">AVATARPRO VAULT</span>
            </div>
            <div className="rite-header-right">
              <span className="rite-folio">SOLANA FRONTIER HACKATHON · 2026</span>
              <span className="rite-head-sep">·</span>
              <span className="rite-date">{liveDate}</span>
            </div>
          </div>
          <div className="rite-rule rite-rule--bone" />
        </header>

        {/* ── BODY ── */}
        <div className="rite-body">
          {/* main text */}
          <main className="rite-main">
            <p className="rite-folio-label">I · OPEN TRACK · SOLANA DEVNET</p>

            <p className="rite-phrase">
              <span className="rite-word rite-word--large">AvatarPro</span>
              <span className="rite-word rite-word--mid">Vault</span>
              <span className="rite-word rite-word--end">
                Executable Identity<span className="rite-accent">.</span>
              </span>
            </p>

            <p className="rite-nota">
              Professional expertise. Verifiable. On-chain.
              <br />Create an AvatarPro, register snapshots, program TimeCapsules and generate execution proofs on Solana Devnet.
            </p>

            <div className="rite-passage">
              <p className="rite-passage-label">
                II · AVATARPRO · TIMECAPSULE · PAS SCORE · SOLANA PROOF
              </p>

              <div className="rite-inscriptions">
                {/* Inscription I */}
                <button
                  className="rite-inscription"
                  onClick={() => handleInscription(true)}
                  disabled={state !== "idle"}
                  aria-label="Enter with audio"
                >
                  <span className="rite-ins-roman">I</span>
                  <span className="rite-ins-name">with audio</span>
                  <span className="rite-ins-sub">→ enter experience</span>
                </button>

                {/* Inscription II */}
                <button
                  className="rite-inscription"
                  onClick={() => handleInscription(false)}
                  disabled={state !== "idle"}
                  aria-label="Enter silently"
                >
                  <span className="rite-ins-roman">II</span>
                  <span className="rite-ins-name">silent mode</span>
                  <span className="rite-ins-sub">→ enter without audio</span>
                </button>

                {/* Inscription III — appears only when ready */}
                {isReady && (
                  <button
                    className="rite-inscription rite-inscription--ready"
                    onClick={handleEnter}
                    aria-label="Open vault"
                  >
                    <span className="rite-ins-roman">III</span>
                    <span className="rite-ins-name">open vault</span>
                    <span className="rite-ins-sub">→ enter demo</span>
                  </button>
                )}
              </div>

              {isReady && (
                <p className="rite-restart">
                  <button className="rite-restart-btn" onClick={handleRestart}>
                    restart
                  </button>
                </p>
              )}
            </div>
          </main>

          {/* coordinates aside */}
          <aside className="rite-coords" aria-label="Metadados editoriais">
            <div className="rite-coord-item rite-coord-hl">N°&nbsp;0001&nbsp;/&nbsp;0100</div>
            <div className="rite-coord-sep" />
            <div className="rite-coord-item">
              <span className="rite-coord-key">LAT</span>−23.5505
            </div>
            <div className="rite-coord-item">
              <span className="rite-coord-key">LON</span>−46.6333
            </div>
            <div className="rite-coord-item">
              <span className="rite-coord-key">ALT</span>+0760&nbsp;m
            </div>
            <div className="rite-coord-sep" />
            <div className="rite-coord-item">
              <span className="rite-coord-key">REF</span>SGL/Δ/0001
            </div>
            <div className="rite-coord-item">
              <span className="rite-coord-key">VER</span>2.0.0
            </div>
            <div className="rite-coord-item">
              <span className="rite-coord-key">UTC</span>
              {liveUtc}
            </div>
            <div className="rite-coord-sep" />
            <img
              src="/singulai_logo.svg"
              alt=""
              className="rite-logo-mark"
              aria-hidden="true"
            />
          </aside>
        </div>

        {/* ── FOOTER ── */}
        <footer className="rite-footer">
          <div className="rite-rule rite-rule--bone" />
          <div style={{ height: "0.5rem" }} />
          <div className="rite-footer-inner">
            <div className="rite-colophon-left">
              <span className="rite-alpha">α&nbsp;·</span>custody
            </div>
            <div className="rite-colophon-right">
              <a href="https://singulai.live" target="_blank" rel="noopener noreferrer">
                SINGULAI.LIVE
              </a>
              &nbsp;·&nbsp;
              <a href="https://rodrigo.run" target="_blank" rel="noopener noreferrer">
                RODRIGO.RUN
              </a>
              &nbsp;·&nbsp;
              <a href="https://vitor.business" target="_blank" rel="noopener noreferrer">
                VITOR.BUSINESS
              </a>
              <br />
              BUILT ON SOLANA&nbsp;·&nbsp;EDITIO MMXXVI
              <br />
              AVATARPRO&nbsp;·&nbsp;TIMECAPSULE&nbsp;·&nbsp;PROOF&nbsp;·&nbsp;I
            </div>
          </div>
        </footer>
      </div>
    </section>
  );
}
