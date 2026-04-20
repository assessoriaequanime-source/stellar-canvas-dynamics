import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

/* ── tiny particle system (subtle, non-intrusive) ── */
type Particle = { x: number; y: number; vx: number; vy: number; r: number; o: number };

function spawnParticles(w: number, h: number): Particle[] {
  const count = Math.min(60, Math.round((w * h) / 14000));
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.18,
    vy: (Math.random() - 0.5) * 0.14,
    r: 0.6 + Math.random() * 1.2,
    o: 0.06 + Math.random() * 0.14,
  }));
}

export default function SingulAIIntroExperience() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const frameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  /* ── particles canvas ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particlesRef.current = spawnParticles(w, h);
    };

    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(38,176,226,${p.o})`;
        ctx.fill();
      }
      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frameRef.current);
    };
  }, []);

  /* ── cleanup on unmount ── */
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  /* ── transition → /dashboard ── */
  const goToDashboard = useCallback(() => {
    setTransitioning(true);
    timerRef.current = setTimeout(() => {
      navigate({ to: "/dashboard" });
    }, 3000);
  }, [navigate]);

  /* ── handlers ── */
  const handleWithSound = useCallback(() => {
    if (transitioning) return;
    const audio = new Audio("/audio/singulai-intro.mp3");
    audio.volume = 0.5;
    audioRef.current = audio;
    audio.play().catch(() => {
      /* gesture failed or file missing — continue silently */
    });
    goToDashboard();
  }, [goToDashboard, transitioning]);

  const handleSilent = useCallback(() => {
    if (transitioning) return;
    goToDashboard();
  }, [goToDashboard, transitioning]);

  return (
    <section className={`demo-landing${transitioning ? " demo-landing--out" : ""}`}>
      {/* subtle particles */}
      <canvas ref={canvasRef} className="demo-particles" aria-hidden="true" />

      {/* glass layers */}
      <div className="demo-glass-edge" aria-hidden="true" />
      <div className="demo-glass-center" aria-hidden="true" />

      {/* content */}
      <main className="demo-content">
        {/* logo / wordmark */}
        <h2 className="demo-wordmark">SingulAI</h2>

        {/* headline */}
        <h1 className="demo-headline">Inicie o rito de memória.</h1>

        {/* subtitle */}
        <p className="demo-subtitle">Escolha som ou silêncio para abrir a experiência.</p>

        {/* CTA buttons */}
        <div className="demo-actions">
          <button type="button" className="demo-btn demo-btn--primary" onClick={handleWithSound}>
            Iniciar com som
          </button>
          <button type="button" className="demo-btn demo-btn--ghost" onClick={handleSilent}>
            Continuar em silêncio
          </button>
        </div>
      </main>

      {/* minimal footer credits */}
      <footer className="demo-footer">
        <span>singulai.site</span>
        <span className="demo-footer-sep">·</span>
        <span>rodrigo.run</span>
        <span className="demo-footer-sep">·</span>
        <span>vitor.business</span>
      </footer>
    </section>
  );
}
