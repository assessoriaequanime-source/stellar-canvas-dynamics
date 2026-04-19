import { useCallback, useEffect, useRef, useState } from "react";

const INTRO_LINES = [
  "Beyond the Veil",
  "Uma memória não morre quando encontra forma.",
  "Toda presença deixa um rastro.",
  "Toda memória procura uma forma.",
  "Toda voz carrega uma arquitetura invisível.",
];

const PAUSE_LINES = ["O véu está pronto.", "Avance para abrir a memória."];
const LAUNCH_LINES = ["Initializing demo memory...", "Loading avatar interface...", "SingulAI online."];
const POETRY_LINES = [
  "Mente sobre matéria, pensamento sobre carne",
  "Um eco digital, nunca sozinho",
  "Como um pensamento aprende a não morrer?",
  "O futuro recorda o que o tempo tenta negar",
];

type Phase = "intro" | "pause" | "launch";
type AudioStatus = "pending" | "blocked" | "playback" | "reactive" | "simulated";
type AudioGraph = {
  ctx: AudioContext;
  analyser: AnalyserNode;
  data: Uint8Array;
};
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  startX: number;
  startY: number;
  angle: number;
  clusterRadius: number;
  drift: number;
  size: number;
  hue: number;
  depth: number;
  shimmer: number;
  spin: number;
};

type WebkitAudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function lerp(from: number, to: number, amount: number) {
  return from + (to - from) * amount;
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

function createParticles(width: number, height: number, reducedMotion: boolean) {
  const count = reducedMotion ? 88 : 170;
  const centerX = width * 0.5;
  const centerY = height * 0.48;
  const spread = Math.max(width, height) * (reducedMotion ? 0.34 : 0.42);

  return Array.from({ length: count }, (_, index): Particle => {
    const spawnAngle = Math.random() * Math.PI * 2;
    const radius = spread * (0.6 + Math.random() * 0.6);

    return {
      x: centerX + Math.cos(spawnAngle) * radius + (Math.random() - 0.5) * width * 0.16,
      y: centerY + Math.sin(spawnAngle) * radius * 0.78 + (Math.random() - 0.5) * height * 0.2,
      vx: 0,
      vy: 0,
      startX: centerX + Math.cos(spawnAngle) * radius + (Math.random() - 0.5) * width * 0.16,
      startY: centerY + Math.sin(spawnAngle) * radius * 0.78 + (Math.random() - 0.5) * height * 0.2,
      angle: (index / count) * Math.PI * 2 + Math.random() * 0.35,
      clusterRadius: 18 + Math.random() * (reducedMotion ? 60 : 116),
      drift: 0.55 + Math.random() * 1.45,
      size: 0.9 + Math.random() * (reducedMotion ? 1.2 : 2.2),
      hue: 190 + Math.random() * 70,
      depth: 0.35 + Math.random() * 0.95,
      shimmer: Math.random() * Math.PI * 2,
      spin: Math.random() * 1.4 - 0.7,
    };
  });
}

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);
    sync();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", sync);
      return () => media.removeEventListener("change", sync);
    }

    media.addListener(sync);
    return () => media.removeListener(sync);
  }, []);

  return reducedMotion;
}

