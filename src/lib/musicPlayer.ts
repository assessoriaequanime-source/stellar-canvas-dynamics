/**
 * musicPlayer — singleton global de áudio que persiste entre navegações SPA.
 *
 * Para navegações via window.location.href (full reload), o estado é salvo em
 * localStorage e restaurado via init() no mount do root.
 */

const STORAGE_KEY = "singulai_music";
const AUDIO_SRC = "/audio/singulai-intro.mp3";

let _audio: HTMLAudioElement | null = null;

function getAudio(): HTMLAudioElement {
  if (!_audio) {
    _audio = new Audio(AUDIO_SRC);
    _audio.loop = true;
    _audio.volume = 0.45;
  }
  return _audio;
}

export function play(): void {
  if (typeof window === "undefined") return;
  const audio = getAudio();
  audio.play().catch(() => {
    /* Browser pode bloquear autoplay — silencioso */
  });
  localStorage.setItem(STORAGE_KEY, "on");
}

export function pause(): void {
  _audio?.pause();
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, "off");
  }
}

export function toggle(): void {
  if (isPlaying()) {
    pause();
  } else {
    play();
  }
}

export function isPlaying(): boolean {
  return !!_audio && !_audio.paused;
}

export function isMusicEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "on";
}

/**
 * Chame uma vez no mount do root.
 * Se o usuário tinha música ativa antes da navegação, retoma automaticamente.
 */
export function init(): void {
  if (typeof window === "undefined") return;
  if (isMusicEnabled() && !isPlaying()) {
    play();
  }
}
