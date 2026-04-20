import { ArrowRight, Play, Volume2, VolumeX, Waves } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import BrandLogo from "@/components/BrandLogo";
import { BRAND_LOGO_USAGE } from "@/lib/brand";

const INTRO_LINES = [
  "Beyond the Veil",
  "Uma memória não morre quando encontra forma.",
  "Toda presença deixa um rastro.",
  "Toda memória procura uma forma.",
  "Toda voz carrega uma arquitetura invisível.",
];

const PAUSE_LINES = ["O véu está pronto.", "Avance para abrir a memória."];
const OPENING_LINES = ["Initializing demo memory...", "Loading avatar interface...", "SingulAI online."];
const POETRY_LINES = [
  "Mente sobre matéria, pensamento sobre carne",
  "Um eco digital, nunca sozinho",
  "Como um pensamento aprende a não morrer?",
  "O futuro recorda o que o tempo tenta negar",
];

const PLAYING_LINE_MARKERS = [0.6, 3.4, 6.5, 9.8];
const OPENING_LINE_MARKERS = [0.12, 0.92, 1.78];
const POETRY_INTERVAL = 4.4;
const RITUAL_PAUSE_AT = 12.6;
const OPENING_COMPLETE_AFTER = 3.2;

type Phase = "idle" | "playing" | "ritualPause" | "opening" | "complete";
type AudioStatus = "ready" | "reactive" | "playing" | "paused" | "blocked" | "visual-only";
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
  const count = reducedMotion ? 92 : 176;
  const centerX = width * 0.5;
  const centerY = height * 0.48;
  const spread = Math.max(width, height) * (reducedMotion ? 0.32 : 0.42);

  return Array.from({ length: count }, (_, index): Particle => {
    const spawnAngle = Math.random() * Math.PI * 2;
    const radius = spread * (0.6 + Math.random() * 0.58);

    return {
      x: centerX + Math.cos(spawnAngle) * radius + (Math.random() - 0.5) * width * 0.14,
      y: centerY + Math.sin(spawnAngle) * radius * 0.76 + (Math.random() - 0.5) * height * 0.18,
      vx: 0,
      vy: 0,
      startX: centerX + Math.cos(spawnAngle) * radius + (Math.random() - 0.5) * width * 0.14,
      startY: centerY + Math.sin(spawnAngle) * radius * 0.76 + (Math.random() - 0.5) * height * 0.18,
      angle: (index / count) * Math.PI * 2 + Math.random() * 0.28,
      clusterRadius: 16 + Math.random() * (reducedMotion ? 54 : 114),
      drift: 0.55 + Math.random() * 1.42,
      size: 0.9 + Math.random() * (reducedMotion ? 1.1 : 2.1),
      hue: 194 + Math.random() * 12,
      depth: 0.34 + Math.random() * 0.94,
      shimmer: Math.random() * Math.PI * 2,
      spin: Math.random() * 1.2 - 0.6,
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
  const sequenceRef = useRef<number | null>(null);
  const volumeFadeRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>("idle");
  const phaseStartedAtRef = useRef(0);
  const idleStartedAtRef = useRef(0);
  const openingAudioStartRef = useRef(0);
  const energyRef = useRef(0.12);
  const audioGraphRef = useRef<AudioGraph | null>(null);
  const audioAvailableRef = useRef(true);
  const didNavigateRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("idle");
  const [visibleIntroCount, setVisibleIntroCount] = useState(1);
  const [poetryIndex, setPoetryIndex] = useState(0);
  const [openingLineCount, setOpeningLineCount] = useState(0);
  const [audioReady, setAudioReady] = useState(false);
  const [audioAvailable, setAudioAvailable] = useState(true);
  const [audioStatus, setAudioStatus] = useState<AudioStatus>("ready");

  const stopVolumeFade = useCallback(() => {
    if (volumeFadeRef.current !== null) {
      window.cancelAnimationFrame(volumeFadeRef.current);
      volumeFadeRef.current = null;
    }
  }, []);

  const fadeAudioTo = useCallback(
    (targetVolume: number, duration: number, pauseAfter = false) => {
      const audio = audioRef.current;
      if (!audio || !audioAvailableRef.current) {
        return;
      }

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

        if (pauseAfter && targetVolume <= 0.04) {
          audio.pause();
          setAudioStatus("paused");
        }
      };

      volumeFadeRef.current = window.requestAnimationFrame(tick);
    },
    [stopVolumeFade],
  );

  const currentAudioTime = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || Number.isNaN(audio.currentTime)) {
      return 0;
    }

    return audio.currentTime;
  }, []);

  const phaseElapsedSeconds = useCallback(
    (now: number, currentPhase: "playing" | "opening") => {
      const audio = audioRef.current;

      if (audioAvailableRef.current && audio && !audio.paused && Number.isFinite(audio.currentTime)) {
        if (currentPhase === "opening") {
          return Math.max(0, audio.currentTime - openingAudioStartRef.current);
        }

        return audio.currentTime;
      }

      return (now - phaseStartedAtRef.current) / 1000;
    },
    [],
  );

  const setPhaseState = useCallback((nextPhase: Phase) => {
    phaseRef.current = nextPhase;
    phaseStartedAtRef.current = performance.now();
    setPhase(nextPhase);
  }, []);

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

      return true;
    } catch {
      await ctx.close().catch(() => undefined);
      return false;
    }
  }, []);

  const attemptAudioPlayback = useCallback(
    async ({ fromGesture, restart = false }: { fromGesture: boolean; restart?: boolean }) => {
      const audio = audioRef.current;

      if (!audio || !audioAvailableRef.current) {
        setAudioStatus("visual-only");
        return false;
      }

      try {
        if (restart) {
          audio.currentTime = 0;
        }

        if (audioGraphRef.current?.ctx.state === "suspended" && fromGesture) {
          await audioGraphRef.current.ctx.resume();
        }

        const reactive = await primeAudioAnalysis(fromGesture);
        audio.volume = Math.min(audio.volume || 0.04, 0.08);
        audio.loop = false;
        await audio.play();

        setAudioStatus(reactive ? "reactive" : "playing");
        return true;
      } catch (error) {
        const domError = error as DOMException | undefined;
        if (domError?.name === "NotAllowedError") {
          setAudioStatus("blocked");
          return false;
        }

        audioAvailableRef.current = false;
        setAudioAvailable(false);
        setAudioStatus("visual-only");
        return false;
      }
    },
    [primeAudioAnalysis],
  );

  const enterRitualPause = useCallback(() => {
    if (phaseRef.current !== "playing") {
      return;
    }

    setPhaseState("ritualPause");
    setVisibleIntroCount(INTRO_LINES.length);
    setOpeningLineCount(0);

    if (audioAvailableRef.current && audioRef.current && !audioRef.current.paused) {
      fadeAudioTo(0.04, reducedMotion ? 260 : 760, true);
      return;
    }

    setAudioStatus(audioAvailableRef.current ? "paused" : "visual-only");
  }, [fadeAudioTo, reducedMotion, setPhaseState]);

  const handleStartExperience = useCallback(async () => {
    if (phaseRef.current !== "idle") {
      return;
    }

    didNavigateRef.current = false;
    idleStartedAtRef.current = performance.now();
    setVisibleIntroCount(1);
    setOpeningLineCount(0);
    setPhaseState("playing");

    const started = await attemptAudioPlayback({ fromGesture: true, restart: true });
    if (started) {
      fadeAudioTo(reducedMotion ? 0.44 : 0.58, reducedMotion ? 320 : 920);
    }
  }, [attemptAudioPlayback, fadeAudioTo, reducedMotion, setPhaseState]);

  const handleAdvance = useCallback(async () => {
    if (phaseRef.current !== "ritualPause") {
      return;
    }

    setPhaseState("opening");
    openingAudioStartRef.current = currentAudioTime();
    setOpeningLineCount(0);

    const started = await attemptAudioPlayback({ fromGesture: true });
    if (started) {
      fadeAudioTo(reducedMotion ? 0.52 : 0.74, reducedMotion ? 320 : 960);
    }
  }, [attemptAudioPlayback, currentAudioTime, fadeAudioTo, reducedMotion, setPhaseState]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.preload = "auto";
    audio.volume = 0.04;

    const handleCanPlay = () => {
      audioAvailableRef.current = true;
      setAudioAvailable(true);
      setAudioReady(true);
      setAudioStatus((current) => (current === "visual-only" ? current : "ready"));
    };

    const handleError = () => {
      audioAvailableRef.current = false;
      setAudioAvailable(false);
      setAudioReady(false);
      setAudioStatus("visual-only");
    };

    const handlePause = () => {
      if (audioAvailableRef.current && phaseRef.current === "ritualPause") {
        setAudioStatus("paused");
      }
    };

    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("loadeddata", handleCanPlay);
    audio.addEventListener("error", handleError);
    audio.addEventListener("pause", handlePause);

    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      handleCanPlay();
    }

    return () => {
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("loadeddata", handleCanPlay);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("pause", handlePause);
    };
  }, []);

  useEffect(() => {
    idleStartedAtRef.current = performance.now();
    phaseStartedAtRef.current = idleStartedAtRef.current;
    didNavigateRef.current = false;
  }, []);

  useEffect(() => {
    const syncSequence = (now: number) => {
      const ambientElapsed = (now - idleStartedAtRef.current) / 1000;
      const nextPoetryIndex = Math.floor(ambientElapsed / (reducedMotion ? 5.6 : POETRY_INTERVAL)) % POETRY_LINES.length;
      setPoetryIndex((current) => (current === nextPoetryIndex ? current : nextPoetryIndex));

      if (phaseRef.current === "playing") {
        const elapsed = phaseElapsedSeconds(now, "playing");
        const nextVisibleCount = 1 + PLAYING_LINE_MARKERS.filter((marker) => elapsed >= marker).length;
        setVisibleIntroCount((current) => (current === nextVisibleCount ? current : nextVisibleCount));

        if (elapsed >= (reducedMotion ? 8.6 : RITUAL_PAUSE_AT)) {
          enterRitualPause();
        }
      }

      if (phaseRef.current === "opening") {
        const elapsed = phaseElapsedSeconds(now, "opening");
        const nextLaunchCount = OPENING_LINE_MARKERS.filter((marker) => elapsed >= marker).length;
        setOpeningLineCount((current) => (current === nextLaunchCount ? current : nextLaunchCount));

        if (elapsed >= (reducedMotion ? 2.6 : OPENING_COMPLETE_AFTER) && !didNavigateRef.current) {
          didNavigateRef.current = true;
          setPhaseState("complete");
          window.location.assign("/dashboard?intro=complete");
          return;
        }
      }

      sequenceRef.current = window.requestAnimationFrame(syncSequence);
    };

    sequenceRef.current = window.requestAnimationFrame(syncSequence);

    return () => {
      if (sequenceRef.current !== null) {
        window.cancelAnimationFrame(sequenceRef.current);
      }
    };
  }, [enterRitualPause, phaseElapsedSeconds, reducedMotion, setPhaseState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

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
      const ambientElapsed = (now - idleStartedAtRef.current) / 1000;
      const playingElapsed = currentPhase === "playing" ? phaseElapsedSeconds(now, "playing") : 0;
      const openingElapsed = currentPhase === "opening" ? phaseElapsedSeconds(now, "opening") : 0;
      const playingProgress = clamp(playingElapsed / (reducedMotion ? 8.6 : RITUAL_PAUSE_AT), 0, 1);
      const openingProgress = clamp(openingElapsed / (reducedMotion ? 2.6 : OPENING_COMPLETE_AFTER), 0, 1);

      const aggregate =
        currentPhase === "idle"
          ? 0.18 + Math.sin(ambientElapsed * 0.45) * 0.04
          : currentPhase === "playing"
            ? easeOutCubic(playingProgress)
            : 1;

      const burst = currentPhase === "opening" ? easeOutCubic(openingProgress) : 0;
      const centerX = width * 0.5;
      const centerY = height * 0.48;

      const graph = audioGraphRef.current;
      let targetEnergy = currentPhase === "idle" ? 0.16 : 0.22;

      if (graph && graph.ctx.state === "running" && audioRef.current && !audioRef.current.paused) {
        graph.analyser.getByteFrequencyData(graph.data);
        let total = 0;
        for (let index = 0; index < graph.data.length; index += 1) {
          total += graph.data[index];
        }
        targetEnergy = total / graph.data.length / 255;
      } else {
        const rhythmClock =
          currentPhase === "playing"
            ? playingElapsed
            : currentPhase === "opening"
              ? openingElapsed
              : ambientElapsed;

        if (currentPhase === "ritualPause") {
          targetEnergy = 0.1 + Math.max(0, Math.sin(rhythmClock * 1.1)) * 0.04;
        } else if (currentPhase === "opening") {
          targetEnergy =
            0.44 +
            Math.max(0, Math.sin(rhythmClock * 3.8)) * 0.22 +
            Math.max(0, Math.sin(rhythmClock * 2.1 + 0.6)) * 0.16;
        } else if (currentPhase === "playing") {
          targetEnergy =
            0.18 +
            Math.max(0, Math.sin(rhythmClock * 1.36 + 0.2)) * 0.14 +
            Math.max(0, Math.sin(rhythmClock * 3.45)) * 0.14;
        } else {
          targetEnergy = 0.13 + Math.max(0, Math.sin(rhythmClock * 0.9 + 0.4)) * 0.08;
        }
      }

      energyRef.current = lerp(energyRef.current, clamp(targetEnergy, 0.04, 0.9), currentPhase === "ritualPause" ? 0.08 : 0.14);
      const energy = energyRef.current;

      context.clearRect(0, 0, width, height);

      const backdrop = context.createLinearGradient(0, 0, 0, height);
      backdrop.addColorStop(0, "rgba(6, 8, 10, 1)");
      backdrop.addColorStop(0.54, "rgba(11, 11, 11, 1)");
      backdrop.addColorStop(1, "rgba(16, 20, 24, 1)");
      context.fillStyle = backdrop;
      context.fillRect(0, 0, width, height);

      const halo = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(width, height) * 0.56);
      halo.addColorStop(0, `rgba(38, 176, 226, ${0.06 + energy * 0.18 + burst * 0.12})`);
      halo.addColorStop(0.24, `rgba(255, 255, 255, ${0.04 + energy * 0.1 + burst * 0.08})`);
      halo.addColorStop(0.48, `rgba(76, 79, 81, ${0.08 + energy * 0.06})`);
      halo.addColorStop(1, "rgba(11, 11, 11, 0)");
      context.fillStyle = halo;
      context.fillRect(0, 0, width, height);

      context.save();
      context.strokeStyle = `rgba(38, 176, 226, ${0.04 + aggregate * 0.06 + burst * 0.08})`;
      context.lineWidth = 1;
      context.beginPath();
      context.arc(centerX, centerY, lerp(48, 96, aggregate) + burst * 118, 0, Math.PI * 2);
      context.stroke();
      context.restore();

      context.save();
      context.globalCompositeOperation = "lighter";

      particlesRef.current.forEach((particle, index) => {
        const phaseSpeed =
          currentPhase === "idle"
            ? 0.38
            : currentPhase === "ritualPause"
              ? 0.28
              : currentPhase === "opening"
                ? 2.7 + burst * 2.4
                : 0.94 + energy * 1.58;

        const orbitAngle = particle.angle + now * 0.00009 * phaseSpeed * particle.depth + particle.spin;
        const clusterX = centerX + Math.cos(orbitAngle) * (18 + particle.clusterRadius);
        const clusterY = centerY + Math.sin(orbitAngle * 1.16 + particle.spin) * (12 + particle.clusterRadius * 0.6);

        let targetX = lerp(particle.startX, clusterX, aggregate);
        let targetY = lerp(particle.startY, clusterY, aggregate);

        if (currentPhase === "idle") {
          targetX = lerp(particle.startX, centerX + Math.cos(orbitAngle) * (28 + particle.clusterRadius * 0.58), 0.34);
          targetY = lerp(particle.startY, centerY + Math.sin(orbitAngle * 1.04) * (24 + particle.clusterRadius * 0.42), 0.34);
        }

        if (currentPhase === "ritualPause") {
          targetX = centerX + Math.cos(orbitAngle) * (10 + particle.clusterRadius * 0.34);
          targetY = centerY + Math.sin(orbitAngle * 1.08) * (8 + particle.clusterRadius * 0.22);
        }

        if (currentPhase === "opening") {
          const expandRadius = 20 + particle.clusterRadius + burst * (94 + particle.depth * 224);
          targetX = centerX + Math.cos(orbitAngle * 1.03 + particle.spin * 2.1) * expandRadius;
          targetY = centerY + Math.sin(orbitAngle * 1.2 - particle.spin) * expandRadius * 0.82;
        }

        const jitter = reducedMotion ? 0.45 : currentPhase === "ritualPause" ? 0.8 : 1.3 + energy * 5.8;
        targetX += Math.cos(now * 0.0011 * particle.drift + particle.shimmer) * jitter;
        targetY += Math.sin(now * 0.00124 * (particle.drift + 0.4) + particle.shimmer) * jitter * 0.9;

        const spring = currentPhase === "ritualPause" ? 0.018 : currentPhase === "opening" ? 0.044 : 0.026 + energy * 0.012;
        const damping = currentPhase === "ritualPause" ? 0.9 : currentPhase === "opening" ? 0.92 : 0.88;

        particle.vx = (particle.vx + (targetX - particle.x) * spring) * damping;
        particle.vy = (particle.vy + (targetY - particle.y) * spring) * damping;
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (index % (reducedMotion ? 14 : 9) === 0) {
          context.beginPath();
          context.moveTo(centerX, centerY);
          context.lineTo(particle.x, particle.y);
          context.strokeStyle = `hsla(${particle.hue}, 92%, 72%, ${0.02 + aggregate * 0.04 + energy * 0.03 + burst * 0.05})`;
          context.lineWidth = 0.8;
          context.stroke();
        }

        const alpha = 0.08 + particle.depth * 0.16 + energy * 0.18 + burst * 0.12;
        const size = particle.size * (1 + energy * 1.12 + burst * 0.6);
        context.beginPath();
        context.fillStyle = `hsla(${particle.hue}, 95%, ${74 + particle.depth * 10}%, ${alpha})`;
        context.arc(particle.x, particle.y, size, 0, Math.PI * 2);
        context.fill();
      });

      context.restore();

      const orbRadius =
        currentPhase === "opening"
          ? lerp(54, reducedMotion ? 110 : 164, burst)
          : currentPhase === "ritualPause"
            ? 54
            : currentPhase === "idle"
              ? 38
              : lerp(18, 64, aggregate);

      const orb = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, orbRadius * 2.8);
      orb.addColorStop(0, `rgba(255, 255, 255, ${0.12 + energy * 0.16 + burst * 0.15})`);
      orb.addColorStop(0.22, `rgba(38, 176, 226, ${0.12 + energy * 0.14 + burst * 0.12})`);
      orb.addColorStop(0.54, `rgba(76, 79, 81, ${0.08 + energy * 0.08})`);
      orb.addColorStop(1, "rgba(11, 11, 11, 0)");
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
  }, [phaseElapsedSeconds, reducedMotion]);

  useEffect(() => {
    return () => {
      stopVolumeFade();

      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current);
      }

      if (sequenceRef.current !== null) {
        window.cancelAnimationFrame(sequenceRef.current);
      }

      if (audioRef.current) {
        audioRef.current.pause();
      }

      if (audioGraphRef.current) {
        void audioGraphRef.current.ctx.close();
        audioGraphRef.current = null;
      }
    };
  }, [stopVolumeFade]);

  const phaseLabel =
    phase === "idle"
      ? "fase 00 · prontidão"
      : phase === "playing"
        ? "fase 01 · convergência"
        : phase === "ritualPause"
          ? "fase 02 · limiar"
          : phase === "opening"
            ? "fase 03 · abertura"
            : "fase 04 · completo";

  const memoryLabel =
    phase === "idle"
      ? "portal em espera"
      : phase === "playing"
        ? "consciência em formação"
        : phase === "ritualPause"
          ? "memória suspensa"
          : phase === "opening"
            ? "transferência para o painel"
            : "handoff concluído";

  const audioLabel =
    audioStatus === "reactive"
      ? "áudio reativo"
      : audioStatus === "playing"
        ? "trilha em curso"
        : audioStatus === "paused"
          ? "trilha ritualizada"
          : audioStatus === "blocked"
            ? "áudio aguardando gesto"
            : audioStatus === "visual-only"
              ? "modo visual ativo"
              : audioReady
                ? "trilha pronta"
                : "carregando trilha";

  return (
    <section id="intro-experience" data-phase={phase}>
      <canvas ref={canvasRef} className="intro-canvas" aria-hidden="true" />
      <div className="intro-grid" aria-hidden="true" />
      <div className="intro-vignette" aria-hidden="true" />

      <div className="intro-shell">
        <header className="intro-meta">
          <div className="intro-brand-block">
            <BrandLogo {...BRAND_LOGO_USAGE.demo} className="intro-brand" />
            <div className="intro-meta-copy">
              <p className="intro-kicker">SingulAI demo memory</p>
              <p className="intro-phase">{memoryLabel}</p>
            </div>
          </div>

          <div className="intro-diagnostics" aria-hidden="true">
            <span className="intro-diagnostic-pill">
              <Waves aria-hidden="true" />
              {phaseLabel}
            </span>
            <span className="intro-diagnostic-pill">
              {audioAvailable ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
              {audioLabel}
            </span>
          </div>
        </header>

        <div className={`intro-copy intro-idle-copy ${phase === "idle" ? "is-active" : "is-hidden"}`}>
          <p className="intro-kicker intro-kicker-accent">Ambiente em silêncio</p>
          <h1 className="intro-title intro-title-idle">Inicie o rito de memória.</h1>
          <p className="intro-line is-visible intro-line-focus">
            A experiência começa em silêncio ambiente e só libera a trilha após o primeiro gesto consciente.
          </p>

          <button
            type="button"
            className="intro-action intro-primary-action"
            aria-label="Iniciar experiência musical da demo SingulAI"
            onClick={() => {
              void handleStartExperience();
            }}
          >
            <Play aria-hidden="true" />
            <span>Iniciar experiência</span>
          </button>
        </div>

        <div className={`intro-copy ${phase === "playing" ? "is-active" : "is-hidden"}`}>
          <h1 className="intro-title">{INTRO_LINES[0]}</h1>
          <div className="intro-sequence">
            {INTRO_LINES.slice(1).map((line, index) => (
              <p
                key={line}
                className={`intro-line ${visibleIntroCount > index + 1 ? "is-visible" : ""}`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                {line}
              </p>
            ))}
          </div>
        </div>

        <div className={`intro-copy intro-pause-copy ${phase === "ritualPause" ? "is-active" : "is-hidden"}`}>
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
            <span>Avançar</span>
            <ArrowRight aria-hidden="true" />
          </button>
        </div>

        <div className={`intro-copy intro-launch-copy ${phase === "opening" ? "is-active" : "is-hidden"}`}>
          <p className="intro-kicker intro-kicker-accent">Transferindo presença</p>
          <div className="intro-launch-list">
            {OPENING_LINES.map((line, index) => (
              <p
                key={line}
                className={`intro-launch-line ${openingLineCount > index ? "is-visible" : ""}`}
              >
                {line}
              </p>
            ))}
          </div>
        </div>

        <footer className="intro-footer">
          <p className="intro-poetry">{POETRY_LINES[poetryIndex]}</p>
          <span className="intro-status-chip">{audioLabel}</span>
        </footer>
      </div>

      <div className="sr-only" aria-live="polite">
        {phase === "idle"
          ? "Iniciar experiência"
          : phase === "playing"
            ? INTRO_LINES.slice(0, visibleIntroCount).join(" ")
            : phase === "ritualPause"
              ? `${PAUSE_LINES[0]} ${PAUSE_LINES[1]}`
              : OPENING_LINES.slice(0, openingLineCount).join(" ")}
      </div>

      <audio ref={audioRef} src="/audio/singulai-intro.mp3" preload="auto" playsInline />
    </section>
  );
}