export default function SingulAIIntroExperience() {
  const reducedMotion = usePrefersReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | null>(null);
  const volumeFadeRef = useRef<number | null>(null);
  const timerIdsRef = useRef<number[]>([]);
  const phaseRef = useRef<Phase>("intro");
  const experienceStartRef = useRef(0);
  const phaseStartRef = useRef(0);
  const energyRef = useRef(0.18);
  const audioGraphRef = useRef<AudioGraph | null>(null);
  const audioAvailableRef = useRef(true);

  const [phase, setPhase] = useState<Phase>("intro");
  const [visibleIntroCount, setVisibleIntroCount] = useState(1);
  const [poetryIndex, setPoetryIndex] = useState(0);
  const [launchLineCount, setLaunchLineCount] = useState(0);
  const [awaitingUserStart, setAwaitingUserStart] = useState(false);
  const [audioAvailable, setAudioAvailable] = useState(true);
  const [audioStatus, setAudioStatus] = useState<AudioStatus>("pending");

  const clearTimers = useCallback(() => {
    timerIdsRef.current.forEach((id) => {
      window.clearTimeout(id);
      window.clearInterval(id);
    });
    timerIdsRef.current = [];
  }, []);

  const scheduleTimeout = useCallback((callback: () => void, delay: number) => {
    const id = window.setTimeout(callback, delay);
    timerIdsRef.current.push(id);
    return id;
  }, []);

  const scheduleInterval = useCallback((callback: () => void, delay: number) => {
    const id = window.setInterval(callback, delay);
    timerIdsRef.current.push(id);
    return id;
  }, []);

  const stopVolumeFade = useCallback(() => {
    if (volumeFadeRef.current !== null) {
      window.cancelAnimationFrame(volumeFadeRef.current);
      volumeFadeRef.current = null;
    }
  }, []);

  const fadeAudioTo = useCallback(
    (targetVolume: number, duration: number, pauseAfter = false) => {
      const audio = audioRef.current;
      if (!audio || !audioAvailableRef.current) return;

      stopVolumeFade();

      const startVolume = audio.volume;
      const startTime = performance.now();
      const tick = (now: number) => {
        const progress = duration <= 0 ? 1 : clamp((now - startTime) / duration, 0, 1);
        const eased = easeOutCubic(progress);
        audio.volume = lerp(startVolume, targetVolume, eased);

        if (progress < 1) {
          volumeFadeRef.current = window.requestAnimationFrame(tick);
          return;
        }

        volumeFadeRef.current = null;

        if (pauseAfter && targetVolume <= 0.02) {
          audio.pause();
        }
      };

      volumeFadeRef.current = window.requestAnimationFrame(tick);
    },
    [stopVolumeFade],
  );

  const primeAudioAnalysis = useCallback(async (fromGesture: boolean) => {
    const audio = audioRef.current;
    if (!audio || audioGraphRef.current || typeof window === "undefined") {
      return false;
    }

    const AudioContextClass =
      window.AudioContext || (window as WebkitAudioWindow).webkitAudioContext;

    if (!AudioContextClass) {
      return false;
    }

    const ctx = new AudioContextClass();

    try {
      if (ctx.state !== "running" && fromGesture) {
        await ctx.resume();
      }

      if (ctx.state !== "running") {
        await ctx.close();
        return false;
      }

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.84;

      const source = ctx.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(ctx.destination);

      audioGraphRef.current = {
        ctx,
        analyser,
        data: new Uint8Array(analyser.frequencyBinCount),
      };
      setAudioStatus("reactive");
      return true;
    } catch {
      await ctx.close().catch(() => undefined);
      return false;
    }
  }, []);

  const attemptAudioPlayback = useCallback(
    async (fromGesture: boolean) => {
      const audio = audioRef.current;
      if (!audio || !audioAvailableRef.current) {
        return false;
      }

      try {
        if (fromGesture && audioGraphRef.current?.ctx.state === "suspended") {
          await audioGraphRef.current.ctx.resume();
        }

        audio.volume = Math.min(audio.volume || 0.02, 0.06);
        await audio.play();
        setAwaitingUserStart(false);
        setAudioStatus("playback");

        const reactive = await primeAudioAnalysis(fromGesture);
        if (!reactive) {
          setAudioStatus("playback");
        }

        fadeAudioTo(phaseRef.current === "launch" ? (reducedMotion ? 0.48 : 0.72) : 0.38, reducedMotion ? 520 : 1200);
        return true;
      } catch (error) {
        const domError = error as DOMException | undefined;
        if (domError?.name === "NotAllowedError") {
          setAwaitingUserStart(true);
          setAudioStatus("blocked");
        }

        return false;
      }
    },
    [fadeAudioTo, primeAudioAnalysis, reducedMotion],
  );

  const enterPause = useCallback(() => {
    if (phaseRef.current !== "intro") return;

    clearTimers();
    phaseRef.current = "pause";
    phaseStartRef.current = performance.now();
    setPhase("pause");
    setLaunchLineCount(0);
    setVisibleIntroCount(INTRO_LINES.length);

    if (audioAvailableRef.current && audioRef.current && !audioRef.current.paused) {
      fadeAudioTo(0.02, reducedMotion ? 360 : 900, true);
    }
  }, [clearTimers, fadeAudioTo, reducedMotion]);

  const handleAdvance = useCallback(async () => {
    if (phaseRef.current === "launch") return;

    clearTimers();
    phaseRef.current = "launch";
    phaseStartRef.current = performance.now();
    setPhase("launch");
    setAwaitingUserStart(false);
    setLaunchLineCount(0);

    if (audioAvailableRef.current) {
      const started = await attemptAudioPlayback(true);
      if (started) {
        fadeAudioTo(reducedMotion ? 0.48 : 0.72, reducedMotion ? 500 : 1000);
      }
    }

    const lineDelays = reducedMotion ? [0, 280, 560] : [0, 640, 1240];
    lineDelays.forEach((delay, index) => {
      scheduleTimeout(() => setLaunchLineCount(index + 1), delay);
    });

    scheduleTimeout(() => {
      window.location.assign("/dashboard?intro=complete");
    }, reducedMotion ? 2200 : 3200);
  }, [attemptAudioPlayback, clearTimers, fadeAudioTo, reducedMotion, scheduleTimeout]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.preload = "auto";
    audio.volume = 0.02;

    const handleCanPlay = () => {
      audioAvailableRef.current = true;
      setAudioAvailable(true);
      if (audioStatus === "pending") {
        setAudioStatus("playback");
      }
      void attemptAudioPlayback(false);
    };

    const handleError = () => {
      audioAvailableRef.current = false;
      setAudioAvailable(false);
      setAwaitingUserStart(false);
      setAudioStatus("simulated");
    };

    const handlePause = () => {
      if (audioStatus !== "blocked" && audioAvailableRef.current) {
        setAudioStatus(audioGraphRef.current ? "reactive" : "playback");
      }
    };

    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("error", handleError);
    audio.addEventListener("pause", handlePause);

    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      handleCanPlay();
    }

    return () => {
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("pause", handlePause);
    };
  }, [attemptAudioPlayback, audioStatus]);

  useEffect(() => {
    experienceStartRef.current = performance.now();
    phaseStartRef.current = experienceStartRef.current;
    phaseRef.current = "intro";
    setPhase("intro");
    setVisibleIntroCount(1);
    setPoetryIndex(0);
    setLaunchLineCount(0);
    setAwaitingUserStart(false);

    clearTimers();

    const lineBaseDelay = reducedMotion ? 780 : 1200;
    const lineStep = reducedMotion ? 950 : 2120;
    INTRO_LINES.slice(1).forEach((_, index) => {
      scheduleTimeout(() => setVisibleIntroCount(index + 2), lineBaseDelay + index * lineStep);
    });

    scheduleInterval(() => {
      setPoetryIndex((current) => (current + 1) % POETRY_LINES.length);
    }, reducedMotion ? 3000 : 4600);

    scheduleTimeout(enterPause, reducedMotion ? 7200 : 13600);

    return () => clearTimers();
  }, [clearTimers, enterPause, reducedMotion, scheduleInterval, scheduleTimeout]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      particlesRef.current = createParticles(width, height, reducedMotion);
    };

    const drawFrame = (now: number) => {
      const currentPhase = phaseRef.current;
      const introDuration = reducedMotion ? 7200 : 13600;
      const launchDuration = reducedMotion ? 1800 : 3000;
      const elapsed = now - experienceStartRef.current;
      const phaseElapsed = now - phaseStartRef.current;
      const introProgress = clamp(elapsed / introDuration, 0, 1);
      const aggregate = currentPhase === "intro" ? easeOutCubic(introProgress) : 1;
      const burst = currentPhase === "launch" ? easeOutCubic(clamp(phaseElapsed / launchDuration, 0, 1)) : 0;
      const centerX = width * 0.5;
      const centerY = height * 0.48;

      const graph = audioGraphRef.current;
      let targetEnergy = 0.18;

      if (graph && graph.ctx.state === "running" && audioRef.current && !audioRef.current.paused) {
        graph.analyser.getByteFrequencyData(graph.data);
        let total = 0;
        for (let index = 0; index < graph.data.length; index += 1) {
          total += graph.data[index];
        }
        targetEnergy = total / graph.data.length / 255;
      } else {
        const rhythmClock = audioRef.current && !Number.isNaN(audioRef.current.currentTime)
          ? audioRef.current.currentTime
          : elapsed / 1000;

        if (currentPhase === "pause") {
          targetEnergy = 0.1 + Math.max(0, Math.sin(rhythmClock * 1.1)) * 0.04;
        } else if (currentPhase === "launch") {
          targetEnergy =
            0.42 +
            Math.max(0, Math.sin(rhythmClock * 4.1)) * 0.22 +
            Math.max(0, Math.sin(rhythmClock * 1.9 + 0.7)) * 0.18;
        } else {
          targetEnergy =
            0.18 +
            Math.max(0, Math.sin(rhythmClock * 1.45 + 0.3)) * 0.14 +
            Math.max(0, Math.sin(rhythmClock * 3.9)) * 0.18;
        }
      }

      energyRef.current = lerp(energyRef.current, clamp(targetEnergy, 0.04, 0.88), currentPhase === "pause" ? 0.08 : 0.14);
      const energy = energyRef.current;

      context.clearRect(0, 0, width, height);

      const backdrop = context.createLinearGradient(0, 0, 0, height);
      backdrop.addColorStop(0, "rgba(2, 4, 11, 1)");
      backdrop.addColorStop(0.48, "rgba(4, 8, 18, 1)");
      backdrop.addColorStop(1, "rgba(2, 3, 7, 1)");
      context.fillStyle = backdrop;
      context.fillRect(0, 0, width, height);

      const halo = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(width, height) * 0.54);
      halo.addColorStop(0, `rgba(88, 208, 255, ${0.07 + energy * 0.15 + burst * 0.12})`);
      halo.addColorStop(0.24, `rgba(58, 121, 255, ${0.05 + energy * 0.1 + burst * 0.06})`);
      halo.addColorStop(0.5, `rgba(101, 70, 255, ${0.035 + energy * 0.07})`);
      halo.addColorStop(1, "rgba(1, 3, 8, 0)");
      context.fillStyle = halo;
      context.fillRect(0, 0, width, height);

      context.save();
      context.strokeStyle = `rgba(105, 166, 255, ${0.03 + aggregate * 0.06 + burst * 0.06})`;
      context.lineWidth = 1;
      context.beginPath();
      context.arc(centerX, centerY, lerp(48, 94, aggregate) + burst * 120, 0, Math.PI * 2);
      context.stroke();
      context.restore();

      context.save();
      context.globalCompositeOperation = "lighter";

      particlesRef.current.forEach((particle, index) => {
        const phaseSpeed =
          currentPhase === "pause"
            ? 0.26
            : currentPhase === "launch"
              ? 2.8 + burst * 2.4
              : 0.9 + energy * 1.6;

        const orbitAngle = particle.angle + now * 0.00009 * phaseSpeed * particle.depth + particle.spin;
        const clusterX = centerX + Math.cos(orbitAngle) * (18 + particle.clusterRadius);
        const clusterY = centerY + Math.sin(orbitAngle * 1.2 + particle.spin) * (12 + particle.clusterRadius * 0.62);

        let targetX = lerp(particle.startX, clusterX, aggregate);
        let targetY = lerp(particle.startY, clusterY, aggregate);

        if (currentPhase === "pause") {
          targetX = centerX + Math.cos(orbitAngle) * (10 + particle.clusterRadius * 0.38);
          targetY = centerY + Math.sin(orbitAngle * 1.08) * (8 + particle.clusterRadius * 0.22);
        }

        if (currentPhase === "launch") {
          const expandRadius = 20 + particle.clusterRadius + burst * (94 + particle.depth * 230);
          targetX = centerX + Math.cos(orbitAngle * 1.04 + particle.spin * 2.4) * expandRadius;
          targetY = centerY + Math.sin(orbitAngle * 1.18 - particle.spin) * expandRadius * 0.84;
        }

        const jitter = reducedMotion ? 0.5 : currentPhase === "pause" ? 0.8 : 1.4 + energy * 6;
        targetX += Math.cos(now * 0.0011 * particle.drift + particle.shimmer) * jitter;
        targetY += Math.sin(now * 0.00125 * (particle.drift + 0.4) + particle.shimmer) * jitter * 0.92;

        const spring = currentPhase === "pause" ? 0.018 : currentPhase === "launch" ? 0.044 : 0.026 + energy * 0.012;
        const damping = currentPhase === "pause" ? 0.9 : currentPhase === "launch" ? 0.92 : 0.88;

        particle.vx = (particle.vx + (targetX - particle.x) * spring) * damping;
        particle.vy = (particle.vy + (targetY - particle.y) * spring) * damping;
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (index % (reducedMotion ? 14 : 9) === 0) {
          context.beginPath();
          context.moveTo(centerX, centerY);
          context.lineTo(particle.x, particle.y);
          context.strokeStyle = `hsla(${particle.hue}, 90%, 72%, ${0.02 + aggregate * 0.04 + energy * 0.03 + burst * 0.04})`;
          context.lineWidth = 0.8;
          context.stroke();
        }

        const alpha = 0.08 + particle.depth * 0.16 + energy * 0.18 + burst * 0.12;
        const size = particle.size * (1 + energy * 1.2 + burst * 0.6);
        context.beginPath();
        context.fillStyle = `hsla(${particle.hue}, 96%, ${72 + particle.depth * 10}%, ${alpha})`;
        context.arc(particle.x, particle.y, size, 0, Math.PI * 2);
        context.fill();
      });

      context.restore();

      const orbRadius =
        currentPhase === "launch"
          ? lerp(54, reducedMotion ? 110 : 168, burst)
          : currentPhase === "pause"
            ? 54
            : lerp(18, 64, aggregate);

      const orb = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, orbRadius * 2.8);
      orb.addColorStop(0, `rgba(210, 240, 255, ${0.16 + energy * 0.16 + burst * 0.15})`);
      orb.addColorStop(0.22, `rgba(111, 221, 255, ${0.12 + energy * 0.12 + burst * 0.1})`);
      orb.addColorStop(0.5, `rgba(69, 96, 255, ${0.06 + energy * 0.08})`);
      orb.addColorStop(1, "rgba(9, 18, 46, 0)");
      context.fillStyle = orb;
      context.beginPath();
      context.arc(centerX, centerY, orbRadius * 2.8, 0, Math.PI * 2);
      context.fill();

      animationRef.current = window.requestAnimationFrame(drawFrame);
    };

    resize();
    window.addEventListener("resize", resize);
    animationRef.current = window.requestAnimationFrame(drawFrame);

    return () => {
      window.removeEventListener("resize", resize);
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current);
      }
    };
  }, [reducedMotion]);

  useEffect(() => {
    return () => {
      clearTimers();
      stopVolumeFade();

      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current);
      }

      if (audioRef.current) {
        audioRef.current.pause();
      }

      if (audioGraphRef.current) {
        void audioGraphRef.current.ctx.close();
        audioGraphRef.current = null;
      }
    };
  }, [clearTimers, stopVolumeFade]);

  const phaseLabel =
    phase === "intro"
      ? "fase 01 · convergência"
      : phase === "pause"
        ? "fase 02 · limiar"
        : "fase 03 · handoff";

  const audioLabel =
    audioStatus === "reactive"
      ? "áudio reativo"
      : audioStatus === "playback"
        ? "áudio em curso"
        : audioStatus === "blocked"
          ? "áudio aguardando toque"
          : "sincronia visual";

  const memoryLabel =
    phase === "intro"
      ? "consciência em formação"
      : phase === "pause"
        ? "memória suspensa"
        : "ponte para o painel";

  return (
    <section id="intro-experience" data-phase={phase}>
      <canvas ref={canvasRef} className="intro-canvas" aria-hidden="true" />
      <div className="intro-grid" aria-hidden="true" />
      <div className="intro-vignette" aria-hidden="true" />

      <div className="intro-shell">
        <header className="intro-meta">
          <div>
            <p className="intro-kicker">SingulAI demo memory</p>
            <p className="intro-phase">{phaseLabel}</p>
          </div>

          <div className="intro-diagnostics" aria-hidden="true">
            <span>{audioLabel}</span>
            <span>{memoryLabel}</span>
          </div>
        </header>

        <div className={`intro-copy ${phase === "intro" ? "is-active" : "is-hidden"}`}>
          <h1 className="intro-title">{INTRO_LINES[0]}</h1>
          <div className="intro-sequence">
            {INTRO_LINES.slice(1).map((line, index) => (
              <p
                key={line}
                className={`intro-line ${visibleIntroCount > index + 1 ? "is-visible" : ""}`}
                style={{ transitionDelay: `${index * 120}ms` }}
              >
                {line}
              </p>
            ))}
          </div>
        </div>

        <div className={`intro-copy intro-pause-copy ${phase === "pause" ? "is-active" : "is-hidden"}`}>
          <p className="intro-kicker intro-kicker-accent">Portal pronto</p>
          <h2 className="intro-title intro-title-ritual">{PAUSE_LINES[0]}</h2>
          <p className="intro-line is-visible intro-line-focus">{PAUSE_LINES[1]}</p>

          <button
            type="button"
            className="intro-action"
            aria-label="Avançar para abrir a memória e entrar no painel SingulAI"
            onClick={() => {
              void handleAdvance();
            }}
          >
            Avançar
          </button>
        </div>

        <div className={`intro-copy intro-launch-copy ${phase === "launch" ? "is-active" : "is-hidden"}`}>
          <p className="intro-kicker intro-kicker-accent">Transferindo presença</p>
          <div className="intro-launch-list">
            {LAUNCH_LINES.map((line, index) => (
              <p
                key={line}
                className={`intro-launch-line ${launchLineCount > index ? "is-visible" : ""}`}
              >
                {line}
              </p>
            ))}
          </div>
        </div>

        <footer className="intro-footer">
          <p className="intro-poetry">{POETRY_LINES[poetryIndex]}</p>

          {awaitingUserStart && audioAvailable ? (
            <button
              type="button"
              className="intro-audio-cta"
              aria-label="Iniciar experiência com áudio"
              onClick={() => {
                void attemptAudioPlayback(true);
              }}
            >
              Iniciar experiência
            </button>
          ) : null}
        </footer>
      </div>

      <div className="sr-only" aria-live="polite">
        {phase === "intro"
          ? INTRO_LINES.slice(0, visibleIntroCount).join(" ")
          : phase === "pause"
            ? `${PAUSE_LINES[0]} ${PAUSE_LINES[1]}`
            : LAUNCH_LINES.slice(0, launchLineCount).join(" ")}
      </div>

      <audio ref={audioRef} src="/audio/singulai-intro.mp3" preload="auto" playsInline />
    </section>
  );
}