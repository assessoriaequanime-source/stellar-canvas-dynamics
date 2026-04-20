import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  r: number;
  o: number;
  angle: number;
};

type DemoState = "idle" | "playing" | "silent" | "ready";

function spawnParticles(w: number, h: number, count: number): Particle[] {
  const cx = w * 0.5;
  const cy = h * 0.48;
  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * Math.min(w, h) * 0.4;
    return {
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      vx: 0,
      vy: 0,
      tx: cx,
      ty: cy,
      r: 0.8 + Math.random() * 1.6,
      o: 0.08 + Math.random() * 0.18,
      angle: Math.random() * Math.PI * 2,
    };
  });
}

export default function SingulAIIntroExperience() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const frameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const stateStartRef = useRef(0);
  const [state, setState] = useState<DemoState>("idle");

  /* ── particle engine ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let cx = 0;
    let cy = 0;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      cx = w * 0.5;
      cy = h * 0.48;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = state === "idle" ? 80 : 120;
      particlesRef.current = spawnParticles(w, h, count);
    };

    resize();
    window.addEventListener("resize", resize);

    const draw = (now: number) => {
      ctx.clearRect(0, 0, w, h);

      const elapsed = (now - stateStartRef.current) / 1000;
      const energy = state === "idle" ? 0.15 : Math.min(0.65, 0.25 + elapsed * 0.12);

      for (const p of particlesRef.current) {
        if (state === "idle") {
          p.tx = cx + Math.cos(p.angle + now * 0.0003) * 80;
          p.ty = cy + Math.sin(p.angle + now * 0.0003) * 60;
        } else {
          const orbit = 20 + energy * 140;
          p.tx = cx + Math.cos(p.angle + now * 0.0006) * orbit;
          p.ty = cy + Math.sin(p.angle + now * 0.0006) * orbit;
        }

        p.vx += (p.tx - p.x) * 0.02;
        p.vy += (p.ty - p.y) * 0.02;
        p.vx *= 0.88;
        p.vy *= 0.88;
        p.x += p.vx;
        p.y += p.vy;

        const alpha = p.o * (0.4 + energy * 0.6);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(38,176,226,${alpha})`;
        ctx.fill();
      }

      // core glow
      if (state !== "idle") {
        const glowRadius = 40 + energy * 80;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
        grad.addColorStop(0, `rgba(38,176,226,${0.15 + energy * 0.15})`);
        grad.addColorStop(0.5, `rgba(255,255,255,${0.08 + energy * 0.08})`);
        grad.addColorStop(1, "rgba(38,176,226,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(cx - glowRadius, cy - glowRadius, glowRadius * 2, glowRadius * 2);
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frameRef.current);
    };
  }, [state]);

  /* ── cleanup ── */
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  /* ── auto ready after playing/silent ── */
  useEffect(() => {
    if (state === "playing" || state === "silent") {
      stateStartRef.current = performance.now();
      const timer = setTimeout(() => {
        setState("ready");
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [state]);

  /* ── handlers ── */
  const handleWithSound = useCallback(() => {
    if (state !== "idle") return;
    const audio = new Audio("/audio/singulai-intro.mp3");
    audio.volume = 0.5;
    audioRef.current = audio;
    audio.play().catch(() => {
      /* browser blocked or file missing — continue silently */
    });
    setState("playing");
  }, [state]);

  const handleSilent = useCallback(() => {
    if (state !== "idle") return;
    setState("silent");
  }, [state]);

  const handleEnter = useCallback(() => {
    navigate({ to: "/dashboard" });
  }, [navigate]);

  const handleRestart = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setState("idle");
  }, []);

  return (
    <section className={`demo-landing demo-landing--${state}`}>
      <canvas ref={canvasRef} className="demo-particles" aria-hidden="true" />

      <div className="demo-glass-edge" aria-hidden="true" />
      <div className="demo-glass-center" aria-hidden="true" />

      <main className="demo-content">
        <h2 className="demo-wordmark">SingulAI</h2>

        {state === "idle" && (
          <>
            <h1 className="demo-headline">Inicie o rito de memória.</h1>
            <p className="demo-subtitle">Escolha som ou silêncio para abrir a experiência.</p>
            <div className="demo-actions">
              <button type="button" className="demo-btn demo-btn--primary" onClick={handleWithSound}>
                Iniciar com som
              </button>
              <button type="button" className="demo-btn demo-btn--ghost" onClick={handleSilent}>
                Continuar em silêncio
              </button>
            </div>
          </>
        )}

        {(state === "playing" || state === "silent") && (
          <>
            <h1 className="demo-headline demo-headline--small">Preparando experiência...</h1>
            <p className="demo-subtitle">Absorvendo memória neural.</p>
          </>
        )}

        {state === "ready" && (
          <>
            <h1 className="demo-headline demo-headline--small">Experiência pronta.</h1>
            <p className="demo-subtitle">Núcleo cognitivo ativado.</p>
            <div className="demo-actions">
              <button type="button" className="demo-btn demo-btn--primary" onClick={handleEnter}>
                Entrar no painel
              </button>
              <button type="button" className="demo-btn demo-btn--ghost" onClick={handleRestart}>
                Reiniciar
              </button>
            </div>
          </>
        )}
      </main>

      {/* navigation */}
      {state !== "idle" && (
        <button type="button" className="demo-nav-btn demo-nav-btn--back" onClick={handleRestart}>
          ← Voltar
        </button>
      )}

      {/* credits */}
      <footer className="demo-credits">
        <a href="https://singulai.site" target="_blank" rel="noreferrer">
          singulai.site
        </a>
        <span className="demo-credits-sep">·</span>
        <a href="https://rodrigo.run" target="_blank" rel="noreferrer">
          rodrigo.run
        </a>
        <span className="demo-credits-sep">·</span>
        <a href="https://vitor.business" target="_blank" rel="noreferrer">
          vitor.business
        </a>
      </footer>
    </section>
  );
}
