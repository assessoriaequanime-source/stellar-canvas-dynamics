import { useEffect, useState } from "react";
import * as musicPlayer from "@/lib/musicPlayer";

export default function MusicToggle() {
  const [playing, setPlaying] = useState(() => musicPlayer.isPlaying());

  // Sincroniza estado a cada 600ms (cobre casos onde o áudio para naturalmente)
  useEffect(() => {
    const id = setInterval(() => setPlaying(musicPlayer.isPlaying()), 600);
    return () => clearInterval(id);
  }, []);

  function handleToggle() {
    musicPlayer.toggle();
    // Atualiza imediatamente — o intervalo cobre o resto
    setTimeout(() => setPlaying(musicPlayer.isPlaying()), 80);
  }

  return (
    <button
      onClick={handleToggle}
      title={playing ? "Desativar música" : "Ativar música"}
      aria-label={playing ? "Desativar música" : "Ativar música"}
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        width: 40,
        height: 40,
        borderRadius: "50%",
        border: `1px solid ${playing ? "rgba(143,211,255,0.35)" : "rgba(255,255,255,0.14)"}`,
        background: playing
          ? "rgba(143,211,255,0.12)"
          : "rgba(0,0,0,0.55)",
        backdropFilter: "blur(10px)",
        color: playing ? "rgba(143,211,255,0.95)" : "rgba(255,255,255,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        fontSize: 17,
        transition: "all 0.25s",
        boxShadow: playing
          ? "0 0 14px rgba(143,211,255,0.22), inset 0 0 8px rgba(143,211,255,0.06)"
          : "0 2px 8px rgba(0,0,0,0.4)",
      }}
    >
      <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        ♫
        {!playing && (
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              width: "130%",
              height: 1.5,
              background: "rgba(255,255,255,0.35)",
              transform: "rotate(-45deg)",
              left: "-15%",
            }}
          />
        )}
      </span>
    </button>
  );
}
