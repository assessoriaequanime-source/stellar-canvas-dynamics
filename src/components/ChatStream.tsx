import { useEffect, useMemo, useRef, useState } from "react";
import type { Profile } from "@/lib/avatar-engine";
import type { AvatarEngine } from "@/lib/avatar-engine";
import { useIsMobile } from "@/hooks/use-mobile";

export type StreamMsg = {
  id: number;
  role: "user" | "ai" | "typing";
  text?: string;
};

type Props = {
  messages: StreamMsg[];
  profile: Profile;
  engineRef?: React.MutableRefObject<AvatarEngine | null>;
};

/**
 * Visible legibility ladder (Behance-grade memory aid):
 *  depth 0 → most recent      | scale 1.00 | opacity 1.00 | blur 0    (sharp)
 *  depth 1 → previous         | scale 0.94 | opacity 0.78 | blur 0.3  (legible)
 *  depth 2 → 2 turns ago      | scale 0.86 | opacity 0.55 | blur 0.9  (legible)
 *  depth 3 → 3 turns ago      | scale 0.78 | opacity 0.34 | blur 1.8  (faint context)
 *  depth 4 → about to absorb  | scale 0.66 | opacity 0.16 | blur 3.2  (vanishing)
 *  depth ≥ 5 → absorbed       | opacity 0  (fully removed from view)
 *
 * The ABSORPTION moment (particle flare + bubble vanish) is locked together:
 * once a bubble enters depth 4 we mark it for absorption, fire the particle
 * effect, and on the next render bump force opacity to 0 — no leftover ghost.
 */
const VISIBLE_DEPTH = 5; // depths 0..4 are rendered; 5+ are hidden

function trajectoryFor(profile: Profile, depth: number, fromUser: boolean, mobile = false) {
  if (depth >= VISIBLE_DEPTH) {
    return { opacity: 0, scale: 0.12, x: 0, y: -340, blur: 8, hidden: true };
  }
  const t = depth / (VISIBLE_DEPTH - 1); // 0..1 across visible range

  // Vertical lift toward the particle core
  const liftY = -t * 300;

  // Lane bias — reduced on mobile to keep bubbles in viewport
  const biasScale = mobile ? 0.3 : 1;
  const sideBias = (fromUser ? 60 : -60) * Math.pow(1 - t, 1.3) * biasScale;

  let driftX = 0;
  let extraY = 0;
  switch (profile) {
    case "pedro": {
      const angle = depth * 0.5;
      driftX = Math.sin(angle) * (mobile ? 6 : 14) * t + sideBias;
      extraY = -Math.cos(angle) * 5 * t;
      break;
    }
    case "laura": {
      const angle = depth * 0.78;
      driftX = Math.sin(angle) * (mobile ? 28 : 70) * t * (1 - t * 0.5) + sideBias;
      extraY = Math.sin(angle * 1.4) * 12 * t;
      break;
    }
    case "leticia": {
      driftX = (fromUser ? -1 : 1) * (mobile ? 8 : 22) * t + sideBias;
      extraY = -t * 10;
      break;
    }
  }

  // Behance-grade legibility curve — sharp early, ofuscated late
  const opacityLadder = [1.0, 0.78, 0.55, 0.34, 0.16];
  const scaleLadder = [1.0, 0.94, 0.86, 0.78, 0.66];
  const blurLadder = [0, 0.3, 0.9, 1.8, 3.2];

  const opacity = opacityLadder[depth] ?? 0;
  const scale = scaleLadder[depth] ?? 0.6;
  const blur = blurLadder[depth] ?? 4;

  return { opacity, scale, x: driftX, y: liftY + extraY, blur, hidden: false };
}

export default function ChatStream({ messages, profile, engineRef }: Props) {
  const isMobile = useIsMobile();
  const indexed = useMemo(() => {
    const arr = [...messages];
    return arr.map((m, i) => ({ msg: m, depth: arr.length - 1 - i }));
  }, [messages]);

  const absorbedIdsRef = useRef<Set<number>>(new Set());
  const elRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());
  const [vanished, setVanished] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!engineRef?.current) return;
    // The absorption boundary is the LAST visible depth (VISIBLE_DEPTH - 1 = 4).
    // When a message reaches it, fire the particle absorption AND mark the bubble
    // as vanished simultaneously so the visual moment is unified.
    const ABSORB_DEPTH = VISIBLE_DEPTH - 1;
    indexed.forEach(({ msg, depth }) => {
      if (msg.role === "typing") return;
      if (absorbedIdsRef.current.has(msg.id)) return;
      if (depth < ABSORB_DEPTH) return;

      absorbedIdsRef.current.add(msg.id);
      const el = elRefs.current.get(msg.id);
      const rect = el?.getBoundingClientRect();
      const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
      const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;

      // Fire particle flare and mark the bubble as vanished IN THE SAME FRAME.
      engineRef.current?.absorbAt(cx, cy);
      setVanished((prev) => {
        const next = new Set(prev);
        next.add(msg.id);
        return next;
      });
    });
  }, [indexed, engineRef]);

  return (
    <div id="chat-stream" aria-live="polite">
      {indexed.map(({ msg, depth }) => {
        const fromUser = msg.role === "user";
        const tr = trajectoryFor(profile, depth, fromUser, isMobile);
        const isVanished = vanished.has(msg.id);
        const opacity = isVanished ? 0 : tr.opacity;
        const blur = isVanished ? 6 : tr.blur;
        const scale = isVanished ? 0.4 : tr.scale;
        const y = isVanished ? tr.y - 40 : tr.y;

        const style: React.CSSProperties = {
          transform: `translate(calc(-50% + ${tr.x}px), ${y}px) scale(${scale})`,
          opacity,
          filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined,
          zIndex: 100 - depth,
          pointerEvents: depth === 0 && !isVanished ? "auto" : "none",
          visibility: isVanished || tr.hidden ? "hidden" : "visible",
        };
        return (
          <div
            key={msg.id}
            ref={(el) => {
              if (el) elRefs.current.set(msg.id, el);
              else elRefs.current.delete(msg.id);
            }}
            className={`stream-msg ${fromUser ? "from-user" : "from-ai"}`}
            data-depth={depth}
            style={style}
          >
            <div className={`bubble bubble-${fromUser ? "user" : "ai"}`}>
              {msg.role === "typing" ? (
                <div className="typing">
                  <div className="tdot" />
                  <div className="tdot" />
                  <div className="tdot" />
                </div>
              ) : (
                msg.text
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
